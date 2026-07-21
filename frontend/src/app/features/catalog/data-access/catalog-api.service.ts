import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../../environments/environment';

export interface CatalogBook {
  id: string;
  title: string;
  subtitle: string | null;
  isbn: string | null;
  publication_year: number | null;
  categories: { name: string } | null;
  publishers: { name: string } | null;
  stock: { total: number; available: number };
}
interface CatalogResponse {
  data: CatalogBook[];
  pagination: { page: number; limit: number; total: number };
}
@Injectable({ providedIn: 'root' })
export class CatalogApiService {
  private readonly http = inject(HttpClient);
  list(search: string, page = 1) {
    let params = new HttpParams().set('page', page).set('limit', 20);
    if (search) params = params.set('search', search);
    return this.http.get<CatalogResponse>(`${environment.apiBaseUrl}/catalog`, { params });
  }
}
