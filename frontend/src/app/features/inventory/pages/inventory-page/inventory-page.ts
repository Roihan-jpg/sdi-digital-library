import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import type { Observable } from 'rxjs';
import {
  InventoryApiService,
  type BookCopyPayload,
  type BookTitlePayload,
} from '../../data-access/inventory-api.service';
@Component({
  selector: 'sdi-inventory-page',
  imports: [ReactiveFormsModule],
  template: `<section>
    <p class="eyebrow">Katalog operasional</p>
    <h1>Judul dan eksemplar buku</h1>
    <p>
      Isi ID referensi dari master data. Kode inventaris ditentukan petugas dan dipakai persis untuk
      barcode/QR.
    </p>
    <div class="columns">
      <form [formGroup]="titleForm" (ngSubmit)="saveTitle()">
        <h2>Tambah judul</h2>
        <label>Judul<input formControlName="title" /></label
        ><label>ISBN<input formControlName="isbn" /></label
        ><label>Kode katalog<input formControlName="catalogCode" /></label
        ><label>ID kategori<input formControlName="categoryId" /></label
        ><label>ID penerbit<input formControlName="publisherId" /></label
        ><label>ID rak default<input formControlName="defaultShelfId" /></label
        ><label>Tahun terbit<input type="number" formControlName="publicationYear" /></label
        ><label>ID pengarang<input formControlName="authorId" /></label
        ><button class="button" [disabled]="saving()">Simpan judul</button>
      </form>
      <form [formGroup]="copyForm" (ngSubmit)="saveCopy()">
        <h2>Tambah eksemplar</h2>
        <label>ID judul<input formControlName="bookTitleId" /></label
        ><label>Kode inventaris<input formControlName="inventoryCode" autocomplete="off" /></label
        ><label>ID rak<input formControlName="shelfId" /></label
        ><label
          >Kondisi<select formControlName="condition">
            <option value="new">Baru</option>
            <option value="good">Baik</option>
            <option value="fair">Cukup</option>
            <option value="damaged">Rusak</option>
            <option value="lost">Hilang</option>
          </select></label
        ><label
          >Status<select formControlName="status">
            <option value="available">Tersedia</option>
            <option value="maintenance">Perawatan</option>
            <option value="inactive">Nonaktif</option>
          </select></label
        ><button class="button" [disabled]="saving()">Simpan eksemplar</button>
      </form>
    </div>
    @if (message()) {
      <p role="status">{{ message() }}</p>
    }
    @if (lastCopyId()) {
      <button class="button button--secondary" type="button" (click)="printLast()">
        Cetak barcode & QR terakhir
      </button>
    }
  </section>`,
  styles: `
    section {
      padding: 2rem;
    }
    .columns {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
      gap: 1rem;
    }
    form {
      display: grid;
      gap: 0.7rem;
      padding: 1rem;
      background: #fff;
      border: 1px solid #d5dfd9;
      border-radius: 0.7rem;
    }
    label {
      display: grid;
      gap: 0.3rem;
    }
    input,
    select {
      padding: 0.65rem;
      border: 1px solid #aebdb4;
      border-radius: 0.4rem;
    }
  `,
})
export class InventoryPage {
  private readonly api = inject(InventoryApiService);
  protected readonly saving = signal(false);
  protected readonly message = signal('');
  protected readonly lastCopyId = signal<string | null>(null);
  protected readonly titleForm = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    isbn: new FormControl<string | null>(null),
    catalogCode: new FormControl<string | null>(null),
    categoryId: new FormControl<string | null>(null),
    publisherId: new FormControl<string | null>(null),
    defaultShelfId: new FormControl<string | null>(null),
    publicationYear: new FormControl<number | null>(null),
    authorId: new FormControl<string | null>(null),
  });
  protected readonly copyForm = new FormGroup({
    bookTitleId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    inventoryCode: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    shelfId: new FormControl<string | null>(null),
    condition: new FormControl<'new' | 'good' | 'fair' | 'damaged' | 'lost'>('good', {
      nonNullable: true,
    }),
    status: new FormControl<
      'available' | 'reserved' | 'loaned' | 'damaged' | 'lost' | 'maintenance' | 'inactive'
    >('available', { nonNullable: true }),
  });
  protected saveTitle() {
    if (this.titleForm.invalid) return;
    const v = this.titleForm.getRawValue();
    const body: BookTitlePayload = {
      ...v,
      authorIds: v.authorId ? [v.authorId] : [],
      language: 'id',
      purchasePrice: null,
      isReferenceOnly: false,
      isActive: true,
      isPublished: true,
    };
    this.run(this.api.createTitle(body), (r) => {
      this.copyForm.controls.bookTitleId.setValue(r.data.id);
      this.message.set('Judul disimpan. ID judul sudah diisi pada form eksemplar.');
    });
  }
  protected saveCopy() {
    if (this.copyForm.invalid) return;
    const body: BookCopyPayload = { ...this.copyForm.getRawValue(), isActive: true };
    this.run(this.api.createCopy(body), (r) => {
      this.lastCopyId.set(r.data.id);
      this.message.set(`Eksemplar ${r.data.inventory_code} disimpan.`);
      this.copyForm.controls.inventoryCode.reset();
    });
  }
  protected printLast() {
    const id = this.lastCopyId();
    if (!id) return;
    this.api.print([id]).subscribe((html) => {
      const popup = window.open('', '_blank');
      if (popup) {
        popup.document.write(html);
        popup.document.close();
        popup.print();
      }
    });
  }
  private run<T>(request: Observable<T>, next: (value: T) => void) {
    this.saving.set(true);
    request.subscribe({
      next: (value) => {
        next(value);
        this.saving.set(false);
      },
      error: () => {
        this.message.set('Data tidak dapat disimpan. Periksa ID referensi dan nilai duplikat.');
        this.saving.set(false);
      },
    });
  }
}
