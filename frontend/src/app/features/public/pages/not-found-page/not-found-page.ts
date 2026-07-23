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
      display: grid;
      place-items: center;
      min-height: min(32rem, calc(100dvh - var(--header-height)));
    }

    .content-state {
      justify-items: start;
      width: 100%;
      border-inline-start: var(--border-width-accent) solid var(--color-brand-700);
      text-align: left;
    }

    .missing-page__description {
      color: var(--color-text-muted);
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
