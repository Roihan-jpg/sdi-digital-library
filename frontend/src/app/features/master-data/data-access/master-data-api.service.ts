import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../../environments/environment';
export type MasterKind =
  | 'school-years'
  | 'classes'
  | 'study-groups'
  | 'categories'
  | 'authors'
  | 'publishers'
  | 'shelves'
  | 'replacement-cost-categories';
interface Response<T> {
  data: T;
}
export interface MasterRow {
  id: string;
  name: string;
  code?: string;
  grade_level?: number;
  class_id?: string;
  is_active?: boolean;
}
@Injectable({ providedIn: 'root' })
export class MasterDataApiService {
  private readonly http = inject(HttpClient);
  list(kind: MasterKind) {
    return this.http.get<Response<MasterRow[]>>(`${environment.apiBaseUrl}/master-data/${kind}`, {
      params: new HttpParams().set('limit', 100),
    });
  }
  create(kind: MasterKind, body: Record<string, unknown>) {
    return this.http.post<Response<MasterRow>>(
      `${environment.apiBaseUrl}/master-data/${kind}`,
      body,
    );
  }
  update(kind: MasterKind, id: string, body: Record<string, unknown>) {
    return this.http.patch<Response<MasterRow>>(
      `${environment.apiBaseUrl}/master-data/${kind}/${id}`,
      body,
    );
  }
  remove(kind: MasterKind, id: string) {
    return this.http.delete(`${environment.apiBaseUrl}/master-data/${kind}` + '/' + id);
  }
}
