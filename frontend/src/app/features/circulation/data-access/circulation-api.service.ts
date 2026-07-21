import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../../environments/environment';

export interface MemberLookup {
  id: string;
  member_code: string;
  card_number: string;
  full_name: string;
  is_active: boolean;
  class_name: string | null;
  study_group_name: string | null;
  active_loan_count: number;
  outstanding_fine: number;
}
export interface CopyLookup {
  id: string;
  inventory_code: string;
  title_id: string;
  title: string;
  status: string;
  condition: string;
  is_active: boolean;
  is_reference_only: boolean;
  active_loan_item_id: string | null;
  due_at: string | null;
}
export interface LoanReceipt {
  loan_id: string;
  loan_number: string;
  borrowed_at: string;
  status: string;
  member: { id: string; member_code: string; card_number: string; full_name: string };
  items: Array<{
    loan_item_id: string;
    inventory_code: string;
    title: string;
    due_at: string;
    status: string;
  }>;
}
export interface ReturnResult {
  loan_item_id: string;
  days_late: number;
  overdue_fine: number;
  replacement_fine: number;
  copy_status: string;
  condition: string;
}
export interface Reservation {
  id: string;
  reservation_number: string;
  status: string;
  requested_at: string;
  expires_at: string;
  rejection_reason: string | null;
  member_id: string;
  book_title_id: string;
  members: { member_code: string; card_number: string; full_name: string } | null;
  book_titles: { title: string } | null;
  book_copies: { inventory_code: string } | null;
}
export interface Loan {
  id: string;
  loan_number: string;
  status: string;
  borrowed_at: string;
  members: { member_code: string; full_name: string } | null;
  loan_items: Array<{
    id: string;
    due_at: string;
    returned_at: string | null;
    renewal_count: number;
    status: string;
    book_copies: { inventory_code: string; book_titles: { title: string } | null } | null;
  }>;
}
export interface Fine {
  id: string;
  fine_type: string;
  amount: number;
  paid_amount: number;
  status: string;
  assessed_at: string;
  description: string | null;
  members: { member_code: string; full_name: string } | null;
}
export interface PaymentReceipt {
  payment_id: string;
  paid_at: string;
  amount_paid: number;
  remaining_amount: number;
  status: string;
  member: { member_code: string; full_name: string };
}
interface DataResponse<T> {
  data: T;
}
interface ListResponse<T> extends DataResponse<T[]> {
  pagination: { page: number; limit: number; total: number };
}

@Injectable({ providedIn: 'root' })
export class CirculationApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/circulation`;

  lookupMember(code: string) {
    return this.http.post<DataResponse<MemberLookup>>(`${this.base}/lookup/member`, { code });
  }
  lookupCopy(code: string) {
    return this.http.post<DataResponse<CopyLookup>>(`${this.base}/lookup/copy`, { code });
  }
  checkout(body: {
    cardNumber: string;
    inventoryCodes: string[];
    notes?: string;
    reservationId?: string;
  }) {
    return this.http.post<DataResponse<LoanReceipt>>(`${this.base}/checkout`, body);
  }
  returnBook(body: {
    inventoryCode: string;
    condition: 'good' | 'damaged' | 'lost';
    notes?: string;
  }) {
    return this.http.post<DataResponse<ReturnResult>>(`${this.base}/return`, body);
  }
  renew(loanItemId: string) {
    return this.http.post<DataResponse<{ loanItemId: string; dueAt: string }>>(
      `${this.base}/renew`,
      { loanItemId },
    );
  }
  loans(status?: string) {
    return this.http.get<ListResponse<Loan>>(`${this.base}/loans`, {
      params: status ? new HttpParams().set('status', status) : undefined,
    });
  }
  fines(status?: string) {
    return this.http.get<ListResponse<Fine>>(`${this.base}/fines`, {
      params: status ? new HttpParams().set('status', status) : undefined,
    });
  }
  payFine(id: string, amount: number, method: string) {
    return this.http.post<DataResponse<PaymentReceipt>>(`${this.base}/fines/${id}/payments`, {
      amount,
      method,
    });
  }
  reservations(status?: string) {
    return this.http.get<ListResponse<Reservation>>(`${environment.apiBaseUrl}/reservations`, {
      params: status ? new HttpParams().set('status', status) : undefined,
    });
  }
  createReservation(bookTitleId: string) {
    return this.http.post<DataResponse<{ id: string }>>(`${environment.apiBaseUrl}/reservations`, {
      bookTitleId,
    });
  }
  approveReservation(id: string, inventoryCode?: string) {
    return this.http.post<DataResponse<unknown>>(
      `${environment.apiBaseUrl}/reservations/${id}/approve`,
      inventoryCode ? { inventoryCode } : {},
    );
  }
  convertReservation(id: string, inventoryCode?: string) {
    return this.http.post<DataResponse<LoanReceipt>>(
      `${environment.apiBaseUrl}/reservations/${id}/convert-to-loan`,
      inventoryCode ? { inventoryCode } : {},
    );
  }
  rejectReservation(id: string, reason: string) {
    return this.http.post<void>(`${environment.apiBaseUrl}/reservations/${id}/reject`, { reason });
  }
  cancelReservation(id: string) {
    return this.http.post<void>(`${environment.apiBaseUrl}/reservations/${id}/cancel`, {});
  }
  recordVisit(code: string) {
    return this.http.post<DataResponse<{ id: string; member: MemberLookup }>>(
      `${environment.apiBaseUrl}/visits/scan`,
      { code },
    );
  }
  recordGroupVisit(body: {
    classId: string;
    studyGroupId?: string;
    teacherName: string;
    participantCount: number;
    notes?: string;
  }) {
    return this.http.post<DataResponse<{ id: string }>>(
      `${environment.apiBaseUrl}/visits/group`,
      body,
    );
  }
  maintenance() {
    return this.http.post<
      DataResponse<{ overdue_items_marked: number; reservations_expired: number }>
    >(`${this.base}/maintenance`, {});
  }
}
