import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../../environments/environment';
export interface Member {
  id: string;
  member_code: string;
  card_number: string;
  student_card_number: string | null;
  is_student: boolean;
  nis: string | null;
  nisn: string | null;
  full_name: string;
  gender: 'male' | 'female' | 'unknown';
  class_id: string | null;
  study_group_id: string | null;
  is_active: boolean;
}
export interface MemberPayload {
  memberCode: string;
  libraryCardNumber: string;
  studentCardNumber: string | null;
  isStudent: boolean;
  nis: string | null;
  nisn: string | null;
  fullName: string;
  gender: 'male' | 'female' | 'unknown';
  classId: string | null;
  studyGroupId: string | null;
  isActive: boolean;
}
interface Response<T> {
  data: T;
}
interface ListResponse extends Response<Member[]> {
  pagination: { total: number };
}
@Injectable({ providedIn: 'root' })
export class MemberApiService {
  private readonly http = inject(HttpClient);
  list(search = '') {
    return this.http.get<ListResponse>(`${environment.apiBaseUrl}/members`, {
      params: new HttpParams().set('search', search),
    });
  }
  create(payload: MemberPayload) {
    return this.http.post<Response<Member>>(`${environment.apiBaseUrl}/members`, payload);
  }
  update(id: string, payload: MemberPayload) {
    return this.http.put<Response<Member>>(`${environment.apiBaseUrl}/members/${id}`, payload);
  }
}
