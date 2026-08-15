import { ErrorHandler, Injectable, inject } from '@angular/core';
import { NotificationService } from '../notifications/notification.service';
import { parseApiError } from './api-error';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly notifications = inject(NotificationService);

  handleError(error: unknown): void {
    console.error(error);
    const details = parseApiError(
      error,
      'Aplikasi mengalami kendala. Muat ulang halaman jika masalah berlanjut.',
    );
    this.notifications.showError(details.message, details.requestId);
  }
}
