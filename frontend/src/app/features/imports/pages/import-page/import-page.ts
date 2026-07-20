import { Component, inject, signal } from '@angular/core';
import {
  ImportApiService,
  type ImportJob,
  type ImportKind,
} from '../../data-access/import-api.service';
@Component({
  selector: 'sdi-import-page',
  template: `<section>
    <p class="eyebrow">Migrasi data</p>
    <h1>Import member dan buku</h1>
    <p>Gunakan template resmi. Baris valid tetap diproses dan setiap baris gagal dicatat.</p>
    <div class="cards">
      @for (kind of kinds; track kind.value) {
        <article>
          <h2>{{ kind.label }}</h2>
          <button
            class="button button--secondary"
            type="button"
            (click)="downloadTemplate(kind.value)"
          >
            Unduh template</button
          ><label
            >Pilih Excel/CSV<input
              type="file"
              accept=".xlsx,.csv"
              (change)="choose($event, kind.value)" /></label
          ><button
            class="button"
            type="button"
            [disabled]="uploading()"
            (click)="upload(kind.value)"
          >
            Import
          </button>
        </article>
      }
    </div>
    @if (message()) {
      <p role="status">{{ message() }}</p>
    }
    <h2>Riwayat import</h2>
    <div class="table">
      <table>
        <thead>
          <tr>
            <th>File</th>
            <th>Jenis</th>
            <th>Status</th>
            <th>Berhasil</th>
            <th>Gagal</th>
            <th>Detail</th>
          </tr>
        </thead>
        <tbody>
          @for (job of jobs(); track job.id) {
            <tr>
              <td>{{ job.file_name }}</td>
              <td>{{ job.import_type }}</td>
              <td>{{ job.status }}</td>
              <td>{{ job.success_rows }}</td>
              <td>{{ job.failed_rows }}</td>
              <td>
                @if (job.failed_rows) {
                  <button type="button" (click)="downloadErrors(job)">CSV error</button>
                }
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  </section>`,
  styles: `
    section {
      padding: 2rem;
    }
    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
      gap: 1rem;
    }
    article {
      display: grid;
      gap: 1rem;
      padding: 1rem;
      background: #fff;
      border: 1px solid #d5dfd9;
      border-radius: 0.7rem;
    }
    .table {
      overflow: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background: #fff;
    }
    th,
    td {
      padding: 0.7rem;
      border-bottom: 1px solid #d5dfd9;
      text-align: left;
    }
  `,
})
export class ImportPage {
  protected readonly api = inject(ImportApiService);
  protected readonly kinds: readonly { value: ImportKind; label: string }[] = [
    { value: 'members', label: 'Member' },
    { value: 'books', label: 'Buku dan eksemplar' },
  ];
  protected readonly jobs = signal<ImportJob[]>([]);
  protected readonly uploading = signal(false);
  protected readonly message = signal('');
  private readonly files = new Map<ImportKind, File>();
  constructor() {
    this.load();
  }
  protected choose(event: Event, kind: ImportKind) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.files.set(kind, file);
  }
  protected upload(kind: ImportKind) {
    const file = this.files.get(kind);
    if (!file) {
      this.message.set('Pilih file terlebih dahulu.');
      return;
    }
    this.uploading.set(true);
    this.api.upload(kind, file).subscribe({
      next: (r) => {
        this.message.set(
          `Import selesai: ${r.data.success_rows} berhasil, ${r.data.failed_rows} gagal.`,
        );
        this.uploading.set(false);
        this.load();
      },
      error: () => {
        this.message.set('Import gagal dijalankan. Periksa format file.');
        this.uploading.set(false);
      },
    });
  }
  protected downloadTemplate(kind: ImportKind) {
    this.api.template(kind).subscribe((blob) => download(blob, `template-${kind}.xlsx`));
  }
  protected downloadErrors(job: ImportJob) {
    this.api.errors(job.id).subscribe((blob) => download(blob, `import-${job.id}-errors.csv`));
  }
  private load() {
    this.api.list().subscribe({
      next: (r) => this.jobs.set(r.data),
      error: () => this.message.set('Riwayat import belum dapat dimuat.'),
    });
  }
}

function download(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
