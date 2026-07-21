import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthStore } from '../../../../core/auth/auth.store';
import {
  MasterDataApiService,
  type MasterRow,
} from '../../../master-data/data-access/master-data-api.service';
import { DigitalLibraryApiService } from '../../data-access/digital-library-api.service';
import type { DigitalCollection, DigitalMediaType } from '../../models/digital-collection.model';

@Component({
  selector: 'sdi-digital-management-page',
  imports: [ReactiveFormsModule],
  template: `
    <section class="page">
      <p class="eyebrow">Pengelolaan</p>
      <h1>Koleksi digital</h1>
      <p>
        File utama disimpan privat. PDF maksimal 100 MB; video MP4/WebM; audio MP3/MP4/OGG/WAV.
        Cover JPG/PNG/WebP maksimal 5 MB.
      </p>
      @if (canEdit()) {
        <form [formGroup]="form" (ngSubmit)="save()">
          <h2>{{ editingId() ? 'Ubah koleksi' : 'Tambah koleksi' }}</h2>
          <div class="fields">
            <label>Judul *<input formControlName="title" (blur)="suggestSlug()" /></label
            ><label
              >Slug URL *<input
                formControlName="slug"
                placeholder="contoh-modul-matematika" /></label
            ><label
              >Jenis media *<select formControlName="mediaType">
                <option value="ebook">E-book/PDF</option>
                <option value="module">Modul</option>
                <option value="video">Video</option>
                <option value="audio">Audio</option>
              </select></label
            ><label
              >Kategori<select formControlName="categoryId">
                <option value="">Tanpa kategori</option>
                @for (category of categories(); track category.id) {
                  <option [value]="category.id">{{ category.name }}</option>
                }
              </select></label
            ><label>Penulis<input formControlName="authorText" /></label
            ><label>Penerbit<input formControlName="publisherText" /></label
            ><label
              >Tahun terbit<input
                type="number"
                formControlName="publicationYear"
                min="1000"
                max="2100" /></label
            ><label
              >Durasi (detik)<input
                type="number"
                formControlName="durationSeconds"
                min="0" /></label
            ><label class="wide"
              >Deskripsi<textarea formControlName="description" rows="4"></textarea></label
            ><label
              >File utama {{ editingId() ? '(opsional jika tidak diganti)' : '*'
              }}<input
                type="file"
                (change)="pickFile($event)"
                accept="application/pdf,video/mp4,video/webm,audio/mpeg,audio/mp4,audio/ogg,audio/wav" /></label
            ><label
              >Cover (opsional)<input
                type="file"
                (change)="pickCover($event)"
                accept="image/jpeg,image/png,image/webp" /></label
            ><label class="check"
              ><input type="checkbox" formControlName="isPublished" /> Terbitkan</label
            ><label class="check"
              ><input type="checkbox" formControlName="isDownloadable" /> Boleh diunduh</label
            >
          </div>
          @if (formError()) {
            <p class="error" role="alert">{{ formError() }}</p>
          }
          <div class="actions">
            <button class="button" type="submit" [disabled]="saving()">
              {{ saving() ? 'Menyimpan…' : 'Simpan koleksi' }}
            </button>
            @if (editingId()) {
              <button class="button button--secondary" type="button" (click)="reset()">
                Batal ubah
              </button>
            }
          </div>
        </form>
      }
      <div class="list-head">
        <h2>Daftar koleksi</h2>
        <button class="button button--secondary" type="button" (click)="load()">Muat ulang</button>
      </div>
      @if (loading()) {
        <p role="status">Memuat data…</p>
      }
      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }
      @if (!loading() && items().length === 0) {
        <p>Belum ada koleksi digital.</p>
      }
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Judul</th>
              <th>Media</th>
              <th>Status</th>
              <th>Unduh</th>
              <th>Diperbarui</th>
              @if (canEdit()) {
                <th>Aksi</th>
              }
            </tr>
          </thead>
          <tbody>
            @for (item of items(); track item.id) {
              <tr>
                <td>
                  <strong>{{ item.title }}</strong
                  ><br /><small>/{{ item.slug }}</small>
                </td>
                <td>{{ item.media_type }}</td>
                <td>
                  <span [class.published]="item.is_published">{{
                    item.is_published ? 'Published' : 'Draft'
                  }}</span>
                </td>
                <td>{{ item.is_downloadable ? 'Ya' : 'Tidak' }}</td>
                <td>{{ item.updated_at.slice(0, 10) }}</td>
                @if (canEdit()) {
                  <td>
                    <button type="button" (click)="edit(item)">Ubah</button
                    ><button class="danger" type="button" (click)="remove(item)">Hapus</button>
                  </td>
                }
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
  styles: `
    form {
      padding: 1.25rem;
      border: 1px solid #d5dfd9;
      border-radius: 0.75rem;
      background: #fff;
    }
    .fields {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1rem;
    }
    .fields label {
      display: grid;
      gap: 0.35rem;
      font-weight: 700;
    }
    .fields .wide {
      grid-column: 1/-1;
    }
    .check {
      display: flex !important;
      align-items: center;
    }
    .check input {
      width: auto;
    }
    input,
    select,
    textarea {
      width: 100%;
      padding: 0.7rem;
      border: 1px solid #9dafa4;
      border-radius: 0.45rem;
    }
    .actions,
    .list-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      margin-top: 1rem;
    }
    .table-wrap {
      overflow: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background: #fff;
    }
    th,
    td {
      padding: 0.75rem;
      border-bottom: 1px solid #d5dfd9;
      text-align: left;
    }
    td button {
      margin-right: 0.4rem;
      padding: 0.4rem;
    }
    .published {
      color: #176b43;
      font-weight: 800;
    }
    .danger,
    .error {
      color: #9b1c1c;
    }
    @media (max-width: 42rem) {
      .fields {
        grid-template-columns: 1fr;
      }
      .fields .wide {
        grid-column: auto;
      }
    }
  `,
})
export class DigitalManagementPage {
  private readonly api = inject(DigitalLibraryApiService);
  private readonly masters = inject(MasterDataApiService);
  private readonly auth = inject(AuthStore);
  protected readonly items = signal<DigitalCollection[]>([]);
  protected readonly categories = signal<MasterRow[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly formError = signal('');
  protected readonly editingId = signal<string | null>(null);
  private file: File | null = null;
  private cover: File | null = null;
  protected readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    slug: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)],
    }),
    description: new FormControl('', { nonNullable: true }),
    mediaType: new FormControl<DigitalMediaType>('ebook', { nonNullable: true }),
    categoryId: new FormControl('', { nonNullable: true }),
    authorText: new FormControl('', { nonNullable: true }),
    publisherText: new FormControl('', { nonNullable: true }),
    publicationYear: new FormControl<number | null>(null),
    durationSeconds: new FormControl<number | null>(null),
    isDownloadable: new FormControl(true, { nonNullable: true }),
    isPublished: new FormControl(false, { nonNullable: true }),
  });
  constructor() {
    this.load();
    this.masters.list('categories').subscribe({ next: (r) => this.categories.set(r.data) });
  }
  protected canEdit() {
    return ['master_admin', 'librarian'].includes(this.auth.currentRole() ?? '');
  }
  protected load() {
    this.loading.set(true);
    this.error.set('');
    this.api.management().subscribe({
      next: (r) => {
        this.items.set(r.data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Data koleksi belum dapat dimuat.');
        this.loading.set(false);
      },
    });
  }
  protected suggestSlug() {
    if (this.form.controls.slug.value) return;
    this.form.controls.slug.setValue(
      this.form.controls.title.value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, ''),
    );
  }
  protected pickFile(event: Event) {
    this.file = (event.target as HTMLInputElement).files?.[0] ?? null;
  }
  protected pickCover(event: Event) {
    this.cover = (event.target as HTMLInputElement).files?.[0] ?? null;
  }
  protected save() {
    this.form.markAllAsTouched();
    if (this.form.invalid || (!this.editingId() && !this.file)) {
      this.formError.set('Lengkapi field wajib dan pilih file utama.');
      return;
    }
    this.saving.set(true);
    this.formError.set('');
    const payload = toFormData(this.form.getRawValue(), this.file, this.cover);
    const request = this.editingId()
      ? this.api.update(this.editingId()!, payload)
      : this.api.create(payload);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.reset();
        this.load();
      },
      error: () => {
        this.formError.set('Koleksi gagal disimpan. Periksa format file dan slug.');
        this.saving.set(false);
      },
    });
  }
  protected edit(item: DigitalCollection) {
    this.editingId.set(item.id);
    this.file = null;
    this.cover = null;
    this.form.setValue({
      title: item.title,
      slug: item.slug,
      description: item.description ?? '',
      mediaType: item.media_type,
      categoryId: item.category_id ?? '',
      authorText: item.author_text ?? '',
      publisherText: item.publisher_text ?? '',
      publicationYear: item.publication_year,
      durationSeconds: item.duration_seconds,
      isDownloadable: item.is_downloadable,
      isPublished: item.is_published,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  protected reset() {
    this.editingId.set(null);
    this.file = null;
    this.cover = null;
    this.form.reset({
      title: '',
      slug: '',
      description: '',
      mediaType: 'ebook',
      categoryId: '',
      authorText: '',
      publisherText: '',
      publicationYear: null,
      durationSeconds: null,
      isDownloadable: true,
      isPublished: false,
    });
    this.formError.set('');
  }
  protected remove(item: DigitalCollection) {
    if (!confirm(`Hapus koleksi “${item.title}”? File utama dan cover juga akan dihapus.`)) return;
    this.api.remove(item.id).subscribe({
      next: () => this.load(),
      error: () => this.error.set('Koleksi tidak dapat dihapus.'),
    });
  }
}
function toFormData(
  value: ReturnType<DigitalManagementPage['form']['getRawValue']>,
  file: File | null,
  cover: File | null,
) {
  const data = new FormData();
  for (const [key, raw] of Object.entries(value)) {
    data.set(key, raw === null ? '' : String(raw));
  }
  if (file) data.set('file', file);
  if (cover) data.set('cover', cover);
  return data;
}
