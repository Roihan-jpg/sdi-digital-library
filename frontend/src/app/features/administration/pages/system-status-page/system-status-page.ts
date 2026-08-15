import { JsonPipe, KeyValuePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { parseApiError } from '../../../../core/errors/api-error';
import {
  AdministrationApiService,
  type SystemEvent,
  type SystemStatus,
} from '../../data-access/administration-api.service';
@Component({
  selector: 'sdi-system-status-page',
  imports: [KeyValuePipe, JsonPipe],
  template: `<section class="page">
    <header>
      <div>
        <p class="eyebrow">Observabilitas</p>
        <h1>Status sistem</h1>
        <p>Kesehatan koneksi layanan, konfigurasi aman, dan event 30 hari terakhir.</p>
      </div>
      <button (click)="load()">Periksa ulang</button>
    </header>
    @if (error()) {
      <div class="notice" role="alert" aria-atomic="true">{{ error() }}</div>
    }
    @if (status(); as current) {
      <section class="health" [class.degraded]="current.overall === 'degraded'">
        <strong>{{
          current.overall === 'healthy' ? 'Semua layanan sehat' : 'Sebagian layanan terganggu'
        }}</strong
        ><span>Diperiksa {{ date(current.checkedAt) }}</span>
      </section>
      <div class="checks">
        @for (check of current.checks; track check.key) {
          <article>
            <span class="dot" [class.off]="check.status !== 'healthy'"></span>
            <div>
              <strong>{{ check.key }}</strong>
              <p>{{ check.message }}</p>
            </div>
          </article>
        }
      </div>
      <details class="panel">
        <summary>Konfigurasi runtime aman</summary>
        <dl>
          @for (item of current.configuration | keyvalue; track item.key) {
            <div>
              <dt>{{ item.key }}</dt>
              <dd>{{ item.value }}</dd>
            </div>
          }
        </dl>
      </details>
    }
    <section class="panel">
      <h2>Event sistem</h2>
      <div class="events">
        @for (event of events(); track event.id) {
          <article [class.warning]="event.level === 'warning'">
            <div>
              <strong>{{ event.event_code }}</strong
              ><span>{{ event.source }} · {{ date(event.occurred_at) }}</span>
            </div>
            <p>{{ event.message }}</p>
            <small>Request: {{ event.request_id || '-' }}</small>
            <pre>{{ event.context | json }}</pre>
          </article>
        } @empty {
          <p class="state">Tidak ada warning atau error pada masa simpan aktif.</p>
        }
      </div>
    </section>
  </section>`,
  styles: `
    :host {
      display: block;
    }
    .page {
      display: grid;
      gap: var(--space-6);
      color: var(--color-text);
    }
    header {
      display: flex;
      justify-content: space-between;
      gap: var(--space-5);
    }
    .eyebrow {
      margin: 0;
      color: var(--color-brand-800);
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-size: 0.72rem;
    }
    h1,
    h2 {
      color: var(--color-text);
      margin: 0.3rem 0;
    }
    button {
      border: 0;
      min-height: var(--control-height);
      padding: 0.65rem var(--space-4);
      border-radius: var(--radius-md);
      background: var(--color-action-primary);
      color: var(--color-text-inverse);
      font-weight: 800;
    }
    .health {
      display: flex;
      justify-content: space-between;
      padding: var(--space-5) var(--space-6);
      border-left: 6px solid var(--color-success);
      border-radius: var(--radius-lg);
      background: var(--color-success-surface);
      color: var(--color-success);
    }
    .health.degraded {
      border-color: var(--color-warning);
      background: var(--color-warning-surface);
      color: var(--color-warning);
    }
    .checks {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--space-4);
    }
    .checks article,
    .panel {
      padding: var(--space-5);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-surface);
      box-shadow: var(--shadow-sm);
    }
    .checks article {
      display: flex;
      gap: var(--space-3);
    }
    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--color-success);
      margin-top: 5px;
    }
    .dot.off {
      background: var(--color-error);
    }
    .checks p {
      margin: 0.35rem 0;
    }
    .panel summary {
      font-weight: 800;
      cursor: pointer;
    }
    dl {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--space-3);
    }
    dl div {
      display: flex;
      justify-content: space-between;
      padding: var(--space-2);
      border-bottom: 1px solid var(--color-border);
    }
    .events {
      display: grid;
      gap: var(--space-3);
    }
    .events article {
      padding: var(--space-4);
      border-left: 4px solid var(--color-error);
      border-radius: var(--radius-md);
      background: var(--color-error-surface);
    }
    .events article.warning {
      border-color: var(--color-warning);
      background: var(--color-warning-surface);
    }
    .events article div {
      display: flex;
      justify-content: space-between;
    }
    .events span,
    .events small {
      color: var(--color-text-muted);
    }
    .events pre {
      white-space: pre-wrap;
    }
    .notice {
      padding: var(--space-3);
      border-left: 4px solid var(--color-error);
      border-radius: var(--radius-md);
      background: var(--color-error-surface);
      color: var(--color-error);
    }
    .state {
      text-align: center;
      padding: 28px;
    }
    @media (max-width: 800px) {
      header,
      .health {
        display: grid;
      }
      .checks {
        grid-template-columns: 1fr;
      }
      dl {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class SystemStatusPage {
  private readonly api = inject(AdministrationApiService);
  protected readonly status = signal<SystemStatus | null>(null);
  protected readonly events = signal<SystemEvent[]>([]);
  protected readonly error = signal('');
  constructor() {
    void this.load();
  }
  protected async load() {
    this.error.set('');
    try {
      const [status, events] = await Promise.all([
        firstValueFrom(this.api.getSystemStatus()),
        firstValueFrom(this.api.listSystemEvents()),
      ]);
      this.status.set(status.data);
      this.events.set(events.data);
    } catch (error) {
      this.error.set(
        apiMessage(
          error,
          'Status sistem belum dapat dimuat. Gunakan Periksa ulang untuk mencoba lagi.',
        ),
      );
    }
  }
  protected date(value: string) {
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Jakarta',
    }).format(new Date(value));
  }
}

function apiMessage(error: unknown, fallback: string): string {
  const details = parseApiError(error, fallback);
  return details.requestId ? `${details.message} Referensi: ${details.requestId}` : details.message;
}
