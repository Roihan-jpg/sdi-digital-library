import { Injectable, signal } from '@angular/core';

export interface AppNotification {
  message: string;
  requestId?: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly currentState = signal<AppNotification | null>(null);
  readonly current = this.currentState.asReadonly();

  showError(message: string, requestId?: string): void {
    this.currentState.set(requestId ? { message, requestId } : { message });
  }

  dismiss(): void {
    this.currentState.set(null);
  }
}
