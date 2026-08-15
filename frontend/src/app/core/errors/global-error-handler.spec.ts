import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { NotificationService } from '../notifications/notification.service';
import { GlobalErrorHandler } from './global-error-handler';

describe('GlobalErrorHandler', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [GlobalErrorHandler] });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => vi.restoreAllMocks());

  it('preserves a safe unhandled API message and request reference', () => {
    const handler = TestBed.inject(GlobalErrorHandler);
    const notifications = TestBed.inject(NotificationService);

    handler.handleError(
      new HttpErrorResponse({
        status: 503,
        error: {
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Layanan belum tersedia. Coba lagi.',
            requestId: 'request-503',
          },
        },
      }),
    );

    expect(notifications.current()).toEqual({
      message: 'Layanan belum tersedia. Coba lagi.',
      requestId: 'request-503',
    });
  });

  it('uses a safe generic message for unexpected runtime errors', () => {
    const handler = TestBed.inject(GlobalErrorHandler);
    const notifications = TestBed.inject(NotificationService);

    handler.handleError(new Error('private runtime detail'));

    expect(notifications.current()?.message).toBe(
      'Aplikasi mengalami kendala. Muat ulang halaman jika masalah berlanjut.',
    );
  });
});
