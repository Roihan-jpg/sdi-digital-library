import { Component, computed, input, output } from '@angular/core';

export type FeedbackTone = 'info' | 'success' | 'warning' | 'error';

export interface FeedbackMessage {
  tone: FeedbackTone;
  message: string;
  title?: string;
  requestId?: string;
}

@Component({
  selector: 'sdi-feedback-banner',
  template: `
    <div
      class="feedback-banner alert"
      [class.alert--success]="tone() === 'success'"
      [class.alert--warning]="tone() === 'warning'"
      [class.alert--error]="tone() === 'error'"
      [attr.role]="liveRole()"
      aria-atomic="true"
    >
      <div class="feedback-banner__content">
        @if (title()) {
          <strong>{{ title() }}</strong>
        }
        <p>{{ message() }}</p>
        @if (requestId()) {
          <small
            >Referensi: <code translate="no">{{ requestId() }}</code></small
          >
        }
      </div>
      @if (actionLabel() || dismissible()) {
        <div class="feedback-banner__actions">
          @if (actionLabel()) {
            <button class="button button--secondary" type="button" (click)="action.emit()">
              {{ actionLabel() }}
            </button>
          }
          @if (dismissible()) {
            <button
              class="button button--tertiary"
              type="button"
              aria-label="Tutup pesan"
              (click)="dismissed.emit()"
            >
              Tutup
            </button>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .feedback-banner {
      grid-template-columns: var(--border-width-accent) minmax(0, 1fr) auto;
    }
    .feedback-banner__content {
      min-width: 0;
    }
    .feedback-banner__content strong {
      font-family: var(--font-family-display);
    }
    p {
      margin: var(--space-1) 0;
    }
    code {
      font-family: var(--font-family-data);
      overflow-wrap: anywhere;
    }
    .feedback-banner__actions {
      align-self: start;
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }
    .feedback-banner__actions .button {
      color: inherit;
    }
    @media (max-width: 36rem) {
      .feedback-banner {
        grid-template-columns: var(--border-width-accent) minmax(0, 1fr);
      }
      .feedback-banner__actions {
        grid-column: 2;
        justify-self: start;
      }
    }
  `,
})
export class FeedbackBanner {
  readonly tone = input<FeedbackTone>('info');
  readonly title = input<string | null>(null);
  readonly message = input.required<string>();
  readonly requestId = input<string | null | undefined>(null);
  readonly actionLabel = input<string | null>(null);
  readonly dismissible = input(false);
  readonly action = output<void>();
  readonly dismissed = output<void>();
  protected readonly liveRole = computed(() => (this.tone() === 'error' ? 'alert' : 'status'));
}
