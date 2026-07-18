import { Component, inject } from '@angular/core';
import { NotificationService } from '../../../core/notifications/notification.service';

@Component({
  selector: 'sdi-notification-banner',
  template: `
    @if (notifications.current(); as notification) {
      <div class="banner" role="alert">
        <div>
          <strong>Terjadi kendala</strong>
          <p>{{ notification.message }}</p>
          @if (notification.requestId) {
            <small>Referensi: {{ notification.requestId }}</small>
          }
        </div>
        <button type="button" aria-label="Tutup pesan kesalahan" (click)="notifications.dismiss()">
          Tutup
        </button>
      </div>
    }
  `,
  styles: `
    .banner {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem;
      background: #fff0ee;
      border-bottom: 1px solid #b42318;
      color: #7a271a;
    }
    p {
      margin: 0.25rem 0;
    }
    button {
      align-self: start;
      border: 0;
      background: transparent;
      color: inherit;
      font-weight: 700;
      cursor: pointer;
    }
  `,
})
export class NotificationBanner {
  protected readonly notifications = inject(NotificationService);
}
