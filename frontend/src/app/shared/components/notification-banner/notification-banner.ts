import { Component, inject } from '@angular/core';
import { NotificationService } from '../../../core/notifications/notification.service';

@Component({
  selector: 'sdi-notification-banner',
  template: `
    @if (notifications.current(); as notification) {
      <div class="notification alert alert--error" role="alert" aria-live="assertive">
        <div class="notification__content">
          <strong>Tindakan belum berhasil</strong>
          <p>{{ notification.message }}</p>
          @if (notification.requestId) {
            <small
              >Referensi: <code>{{ notification.requestId }}</code></small
            >
          }
        </div>
        <button
          class="button button--tertiary notification__dismiss"
          type="button"
          aria-label="Tutup pesan kesalahan"
          (click)="notifications.dismiss()"
        >
          Tutup
        </button>
      </div>
    }
  `,
  styles: `
    .notification {
      grid-template-columns: var(--border-width-accent) minmax(0, 1fr) auto;
      border-inline: 0;
      border-radius: 0;
    }
    .notification__content {
      min-width: 0;
    }
    .notification__content strong {
      font-family: var(--font-family-display);
    }
    p {
      margin: var(--space-1) 0;
    }
    code {
      font-family: var(--font-family-data);
      overflow-wrap: anywhere;
    }
    .notification__dismiss {
      align-self: start;
      color: inherit;
    }
    @media (max-width: 36rem) {
      .notification {
        grid-template-columns: var(--border-width-accent) minmax(0, 1fr);
      }
      .notification__dismiss {
        grid-column: 2;
        justify-self: start;
      }
    }
  `,
})
export class NotificationBanner {
  protected readonly notifications = inject(NotificationService);
}
