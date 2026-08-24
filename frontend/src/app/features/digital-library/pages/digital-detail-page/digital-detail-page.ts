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
        <section class="state-panel" role="status" aria-live="polite">
          <span class="loader" aria-hidden="true"></span>
          <h1>Menyiapkan koleksi</h1>
          <p>Memuat detail dan informasi akses&hellip;</p>
        </section>
      }
      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }
      @if (item(); as collection) {
        <a class="back-link" routerLink="/koleksi-digital">
          <span aria-hidden="true">&larr;</span> Kembali ke koleksi
        </a>
        <div class="detail">
          @if (collection.coverUrl) {
            <div class="cover-frame">
              <img [src]="collection.coverUrl" [alt]="'Cover ' + collection.title" />
            </div>
          } @else {
            <div
              class="detail-cover-fallback"
              [class]="'detail-cover-fallback media-' + collection.media_type"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                aria-hidden="true"
              >
                <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15Z" />
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              </svg>
              <span>{{ mediaLabel(collection.media_type) }}</span>
              <strong>{{ collection.title }}</strong>
              <small>Perpustakaan Digital SDI</small>
            </div>
          }
          <article class="detail-copy">
            <p class="eyebrow">
              {{ mediaLabel(collection.media_type) }} &middot;
              {{ collection.categories?.name || 'Koleksi digital' }}
            </p>
            <h1>{{ collection.title }}</h1>
            <p class="description">{{ collection.description || 'Deskripsi belum tersedia.' }}</p>
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
              <div>
                <dt>Akses</dt>
                <dd>{{ collection.is_downloadable ? 'Baca dan unduh' : 'Baca atau tonton' }}</dd>
              </div>
            </dl>
            @if (!authStore.isAuthenticated()) {
              <aside class="notice">
                <span class="notice-icon" aria-hidden="true">i</span>
                <div>
                  <strong>Akses anggota</strong>
                  <p>Silakan masuk untuk membuka file penuh.</p>
                </div>
              </aside>
              <a class="button primary-action" routerLink="/masuk">Masuk untuk mengakses</a>
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
          </article>
        </div>
        @if (mediaUrl()) {
          <section id="digital-viewer" class="viewer" tabindex="-1" aria-labelledby="viewer-title">
            <div class="viewer-head">
              <div>
                <p class="eyebrow">Ruang baca aman</p>
                <h2 id="viewer-title">{{ collection.title }}</h2>
              </div>
            </div>
            @if (collection.media_type === 'video') {
              <video controls [src]="mediaUrl()">Browser tidak dapat memutar video ini.</video>
            } @else {
              <iframe [src]="safeMediaUrl()" title="Pembaca dokumen digital">
                <p>Dokumen tidak dapat ditampilkan. Gunakan tombol unduh bila tersedia.</p>
              </iframe>
            }
          </section>
        }
      }
    </section>
  `,
  styles: `
    :host {
      display: block;
      color: var(--color-text);
    }
    .page {
      width: min(80rem, calc(100% - 2 * var(--page-gutter)));
      min-height: 60vh;
      margin-inline: auto;
      padding-block: clamp(2rem, 5vw, 5rem) 7rem;
    }
    .back-link {
      display: inline-flex;
      gap: 0.55rem;
      align-items: center;
      margin-bottom: 2rem;
      color: var(--color-indigo);
      font-size: 0.82rem;
      font-weight: 700;
      text-decoration: none;
    }
    .back-link:hover {
      text-decoration: underline;
      text-underline-offset: 0.2rem;
    }
    .detail {
      display: grid;
      grid-template-columns: minmax(15rem, 24rem) minmax(0, 1fr);
      gap: clamp(2rem, 6vw, 6rem);
      align-items: center;
    }
    .cover-frame,
    .detail-cover-fallback {
      aspect-ratio: 0.72;
      border-radius: 0.7rem 1.4rem 1.4rem 0.7rem;
      box-shadow: -1rem 1.5rem 3rem rgb(36 68 63 / 24%);
      transform: perspective(950px) rotateY(4deg);
    }
    .cover-frame {
      overflow: hidden;
      background: var(--color-surface);
    }
    .cover-frame img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .detail-cover-fallback {
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      padding: clamp(2rem, 4vw, 3.5rem) clamp(1.4rem, 3vw, 2.4rem);
      color: #f9fffd;
      background: linear-gradient(145deg, #477f79, #315e57);
    }
    .detail-cover-fallback::before {
      position: absolute;
      inset-block: 0;
      left: 0;
      width: 0.9rem;
      border-right: 1px solid rgb(255 255 255 / 22%);
      background: rgb(0 0 0 / 14%);
      content: '';
    }
    .detail-cover-fallback.media-module {
      background: linear-gradient(145deg, #9d825e, #64513b);
    }
    .detail-cover-fallback.media-video {
      background: linear-gradient(145deg, #52768a, #304c5a);
    }
    .detail-cover-fallback svg {
      width: 3.5rem;
    }
    .detail-cover-fallback span,
    .detail-cover-fallback small {
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      opacity: 0.86;
    }
    .detail-cover-fallback strong {
      max-width: 11ch;
      font-size: clamp(1.4rem, 3vw, 2.25rem);
      line-height: 1.12;
    }
    .detail-copy {
      min-width: 0;
    }
    .eyebrow {
      margin: 0;
      color: var(--color-indigo);
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.11em;
      text-transform: uppercase;
    }
    h1 {
      max-width: 16ch;
      margin: 0.75rem 0 1.25rem;
      color: var(--color-text);
      font-size: clamp(2.35rem, 5vw, 5rem);
      letter-spacing: -0.055em;
      line-height: 1.02;
      text-wrap: balance;
    }
    .description {
      max-width: 42rem;
      color: var(--color-text-secondary);
      font-size: 1rem;
      line-height: 1.75;
    }
    dl {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      margin-block: 2rem;
      border-block: 1px solid var(--color-border);
    }
    dl div {
      display: grid;
      gap: 0.2rem;
      padding: 1rem 0.5rem;
      border-bottom: 1px solid var(--color-border);
    }
    dl div:nth-last-child(-n + 2) {
      border-bottom: 0;
    }
    dt {
      color: var(--color-text-muted);
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.07em;
      text-transform: uppercase;
    }
    dd {
      margin: 0;
      color: var(--color-text);
      font-size: 0.88rem;
      font-weight: 600;
    }
    .actions {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .primary-action {
      margin-top: 1rem;
    }
    .notice {
      display: flex;
      gap: 0.8rem;
      align-items: flex-start;
      margin-top: 1.5rem;
      padding: 1rem;
      border: 1px solid var(--color-border-strong);
      border-radius: 1rem;
      background: var(--color-brand-50);
      color: var(--color-text);
    }
    .notice-icon {
      display: grid;
      place-items: center;
      flex: 0 0 auto;
      width: 1.6rem;
      height: 1.6rem;
      border-radius: 50%;
      background: var(--color-action-primary);
      color: var(--color-text-inverse);
      font-weight: 800;
    }
    .notice p {
      margin: 0.15rem 0 0;
      color: var(--color-text-secondary);
      font-size: 0.8rem;
    }
    .viewer {
      margin-top: clamp(4rem, 8vw, 7rem);
      padding: clamp(1rem, 3vw, 2rem);
      border: 1px solid var(--color-border);
      border-radius: 1.5rem;
      background: var(--color-surface);
      box-shadow: var(--shadow-md);
    }
    .viewer:focus {
      outline: 0.2rem solid var(--color-focus-outer);
      outline-offset: 0.35rem;
    }
    .viewer-head {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: end;
      margin-bottom: 1.3rem;
    }
    .viewer-head h2 {
      margin: 0.3rem 0 0;
      font-size: clamp(1.3rem, 2.5vw, 2rem);
    }
    .viewer-head a {
      color: var(--color-indigo);
      font-size: 0.78rem;
      font-weight: 700;
    }
    .viewer video,
    .viewer iframe {
      width: 100%;
      min-height: 32rem;
      border: 0;
      border-radius: 1rem;
      background: #101514;
    }
    .state-panel {
      display: grid;
      place-items: center;
      min-height: 24rem;
      text-align: center;
    }
    .state-panel h1 {
      margin: 1rem 0 0.25rem;
      font-size: 1.6rem;
    }
    .state-panel p {
      margin: 0;
      color: var(--color-text-secondary);
    }
    .loader {
      width: 2.5rem;
      height: 2.5rem;
      border: 0.2rem solid var(--color-brand-100);
      border-top-color: var(--color-action-primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    .error {
      max-width: 48rem;
      margin: 0 auto 2rem;
      padding: 1rem;
      border: 1px solid color-mix(in srgb, var(--color-danger) 25%, transparent);
      border-radius: 1rem;
      background: var(--color-danger-surface);
      color: var(--color-danger);
    }
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
    @media (max-width: 40rem) {
      .page {
        width: min(100% - 2rem, 80rem);
      }
      .detail {
        grid-template-columns: 1fr;
      }
      .cover-frame,
      .detail-cover-fallback {
        width: min(75vw, 19rem);
        margin-inline: auto;
      }
      .viewer-head {
        align-items: flex-start;
        flex-direction: column;
      }
      .viewer video,
      .viewer iframe {
        min-height: min(70svh, 32rem);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .loader {
        animation-duration: 2s;
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
      next: (response) => {
        this.item.set(response.data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Koleksi tidak ditemukan atau belum diterbitkan.');
        this.loading.set(false);
      },
    });
  }

  protected mediaLabel(type: DigitalCollection['media_type']) {
    return ({ ebook: 'E-book', module: 'Modul', video: 'Video' } as const)[type];
  }

  protected open() {
    const item = this.item();
    if (!item || this.opening()) return;
    this.opening.set(true);
    this.api.access(item.id, item.media_type === 'video' ? 'play' : 'view').subscribe({
      next: (response) => {
        this.mediaUrl.set(response.data.url);
        this.safeMediaUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(response.data.url));
        this.opening.set(false);
        this.focusViewer();
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
      next: (response) => {
        window.location.assign(response.data.url);
        this.opening.set(false);
      },
      error: () => {
        this.error.set('File tidak dapat diunduh.');
        this.opening.set(false);
      },
    });
  }

  private focusViewer() {
    setTimeout(() => {
      const viewer = document.getElementById('digital-viewer');
      viewer?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
      viewer?.focus?.({ preventScroll: true });
    });
  }
}
