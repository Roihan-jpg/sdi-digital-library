import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../notifications/notification.service';

interface ApiErrorBody {
  error?: { message?: string; requestId?: string };
}

export const errorInterceptor: HttpInterceptorFn = (request, next) => {
  const notifications = inject(NotificationService);

  return next(request).pipe(
    catchError((error: unknown) => {
      const response = error instanceof HttpErrorResponse ? error : null;
      const body = response?.error as ApiErrorBody | undefined;
      const fallback =
        response?.status === 0
          ? 'Server tidak dapat dihubungi. Periksa koneksi lalu coba lagi.'
          : 'Permintaan gagal diproses. Silakan coba lagi.';
      notifications.showError(body?.error?.message ?? fallback, body?.error?.requestId);
      return throwError(() => error);
    }),
  );
};
