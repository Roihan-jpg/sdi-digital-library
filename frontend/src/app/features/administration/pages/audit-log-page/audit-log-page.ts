import { JsonPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
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
      <div class="notice">{{ error() }}</div>
    }
    <div class="panel">
      @if (loading()) {
        <p class="state">Memuat audit...</p>
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
    .panel {
      background: #fff;
      border: 1px solid #dce2e5;
      padding: 22px;
    }
    .table {
      overflow: auto;
    }
    table {
      width: 100%;
      min-width: 850px;
      border-collapse: collapse;
    }
    th,
    td {
      text-align: left;
      padding: 12px;
      border-bottom: 1px solid #e1e5e7;
    }
    .link,
    header button {
      border: 0;
      background: #e8eef2;
      color: #123a5d;
      padding: 9px 12px;
      font-weight: 800;
    }
    .changes {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
    }
    pre {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      background: #f4f5f3;
      padding: 14px;
      min-height: 90px;
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
    } catch {
      this.error.set('Audit belum dapat dimuat.');
    } finally {
      this.loading.set(false);
    }
  }
  protected async open(item: AuditLog) {
    try {
      this.selected.set((await firstValueFrom(this.api.getAuditLog(item.id))).data);
    } catch {
      this.error.set('Detail audit belum dapat dimuat.');
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
