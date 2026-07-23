import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import type { Session } from '@supabase/supabase-js';
import { AuthStore } from '../auth/auth.store';
import { queryCacheInterceptor } from './query-cache.interceptor';

describe('queryCacheInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authStore: AuthStore;
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
    });

    TestBed.configureTestingModule({
      providers: [
        provideTanStackQuery(queryClient),
        provideHttpClient(withInterceptors([queryCacheInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authStore = TestBed.inject(AuthStore);
  });

  afterEach(() => {
    httpMock.verify();
    queryClient.clear();
  });

  it('serves repeated JSON GET requests from the TanStack Query cache', async () => {
    const firstValues: unknown[] = [];
    const secondValues: unknown[] = [];
    const response = { data: [{ id: 'book-1', title: 'Matematika' }] };

    http.get('/api/catalog?page=1').subscribe((value) => firstValues.push(value));
    httpMock.expectOne('/api/catalog?page=1').flush(response);
    await flushQueryMicrotasks();

    http.get('/api/catalog?page=1').subscribe((value) => secondValues.push(value));
    httpMock.expectNone('/api/catalog?page=1');
    await flushQueryMicrotasks();

    expect(firstValues).toEqual([response]);
    expect(secondValues).toEqual([response]);
  });

  it('does not cache blob downloads', async () => {
    const values: Blob[] = [];

    http
      .get('/api/imports/templates/members', { responseType: 'blob' })
      .subscribe((value) => values.push(value));
    httpMock.expectOne('/api/imports/templates/members').flush(new Blob(['first']));
    await flushQueryMicrotasks();

    http
      .get('/api/imports/templates/members', { responseType: 'blob' })
      .subscribe((value) => values.push(value));
    httpMock.expectOne('/api/imports/templates/members').flush(new Blob(['second']));
    await flushQueryMicrotasks();

    expect(values).toHaveLength(2);
  });

  it('invalidates cached GET data after a successful mutation', async () => {
    const values: unknown[] = [];

    http.get('/api/members').subscribe((value) => values.push(value));
    httpMock.expectOne('/api/members').flush({ data: [{ id: 'member-1' }] });
    await flushQueryMicrotasks();

    http.post('/api/members', { fullName: 'Alya' }).subscribe();
    httpMock.expectOne('/api/members').flush({ data: { id: 'member-2' } });
    await flushQueryMicrotasks();

    http.get('/api/members').subscribe((value) => values.push(value));
    httpMock.expectOne('/api/members').flush({ data: [{ id: 'member-2' }] });
    await flushQueryMicrotasks();

    expect(values).toEqual([{ data: [{ id: 'member-1' }] }, { data: [{ id: 'member-2' }] }]);
  });

  it('keeps cached data separated by authenticated user and role', async () => {
    const values: unknown[] = [];

    setAuthenticatedUser('user-1', 'member');
    http.get('/api/member/profile').subscribe((value) => values.push(value));
    httpMock.expectOne('/api/member/profile').flush({ data: { name: 'Alya' } });
    await flushQueryMicrotasks();

    setAuthenticatedUser('user-2', 'librarian');
    http.get('/api/member/profile').subscribe((value) => values.push(value));
    httpMock.expectOne('/api/member/profile').flush({ data: { name: 'Bu Rani' } });
    await flushQueryMicrotasks();

    expect(values).toEqual([{ data: { name: 'Alya' } }, { data: { name: 'Bu Rani' } }]);
  });

  function setAuthenticatedUser(userId: string, role: 'member' | 'librarian') {
    authStore.setSession({ access_token: `token-${userId}` } as Session, {
      user: { id: userId, email: `${userId}@example.test` },
      profile: {
        id: `profile-${userId}`,
        role,
        fullName: null,
        avatarPath: null,
        isActive: true,
      },
      member: null,
    });
  }
});

async function flushQueryMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}
