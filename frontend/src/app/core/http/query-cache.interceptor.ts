import {
  HttpContextToken,
  HttpResponse,
  type HttpEvent,
  type HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { QueryClient, type QueryKey } from '@tanstack/angular-query-experimental';
import { filter, firstValueFrom, from, map, tap } from 'rxjs';
import { AuthStore } from '../auth/auth.store';

export const SKIP_QUERY_CACHE = new HttpContextToken<boolean>(() => false);

const httpQueryRootKey = ['http'] as const;

export const queryCacheInterceptor: HttpInterceptorFn = (request, next) => {
  const queryClient = inject(QueryClient);

  if (isCacheableGet(request)) {
    const authStore = inject(AuthStore);
    const queryKey: QueryKey = [
      ...httpQueryRootKey,
      request.method,
      request.urlWithParams,
      authScope(authStore),
    ];

    return from(
      queryClient.fetchQuery({
        queryKey,
        queryFn: () =>
          firstValueFrom(
            next(request).pipe(
              filter((event): event is HttpResponse<unknown> => event instanceof HttpResponse),
            ),
          ),
      }),
    ).pipe(map((response) => response.clone() as HttpEvent<unknown>));
  }

  if (request.method === 'GET') return next(request);

  return next(request).pipe(
    tap((event) => {
      if (event instanceof HttpResponse) {
        void queryClient.invalidateQueries({ queryKey: httpQueryRootKey });
      }
    }),
  );
};

function isCacheableGet(request: Parameters<HttpInterceptorFn>[0]): boolean {
  if (request.method !== 'GET') return false;
  if (request.context.get(SKIP_QUERY_CACHE)) return false;
  if (request.responseType !== 'json') return false;
  if (request.reportProgress) return false;
  if (request.url.endsWith('/auth/me')) return false;
  if (request.headers.get('Cache-Control')?.includes('no-store')) return false;
  return true;
}

function authScope(authStore: AuthStore): string {
  const context = authStore.context();
  if (!context || !authStore.isAuthenticated()) return 'anonymous';
  return `${context.user.id}:${context.profile.role}`;
}
