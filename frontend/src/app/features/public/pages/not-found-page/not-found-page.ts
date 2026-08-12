import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { roleHomePath } from '../../../../core/auth/auth.models';
import { AuthStore } from '../../../../core/auth/auth.store';

@Component({
  selector: 'sdi-not-found-page',
  imports: [RouterLink],
  template: `
    <section
      class="page page--reading missing-page"
      aria-labelledby="not-found-title"
      aria-describedby="not-found-description"
      role="status"
      aria-live="polite"
    >
      <div class="content-state card card--indexed">
        <span class="missing-page__code" aria-hidden="true">404</span>
        <p class="eyebrow">Halaman tidak ditemukan</p>
        <h1 id="not-found-title">Alamat ini tidak tersedia</h1>
        <p id="not-found-description" class="missing-page__description">
          Tautan mungkin berubah atau alamatnya tidak lengkap. Pilih jalur utama perpustakaan untuk
          melanjutkan.
        </p>
        <div class="missing-page__actions" aria-label="Aksi berikutnya">
          <a class="button" routerLink="/">Ke beranda</a>
          <a class="button button--secondary" routerLink="/katalog">Lihat katalog</a>
          <a class="button button--secondary" routerLink="/koleksi-digital">Koleksi digital</a>
          @if (accountPath(); as path) {
            <a class="button button--tertiary" [routerLink]="path">{{ accountActionLabel() }}</a>
          }
        </div>
      </div>
    </section>
  `,
  styles: `
    .missing-page {
      position: relative;
      display: grid;
      place-items: center;
      min-height: min(40rem, calc(100dvh - var(--header-height)));
      overflow: hidden;
      padding-block: clamp(3rem, 9vw, 8rem);
    }

    .content-state {
      position: relative;
      justify-items: start;
      width: 100%;
      max-width: 58rem;
      overflow: hidden;
      padding: clamp(2rem, 6vw, 5rem);
      border: 1px solid var(--color-border-strong);
      border-radius: 1.5rem;
      background:
        radial-gradient(circle at 92% 10%, var(--color-accent-cream), transparent 13rem),
        linear-gradient(135deg, var(--color-surface), var(--color-brand-50));
      box-shadow: var(--shadow-lg);
      text-align: left;
    }

    .missing-page__code {
      position: absolute;
      right: -0.04em;
      bottom: -0.28em;
      color: color-mix(in srgb, var(--color-accent) 16%, transparent);
      font-size: clamp(10rem, 25vw, 20rem);
      font-weight: 800;
      letter-spacing: -0.1em;
      line-height: 1;
      pointer-events: none;
    }

    h1,
    .eyebrow,
    .missing-page__description,
    .missing-page__actions {
      position: relative;
      z-index: 1;
    }

    h1 {
      max-width: 13ch;
      font-size: clamp(2.4rem, 6vw, 5rem);
      letter-spacing: -0.05em;
      line-height: 1;
    }

    .missing-page__description {
      color: var(--color-text-muted);
      max-width: 38rem;
      line-height: var(--leading-body);
    }

    .missing-page__actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
      margin-top: var(--space-2);
    }

    @media (max-width: 36rem) {
      .missing-page {
        min-height: auto;
      }

      .missing-page__actions,
      .missing-page__actions .button {
        width: 100%;
      }
    }
  `,
})
export class NotFoundPage {
  private readonly authStore = inject(AuthStore);

  protected readonly accountPath = computed(() => {
    const role = this.authStore.currentRole();
    return role ? roleHomePath(role) : '/masuk';
  });

  protected readonly accountActionLabel = computed(() =>
    this.authStore.currentRole() ? 'Buka dashboard' : 'Masuk anggota',
  );
}
