import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'sdi-home-page',
  imports: [RouterLink],
  template: `
    <section class="home" aria-labelledby="home-title">
      <div class="hero">
        <div class="hero__content">
          <p class="eyebrow">Perpustakaan sekolah</p>
          <h1 id="home-title">SDI Digital Library</h1>
          <p class="lead">
            Temukan buku perpustakaan, baca koleksi digital yang tersedia, dan masuk sebagai anggota
            untuk mengakses layanan sekolah.
          </p>
          <div class="actions" aria-label="Aksi utama beranda">
            <a class="button" routerLink="/katalog">Lihat katalog</a>
            <a class="button button--secondary" routerLink="/koleksi-digital"
              >Buka koleksi digital</a
            >
            <a class="button button--tertiary hero__login" routerLink="/masuk">Masuk anggota</a>
          </div>
        </div>

        <aside class="quick-panel" aria-labelledby="quick-panel-title">
          <p class="quick-panel__label">Jalur cepat</p>
          <h2 id="quick-panel-title">Mulai dari kebutuhanmu hari ini.</h2>
          <div class="quick-panel__links">
            <a routerLink="/katalog">
              <strong>Cari buku fisik</strong>
              <span>Lihat judul dan ketersediaan sebelum datang ke perpustakaan.</span>
            </a>
            <a routerLink="/koleksi-digital">
              <strong>Baca koleksi digital</strong>
              <span>Jelajahi e-book, modul, audio, dan video yang dipublikasikan.</span>
            </a>
            <a routerLink="/masuk">
              <strong>Masuk ke akun</strong>
              <span>Akses layanan anggota sesuai peran dan akun sekolah.</span>
            </a>
          </div>
        </aside>
      </div>

      <section class="services" aria-labelledby="services-title">
        <div class="section-heading">
          <p class="eyebrow">Layanan utama</p>
          <h2 id="services-title">Satu pintu untuk membaca dan mengelola akses perpustakaan.</h2>
        </div>
        <div class="service-grid">
          <article>
            <span class="service-index" aria-hidden="true">Katalog</span>
            <h3>Buku fisik</h3>
            <p>
              Cari judul, penulis, kategori, dan informasi ketersediaan koleksi perpustakaan
              sekolah.
            </p>
          </article>
          <article>
            <span class="service-index" aria-hidden="true">Digital</span>
            <h3>Koleksi digital</h3>
            <p>
              Buka metadata koleksi yang dipublikasikan dan akses file sesuai izin akun anggota.
            </p>
          </article>
          <article>
            <span class="service-index" aria-hidden="true">Anggota</span>
            <h3>Akses warga sekolah</h3>
            <p>
              Siswa, guru, dan petugas masuk untuk menggunakan layanan sesuai peran masing-masing.
            </p>
          </article>
        </div>
      </section>
    </section>
  `,
  styles: `
    .home {
      width: min(var(--container-content), calc(100% - 2 * var(--page-gutter)));
      margin-inline: auto;
      padding-block: var(--space-10) var(--space-12);
    }

    .hero {
      min-height: clamp(31rem, 62dvh, 38rem);
      display: grid;
      grid-template-columns: minmax(0, 1.15fr) minmax(18rem, 0.85fr);
      align-items: center;
      gap: var(--space-10);
    }

    .hero__content {
      display: grid;
      gap: var(--space-5);
      min-width: 0;
    }

    h1,
    h2,
    h3,
    p {
      margin: 0;
    }

    h1 {
      max-width: 12ch;
      color: var(--color-brand-950);
      font-size: var(--text-4xl);
      line-height: var(--leading-tight);
    }

    .lead {
      max-width: 40rem;
      color: var(--color-text-muted);
      font-size: var(--text-lg);
      line-height: var(--leading-body);
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
      align-items: center;
    }

    .hero__login {
      color: var(--color-brand-800);
    }

    .quick-panel {
      display: grid;
      gap: var(--space-5);
      padding: var(--space-6);
      border: var(--border-width) solid var(--color-border);
      border-inline-start: var(--border-width-accent) solid var(--color-brand-700);
      border-radius: var(--radius-lg);
      background: var(--color-surface);
      box-shadow: var(--shadow-md);
    }

    .quick-panel__label,
    .service-index {
      color: var(--color-brand-700);
      font-size: var(--text-xs);
      font-weight: var(--weight-extrabold);
      letter-spacing: var(--tracking-wide);
      text-transform: uppercase;
    }

    .quick-panel h2 {
      color: var(--color-brand-950);
      font-size: var(--text-2xl);
    }

    .quick-panel__links {
      display: grid;
      gap: var(--space-3);
    }

    .quick-panel__links a {
      display: grid;
      gap: var(--space-1);
      min-height: var(--control-height);
      padding: var(--space-4);
      border: var(--border-width) solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-surface);
      color: var(--color-text);
      text-decoration: none;
      transition:
        border-color var(--duration-fast) var(--ease-standard),
        background-color var(--duration-fast) var(--ease-standard),
        transform var(--duration-fast) var(--ease-standard);
    }

    .quick-panel__links a:hover,
    .quick-panel__links a:focus-visible {
      border-color: var(--color-border-strong);
      background: var(--color-brand-50);
      transform: translateY(-1px);
    }

    .quick-panel__links strong {
      color: var(--color-brand-950);
      font-weight: var(--weight-bold);
    }

    .quick-panel__links span {
      color: var(--color-text-muted);
      font-size: var(--text-sm);
      line-height: var(--leading-body);
    }

    .services {
      display: grid;
      gap: var(--space-6);
      padding-block-start: var(--space-8);
    }

    .section-heading {
      display: grid;
      gap: var(--space-2);
      max-width: var(--container-reading);
    }

    .section-heading h2 {
      color: var(--color-brand-950);
    }

    .service-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: var(--space-4);
    }

    .service-grid article {
      display: grid;
      gap: var(--space-3);
      padding: var(--space-5);
      border: var(--border-width) solid var(--color-border);
      border-top: var(--border-width-accent) solid var(--color-brand-700);
      border-radius: var(--radius-lg);
      background: var(--color-surface);
    }

    .service-grid h3 {
      color: var(--color-brand-950);
      font-size: var(--text-xl);
    }

    .service-grid p {
      color: var(--color-text-muted);
      line-height: var(--leading-body);
    }

    @media (prefers-reduced-motion: reduce) {
      .quick-panel__links a:hover,
      .quick-panel__links a:focus-visible {
        transform: none;
      }
    }

    @media (max-width: 64rem) {
      .hero {
        grid-template-columns: 1fr;
        min-height: auto;
        padding-block: var(--space-8);
      }

      h1 {
        max-width: 14ch;
      }

      .service-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 36rem) {
      .home {
        padding-block: var(--space-8);
      }

      .hero {
        gap: var(--space-6);
        padding-block: var(--space-4) var(--space-6);
      }

      .actions,
      .actions .button {
        width: 100%;
      }

      .quick-panel,
      .service-grid article {
        padding: var(--space-4);
      }

      .quick-panel h2 {
        font-size: var(--text-xl);
      }
    }
  `,
})
export class HomePage {}
