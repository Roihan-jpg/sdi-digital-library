import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../../environments/environment';
export type ImportKind = 'members' | 'books';
export interface ImportJob {
  id: string;
  import_type: ImportKind;
  file_name: string;
  status: string;
  total_rows: number;
  success_rows: number;
  failed_rows: number;
  created_at: string;
}
interface Response<T> {
  data: T;
}
@Injectable({ providedIn: 'root' })
export class ImportApiService {
  private readonly http = inject(HttpClient);
  list() {
    return this.http.get<Response<ImportJob[]>>(`${environment.apiBaseUrl}/imports`);
  }
  upload(kind: ImportKind, file: File) {
    const body = new FormData();
    body.append('file', file);
    return this.http.post<Response<ImportJob>>(`${environment.apiBaseUrl}/imports/${kind}`, body);
  }
  template(kind: ImportKind) {
    return this.http.get(`${environment.apiBaseUrl}/imports/templates/${kind}`, {
      responseType: 'blob',
    });
  }
  errors(id: string) {
    return this.http.get(`${environment.apiBaseUrl}/imports/${id}/errors.csv`, {
      responseType: 'blob',
    });
  }
}
