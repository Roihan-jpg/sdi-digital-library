import { Component, inject, signal } from '@angular/core';
import { DomSanitizer, type SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthStore } from '../../../../core/auth/auth.store';
import { DigitalLibraryApiService } from '../../data-access/digital-library-api.service';
import type { DigitalCollection } from '../../models/digital-collection.model';

@Component({
  selector: 'sdi-digital-detail-page',
  imports: [RouterLink],
  template: `
    <section class="page">
      @if (loading()) {
        <p role="status">Memuat detail…</p>
      }
      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }
      @if (item(); as collection) {
        <a routerLink="/koleksi-digital">← Kembali ke koleksi</a>
        <div class="detail">
          @if (collection.coverUrl) {
            <img [src]="collection.coverUrl" [alt]="'Cover ' + collection.title" />
          }
          <div>
            <p class="eyebrow">{{ collection.media_type }}</p>
            <h1>{{ collection.title }}</h1>
            <p>{{ collection.description || 'Deskripsi belum tersedia.' }}</p>
            <dl>
              <div>
                <dt>Penulis</dt>
                <dd>{{ collection.author_text || '—' }}</dd>
              </div>
              <div>
                <dt>Penerbit</dt>
                <dd>{{ collection.publisher_text || '—' }}</dd>
              </div>
              <div>
                <dt>Tahun</dt>
                <dd>{{ collection.publication_year || '—' }}</dd>
              </div>
            </dl>
            @if (!authStore.isAuthenticated()) {
              <p class="notice">Silakan masuk untuk membuka file penuh.</p>
              <a class="button" routerLink="/masuk">Masuk untuk mengakses</a>
            } @else {
              <div class="actions">
                <button class="button" type="button" [disabled]="opening()" (click)="open()">
                  {{ opening() ? 'Menyiapkan…' : 'Buka koleksi' }}
                </button>
                @if (collection.is_downloadable) {
                  <button
                    class="button button--secondary"
                    type="button"
                    [disabled]="opening()"
                    (click)="download()"
                  >
                    Unduh
                  </button>
                }
              </div>
            }
          </div>
        </div>
        @if (mediaUrl()) {
          <section class="viewer">
            <h2>Media</h2>
            @if (collection.media_type === 'video') {
              <video controls [src]="mediaUrl()">Browser tidak dapat memutar video ini.</video>
            } @else if (collection.media_type === 'audio') {
              <audio controls [src]="mediaUrl()">Browser tidak dapat memutar audio ini.</audio>
            } @else {
              <iframe [src]="safeMediaUrl()" title="Pembaca dokumen digital"
                ><p>Dokumen tidak dapat ditampilkan. Gunakan tombol unduh bila tersedia.</p></iframe
              >
            }
            <p><a [href]="mediaUrl()" target="_blank" rel="noopener">Buka media di tab baru</a></p>
          </section>
        }
      }
    </section>
  `,
  styles: `
    .detail {
      display: grid;
      grid-template-columns: minmax(12rem, 18rem) 1fr;
      gap: 2rem;
      margin-top: 1.5rem;
    }
    .detail img {
      width: 100%;
      border-radius: 0.8rem;
    }
    dl div {
      display: grid;
      grid-template-columns: 7rem 1fr;
      margin: 0.4rem 0;
    }
    dt {
      font-weight: 700;
    }
    dd {
      margin: 0;
    }
    .actions {
      display: flex;
      gap: 0.75rem;
    }
    .notice,
    .viewer {
      padding: 1rem;
      border: 1px solid #d5dfd9;
      border-radius: 0.7rem;
      background: #fff;
    }
    .viewer {
      margin-top: 2rem;
    }
    .viewer video,
    .viewer audio,
    .viewer iframe {
      width: 100%;
    }
    .viewer video,
    .viewer iframe {
      min-height: 32rem;
    }
    .error {
      color: #8f1d1d;
    }
    @media (max-width: 40rem) {
      .detail {
        grid-template-columns: 1fr;
      }
      .detail img {
        max-width: 18rem;
      }
      .viewer video,
      .viewer iframe {
        min-height: 20rem;
      }
    }
  `,
})
export class DigitalDetailPage {
  private readonly api = inject(DigitalLibraryApiService);
  private readonly sanitizer = inject(DomSanitizer);
  protected readonly authStore = inject(AuthStore);
  protected readonly item = signal<DigitalCollection | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly opening = signal(false);
  protected readonly mediaUrl = signal('');
  protected readonly safeMediaUrl = signal<SafeResourceUrl>('');
  constructor() {
    const slug = inject(ActivatedRoute).snapshot.paramMap.get('slug') ?? '';
    this.api.detail(slug).subscribe({
      next: (r) => {
        this.item.set(r.data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Koleksi tidak ditemukan atau belum diterbitkan.');
        this.loading.set(false);
      },
    });
  }
  protected open() {
    const item = this.item();
    if (!item || this.opening()) return;
    this.opening.set(true);
    this.api
      .access(item.id, item.media_type === 'video' || item.media_type === 'audio' ? 'play' : 'view')
      .subscribe({
        next: (r) => {
          this.mediaUrl.set(r.data.url);
          this.safeMediaUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(r.data.url));
          this.opening.set(false);
        },
        error: () => {
          this.error.set('File tidak dapat dibuka. Silakan coba lagi.');
          this.opening.set(false);
        },
      });
  }
  protected download() {
    const item = this.item();
    if (!item || this.opening()) return;
    this.opening.set(true);
    this.api.access(item.id, 'download').subscribe({
      next: (r) => {
        window.location.assign(r.data.url);
        this.opening.set(false);
      },
      error: () => {
        this.error.set('File tidak dapat diunduh.');
        this.opening.set(false);
      },
    });
  }
}
