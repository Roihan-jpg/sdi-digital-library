import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../../environments/environment';
export interface BookTitlePayload {
  title: string;
  isbn: string | null;
  catalogCode: string | null;
  categoryId: string | null;
  publisherId: string | null;
  defaultShelfId: string | null;
  publicationYear: number | null;
  purchasePrice: number | null;
  authorIds: string[];
  isReferenceOnly: boolean;
  isActive: boolean;
  isPublished: boolean;
  language: string;
}
export interface BookCopyPayload {
  bookTitleId: string;
  inventoryCode: string;
  shelfId: string | null;
  condition: 'new' | 'good' | 'fair' | 'damaged' | 'lost';
  status: 'available' | 'reserved' | 'loaned' | 'damaged' | 'lost' | 'maintenance' | 'inactive';
  isActive: boolean;
}
interface Response<T> {
  data: T;
}
@Injectable({ providedIn: 'root' })
export class InventoryApiService {
  private readonly http = inject(HttpClient);
  createTitle(body: BookTitlePayload) {
    return this.http.post<Response<{ id: string }>>(
      `${environment.apiBaseUrl}/catalog/titles`,
      body,
    );
  }
  createCopy(body: BookCopyPayload) {
    return this.http.post<Response<{ id: string; inventory_code: string }>>(
      `${environment.apiBaseUrl}/catalog/copies`,
      body,
    );
  }
  print(copyIds: string[]) {
    return this.http.post(
      `${environment.apiBaseUrl}/catalog/labels/print`,
      { copyIds, format: 'both' },
      { responseType: 'text' },
    );
  }
}
