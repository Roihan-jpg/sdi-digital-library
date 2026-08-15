import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationStart, Router } from '@angular/router';
import { filter } from 'rxjs';
import { NotificationService } from '../../../core/notifications/notification.service';
import { FeedbackBanner } from '../feedback-banner/feedback-banner';

@Component({
  selector: 'sdi-notification-banner',
  imports: [FeedbackBanner],
  template: `
    @if (notifications.current(); as notification) {
      <sdi-feedback-banner
        tone="error"
        title="Tindakan belum berhasil"
        [message]="notification.message"
        [requestId]="notification.requestId ?? null"
        actionLabel="Muat ulang"
        [dismissible]="true"
        (action)="reloadPage()"
        (dismissed)="notifications.dismiss()"
      />
    }
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class NotificationBanner {
  protected readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);
  private hasSeenNavigation = false;

  constructor() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationStart),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        if (this.router.navigated || this.hasSeenNavigation) this.notifications.dismiss();
        this.hasSeenNavigation = true;
      });
  }

  protected reloadPage(): void {
    globalThis.location?.reload();
  }
}
