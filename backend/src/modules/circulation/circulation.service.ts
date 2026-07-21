import type { SupabaseClient } from '@supabase/supabase-js';
import { AppError } from '../../common/errors/app-error.js';
import { pageRange } from '../../common/http/pagination.js';
import type { AppConfig } from '../../config/env.js';
import { createAdminSupabaseClient } from '../../infrastructure/supabase/supabase-admin.client.js';
import { createUserSupabaseClient } from '../../infrastructure/supabase/supabase-user.client.js';
import type { AuthContext } from '../auth/auth.types.js';
import type { CheckoutInput, FinePaymentInput, GroupVisitInput, ListInput, ReturnInput } from './circulation.schema.js';

type ClientFactory = (context: AuthContext) => SupabaseClient;

export class CirculationService {
  private readonly admin: SupabaseClient;
  private readonly clientFactory: ClientFactory;

  constructor(config: AppConfig, clientFactory?: ClientFactory, adminClient?: SupabaseClient) {
    this.clientFactory = clientFactory ?? ((context) => createUserSupabaseClient(config, context.accessToken));
    this.admin = adminClient ?? createAdminSupabaseClient(config);
  }

  async lookupMember(context: AuthContext, code: string) {
    return this.rpc(context, 'lookup_member_by_card', { p_card_number: code }, 'MEMBER_LOOKUP_FAILED');
  }

  async lookupCopy(context: AuthContext, code: string) {
    return this.rpc(context, 'lookup_book_copy_by_code', { p_inventory_code: code }, 'COPY_LOOKUP_FAILED');
  }

  async checkout(context: AuthContext, input: CheckoutInput) {
    const loanId = await this.rpc<string>(context, 'create_loan_by_codes', {
      p_card_number: input.cardNumber,
      p_inventory_codes: input.inventoryCodes,
      p_notes: input.notes ?? null,
      p_reservation_id: input.reservationId ?? null,
    }, 'CHECKOUT_REJECTED');
    return this.loanReceipt(context, loanId);
  }

  async returnBook(context: AuthContext, input: ReturnInput) {
    return this.rpc(context, 'return_book_by_inventory_code', {
      p_inventory_code: input.inventoryCode,
      p_condition: input.condition,
      p_notes: input.notes ?? null,
    }, 'RETURN_REJECTED');
  }

  async renew(context: AuthContext, loanItemId: string, reason?: string) {
    const dueAt = await this.rpc<string>(context, 'renew_loan_item', {
      p_loan_item_id: loanItemId,
      p_reason: reason ?? null,
    }, 'RENEWAL_REJECTED');
    return { loanItemId, dueAt };
  }

  async loanReceipt(context: AuthContext, loanId: string) {
    return this.rpc(context, 'get_loan_receipt', { p_loan_id: loanId }, 'LOAN_RECEIPT_FAILED');
  }

