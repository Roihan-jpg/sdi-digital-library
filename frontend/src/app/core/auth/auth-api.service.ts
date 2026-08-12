import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { CurrentAuthContext } from './auth.models';

interface ApiResponse<T> {
  data: T;
}

interface LocalLoginPayload {
  accessToken: string;
  expiresAt: string;
  context: CurrentAuthContext;
}

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  getCurrentContext(accessToken: string): Observable<ApiResponse<CurrentAuthContext>> {
    return this.http.get<ApiResponse<CurrentAuthContext>>(`${this.baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  loginLocal(identifier: string, password: string): Observable<ApiResponse<LocalLoginPayload>> {
    return this.http.post<ApiResponse<LocalLoginPayload>>(`${this.baseUrl}/auth/local-login`, {
      identifier,
      password,
    });
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/auth/logout`, null);
  }

  changePassword(password: string): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/auth/password`, { password });
  }
}
