import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../../environments/environment';
import type {
  DashboardData,
  ReportKind,
  ReportResult,
  SchoolIdentity,
} from '../models/report.model';

interface Response<T> {
  data: T;
}
export interface ReportFilters {
  from: string;
  to: string;
  search?: string;
  classId?: string;
  studyGroupId?: string;
  categoryId?: string;
  status?: string;
}

@Injectable({ providedIn: 'root' })
export class ReportApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/reports`;
  dashboard(from: string, to: string) {
    return this.http.get<Response<DashboardData>>(`${this.base}/dashboard`, {
      params: { from, to },
    });
  }
  report(kind: ReportKind, filters: ReportFilters) {
    return this.http.get<Response<ReportResult>>(`${this.base}/${kind}`, {
      params: params(filters),
    });
  }
  export(kind: ReportKind, filters: ReportFilters, format: 'pdf' | 'xlsx') {
    return this.http.get(`${this.base}/${kind}/export`, {
      params: params({ ...filters, format }),
      responseType: 'blob',
      observe: 'response',
    });
  }
  schoolIdentity() {
    return this.http.get<Response<SchoolIdentity>>(`${this.base}/settings/school`);
  }
  updateSchoolIdentity(input: SchoolIdentity) {
    return this.http.patch<Response<SchoolIdentity>>(`${this.base}/settings/school`, input);
  }
}
function params(values: object) {
  let result = new HttpParams();
  for (const [key, value] of Object.entries(values))
    if (typeof value === 'string' && value) result = result.set(key, value);
  return result;
}
