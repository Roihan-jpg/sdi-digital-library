import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../../environments/environment';
import type { DigitalCollection, DigitalMediaType } from '../models/digital-collection.model';

interface Response<T> {
  data: T;
}
interface ListResponse extends Response<DigitalCollection[]> {
  pagination: { page: number; limit: number; total: number };
}
export interface DigitalFilters {
  search?: string;
  mediaType?: DigitalMediaType | '';
  categoryId?: string;
  sort?: 'latest' | 'popular' | 'title';
}

@Injectable({ providedIn: 'root' })
export class DigitalLibraryApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/digital-library`;
  list(filters: DigitalFilters = {}) {
    let params = new HttpParams().set('limit', 50).set('sort', filters.sort ?? 'latest');
    if (filters.search) params = params.set('search', filters.search);
    if (filters.mediaType) params = params.set('mediaType', filters.mediaType);
    if (filters.categoryId) params = params.set('categoryId', filters.categoryId);
    return this.http.get<ListResponse>(this.baseUrl, { params });
  }
  detail(slug: string) {
    return this.http.get<Response<DigitalCollection>>(
      `${this.baseUrl}/${encodeURIComponent(slug)}`,
    );
  }
  management() {
    return this.http.get<Response<DigitalCollection[]>>(`${this.baseUrl}/management`);
  }
  create(form: FormData) {
    return this.http.post<Response<DigitalCollection>>(this.baseUrl, form);
  }
  update(id: string, form: FormData) {
    return this.http.put<Response<DigitalCollection>>(`${this.baseUrl}/${id}`, form);
  }
  remove(id: string) {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }
  access(id: string, action: 'view' | 'play' | 'download') {
    return this.http.post<Response<{ url: string; expiresIn: number; mimeType: string }>>(
      `${this.baseUrl}/${id}/access`,
      { action },
    );
  }
}
