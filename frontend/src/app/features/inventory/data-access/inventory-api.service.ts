import { HttpClient, HttpParams } from '@angular/common/http';
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
export interface InventoryTitleOption {
  id: string;
  catalog_code: string | null;
  isbn: string | null;
  title: string;
  subtitle: string | null;
  publication_year: number | null;
  categories: { name: string } | null;
  publishers: { name: string } | null;
  stock: { total: number; available: number };
}
interface TitleListResponse extends Response<InventoryTitleOption[]> {
  pagination: { page: number; limit: number; total: number };
}
@Injectable({ providedIn: 'root' })
export class InventoryApiService {
  private readonly http = inject(HttpClient);
  listTitles(search = '') {
    let params = new HttpParams().set('page', 1).set('limit', 100);
    if (search) params = params.set('search', search);
    return this.http.get<TitleListResponse>(`${environment.apiBaseUrl}/catalog`, { params });
  }
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
