import { JsonPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { parseApiError } from '../../../../core/errors/api-error';
import {
  AdministrationApiService,
  type AuditLog,
} from '../../data-access/administration-api.service';
@Component({
  selector: 'sdi-audit-log-page',
  imports: [JsonPipe],
  template: `<section class="page">
    <header>
      <div>
        <p class="eyebrow">Ketertelusuran</p>
        <h1>Audit log</h1>
        <p>Daftar perubahan penting. Detail sensitif sudah disamarkan oleh server.</p>
      </div>
      <button (click)="load()">Muat ulang</button>
    </header>
    @if (error()) {
      <div class="notice" role="alert" aria-atomic="true">{{ error() }}</div>
    }
    <div class="panel">
      @if (loading()) {
        <p class="state" role="status">Memuat audit...</p>
      } @else {
        <div class="table">
          <table>
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Tabel</th>
                <th>Aksi</th>
                <th>Record</th>
                <th>Pelaku</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (item of logs(); track item.id) {
                <tr>
                  <td>{{ date(item.createdAt) }}</td>
                  <td>{{ item.tableName }}</td>
                  <td>
                    <strong>{{ item.action }}</strong>
                  </td>
                  <td>{{ item.recordId || '-' }}</td>
                  <td>{{ item.userId || 'Sistem' }}</td>
                  <td><button class="link" (click)="open(item)">Detail</button></td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="6" class="state">Belum ada audit.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
    @if (selected(); as item) {
      <section class="panel detail">
        <div>
          <p class="eyebrow">Detail audit</p>
          <h2>{{ item.tableName }} · {{ item.action }}</h2>
        </div>
        <div class="changes">
          <div>
            <h3>Sebelum</h3>
            <pre>{{ item.oldData | json }}</pre>
          </div>
          <div>
            <h3>Sesudah</h3>
            <pre>{{ item.newData | json }}</pre>
          </div>
        </div>
      </section>
    }
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
    .panel {
      padding: var(--space-6);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-surface);
      box-shadow: var(--shadow-sm);
    }
    .table {
      overflow: auto;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
    }
    table {
      width: 100%;
      min-width: 850px;
      border-collapse: collapse;
    }
    th,
    td {
      text-align: left;
      padding: var(--space-3);
      border-bottom: 1px solid var(--color-border);
    }
    .link,
    header button {
      border: 0;
      padding: 0.6rem var(--space-3);
      border-radius: var(--radius-md);
      background: var(--color-surface-subtle);
      color: var(--color-brand-800);
      font-weight: 800;
    }
    .changes {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-4);
    }
    pre {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      padding: var(--space-4);
      border-radius: var(--radius-md);
      background: var(--color-neutral-surface);
      color: var(--color-text);
      min-height: 90px;
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
      .changes {
        display: grid;
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class AuditLogPage {
  private readonly api = inject(AdministrationApiService);
  protected readonly logs = signal<AuditLog[]>([]);
  protected readonly selected = signal<AuditLog | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  constructor() {
    void this.load();
  }
  protected async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      this.logs.set((await firstValueFrom(this.api.listAuditLogs())).data);
    } catch (error) {
      this.error.set(
        apiMessage(error, 'Audit belum dapat dimuat. Gunakan Muat ulang untuk mencoba lagi.'),
      );
    } finally {
      this.loading.set(false);
    }
  }
  protected async open(item: AuditLog) {
    try {
      this.selected.set((await firstValueFrom(this.api.getAuditLog(item.id))).data);
    } catch (error) {
      this.error.set(apiMessage(error, 'Detail audit belum dapat dimuat. Coba pilih kembali.'));
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
