import { JsonPipe, KeyValuePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
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
      <div class="notice">{{ error() }}</div>
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
      gap: 22px;
      color: #18354e;
    }
    header {
      display: flex;
      justify-content: space-between;
      gap: 20px;
    }
    .eyebrow {
      margin: 0;
      color: #a5660b;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-size: 0.72rem;
    }
    h1,
    h2 {
      color: #102f4d;
      margin: 0.3rem 0;
    }
    button {
      border: 0;
      background: #123a5d;
      color: white;
      padding: 10px 14px;
      font-weight: 800;
    }
    .health {
      display: flex;
      justify-content: space-between;
      padding: 18px 22px;
      background: #e6f5ed;
      border-left: 6px solid #20805d;
    }
    .health.degraded {
      background: #fff3dc;
      border-color: #d79224;
    }
    .checks {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px;
    }
    .checks article,
    .panel {
      background: #fff;
      border: 1px solid #dce2e5;
      padding: 20px;
    }
    .checks article {
      display: flex;
      gap: 12px;
    }
    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #20805d;
      margin-top: 5px;
    }
    .dot.off {
      background: #b23b2c;
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
      gap: 10px;
    }
    dl div {
      display: flex;
      justify-content: space-between;
      border-bottom: 1px solid #e1e5e7;
      padding: 8px;
    }
    .events {
      display: grid;
      gap: 12px;
    }
    .events article {
      border-left: 4px solid #b23b2c;
      background: #fff4f1;
      padding: 14px;
    }
    .events article.warning {
      border-color: #d79224;
      background: #fff7e9;
    }
    .events article div {
      display: flex;
      justify-content: space-between;
    }
    .events span,
    .events small {
      color: #61727f;
    }
    .events pre {
      white-space: pre-wrap;
    }
    .notice {
      padding: 12px;
      background: #fff0ed;
      border-left: 4px solid #b23b2c;
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
    } catch {
      this.error.set('Status sistem belum dapat dimuat.');
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