  async listLoans(context: AuthContext, filters: ListInput) {
    const { from, to } = pageRange(filters.page, filters.limit);
    let query = this.clientFactory(context)
      .from('loans')
      .select('id,loan_number,status,borrowed_at,member_id,members(member_code,full_name),loan_items(id,due_at,returned_at,renewal_count,status,book_copies(inventory_code,book_titles(title)))', { count: 'exact' });
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.memberId) query = query.eq('member_id', filters.memberId);
    const { data, error, count } = await query.order('borrowed_at', { ascending: false }).range(from, to);
    if (error) throw operationError(error, 'LOAN_LIST_FAILED');
    return { items: data ?? [], total: count ?? 0 };
  }

  async createReservation(context: AuthContext, bookTitleId: string, notes?: string) {
    const id = await this.rpc<string>(context, 'create_reservation', {
      p_book_title_id: bookTitleId,
      p_notes: notes ?? null,
    }, 'RESERVATION_REJECTED');
    return { id };
  }

  async listReservations(context: AuthContext, filters: ListInput) {
    const { from, to } = pageRange(filters.page, filters.limit);
    let query = this.clientFactory(context)
      .from('reservations')
      .select('id,reservation_number,status,requested_at,expires_at,rejection_reason,member_id,book_title_id,assigned_copy_id,members(member_code,card_number,full_name),book_titles(title),book_copies(inventory_code)', { count: 'exact' });
    if (filters.status) query = query.eq('status', filters.status);
    const { data, error, count } = await query.order('requested_at', { ascending: false }).range(from, to);
    if (error) throw operationError(error, 'RESERVATION_LIST_FAILED');
    return { items: data ?? [], total: count ?? 0 };
  }

  async approveReservation(context: AuthContext, id: string, inventoryCode?: string) {
    return this.rpc(context, 'approve_reservation', {
      p_reservation_id: id,
      p_inventory_code: inventoryCode ?? null,
    }, 'RESERVATION_APPROVAL_REJECTED');
  }

  async rejectReservation(context: AuthContext, id: string, reason: string): Promise<void> {
    await this.rpc(context, 'reject_reservation', { p_reservation_id: id, p_reason: reason }, 'RESERVATION_REJECTION_FAILED');
  }

  async cancelReservation(context: AuthContext, id: string): Promise<void> {
    await this.rpc(context, 'cancel_reservation', { p_reservation_id: id }, 'RESERVATION_CANCELLATION_FAILED');
  }

  async convertReservation(context: AuthContext, id: string, inventoryCode?: string) {
    const client = this.clientFactory(context);
    const { data, error } = await client
      .from('reservations')
      .select('id,status,member_id,assigned_copy_id,members(card_number),book_copies(inventory_code)')
      .eq('id', id)
      .single();
    if (error || !data) throw operationError(error, 'RESERVATION_NOT_FOUND');
    const member = related(data.members);
    const assignedCopy = related(data.book_copies);
    const code = inventoryCode ?? stringField(assignedCopy, 'inventory_code');
    const cardNumber = stringField(member, 'card_number');
    if (!code || !cardNumber) {
      throw new AppError(422, 'RESERVATION_COPY_REQUIRED', 'Pilih kode inventaris untuk mengonversi reservasi ini.');
    }
    return this.checkout(context, { cardNumber, inventoryCodes: [code], reservationId: id });
  }

  async listFines(context: AuthContext, filters: ListInput) {
    const { from, to } = pageRange(filters.page, filters.limit);
    let query = this.clientFactory(context)
      .from('fines')
      .select('id,member_id,fine_type,days_late,amount,paid_amount,status,assessed_at,description,members(member_code,full_name),loan_items(book_copies(inventory_code,book_titles(title)))', { count: 'exact' });
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.memberId) query = query.eq('member_id', filters.memberId);
    const { data, error, count } = await query.order('assessed_at', { ascending: false }).range(from, to);
    if (error) throw operationError(error, 'FINE_LIST_FAILED');
    return { items: data ?? [], total: count ?? 0 };
  }

  async payFine(context: AuthContext, fineId: string, input: FinePaymentInput) {
    const paymentId = await this.rpc<string>(context, 'record_fine_payment', {
      p_fine_id: fineId,
      p_amount: input.amount,
      p_method: input.method,
      p_reference_number: input.referenceNumber ?? null,
      p_notes: input.notes ?? null,
    }, 'FINE_PAYMENT_REJECTED');
    return this.paymentReceipt(context, paymentId);
  }

  async paymentReceipt(context: AuthContext, paymentId: string) {
    return this.rpc(context, 'get_fine_payment_receipt', { p_payment_id: paymentId }, 'PAYMENT_RECEIPT_FAILED');
  }

  async recordMemberVisit(context: AuthContext, cardNumber: string, notes?: string) {
    const id = await this.rpc<string>(context, 'record_member_visit', {
      p_card_number: cardNumber,
      p_notes: notes ?? null,
    }, 'VISIT_REJECTED');
    return { id, member: await this.lookupMember(context, cardNumber) };
  }

  async recordGroupVisit(context: AuthContext, input: GroupVisitInput) {
    const id = await this.rpc<string>(context, 'record_group_visit', {
      p_class_id: input.classId,
      p_study_group_id: input.studyGroupId ?? null,
      p_teacher_name: input.teacherName,
      p_participant_count: input.participantCount,
      p_notes: input.notes ?? null,
    }, 'GROUP_VISIT_REJECTED');
    return { id };
  }

  async listVisits(context: AuthContext, filters: ListInput) {
    const { from, to } = pageRange(filters.page, filters.limit);
    const client = this.clientFactory(context);
    const [individual, group] = await Promise.all([
      client.from('visits').select('id,entered_at,method,card_number_snapshot,notes,members(member_code,full_name)', { count: 'exact' }).order('entered_at', { ascending: false }).range(from, to),
      client.from('group_visits').select('id,visited_at,teacher_name,participant_count,notes,classes(name),study_groups(name)', { count: 'exact' }).order('visited_at', { ascending: false }).range(from, to),
    ]);
    if (individual.error || group.error) throw operationError(individual.error ?? group.error, 'VISIT_LIST_FAILED');
    return { individual: individual.data ?? [], groups: group.data ?? [], total: (individual.count ?? 0) + (group.count ?? 0) };
  }

  async maintenance(context: AuthContext) {
    return this.rpc(context, 'run_library_maintenance', {}, 'MAINTENANCE_FAILED');
  }

  async scheduledMaintenance() {
    const { data, error } = await this.admin.rpc('run_library_maintenance');
    if (error) throw operationError(error, 'MAINTENANCE_FAILED');
    return data;
  }

  private async rpc<T = unknown>(context: AuthContext, name: string, args: Record<string, unknown>, code: string): Promise<T> {
    const { data, error } = await this.clientFactory(context).rpc(name, args);
    if (error) throw operationError(error, code);
    return data as T;
  }
}

interface SupabaseErrorLike { code?: string; message?: string }
export function operationError(error: SupabaseErrorLike | null, code: string): AppError {
  const message = error?.message ?? '';
  const lower = message.toLowerCase();
  const notFound = lower.includes('tidak ditemukan') || lower.includes('not found');
  const conflict = error?.code === '23505' || lower.includes('sudah dipinjam') || lower.includes('already been returned');
  const status = notFound ? 404 : conflict ? 409 : error?.code === '42501' ? 403 : 422;
  const safeMessages: Record<string, string> = {
    CHECKOUT_REJECTED: 'Peminjaman ditolak. Periksa status member, batas pinjaman, dan ketersediaan buku.',
    RETURN_REJECTED: 'Pengembalian ditolak. Pastikan kode inventaris memiliki pinjaman aktif.',
    RENEWAL_REJECTED: 'Perpanjangan ditolak. Batas perpanjangan mungkin tercapai atau buku sedang direservasi.',
    FINE_PAYMENT_REJECTED: 'Pembayaran ditolak. Jumlah tidak boleh melebihi sisa tagihan.',
  };
  return new AppError(status, code, safeMessages[code] ?? (notFound ? 'Data operasional tidak ditemukan.' : 'Operasi perpustakaan tidak dapat diproses.'));
}

function related(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) return (value[0] as Record<string, unknown> | undefined) ?? null;
  return value && typeof value === 'object' ? value as Record<string, unknown> : null;
}
function stringField(value: Record<string, unknown> | null, field: string): string | null {
  const result = value?.[field];
  return typeof result === 'string' && result ? result : null;
}
