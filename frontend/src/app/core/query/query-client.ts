import { InjectionToken } from '@angular/core';
import { QueryClient } from '@tanstack/angular-query-experimental';

export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: 5 * 60 * 1000,
        retry: 1,
        staleTime: 30 * 1000,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

export const APP_QUERY_CLIENT = new InjectionToken<QueryClient>('APP_QUERY_CLIENT', {
  factory: createAppQueryClient,
});
