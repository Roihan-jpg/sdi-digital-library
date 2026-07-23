import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { roleHomePath } from '../../../../core/auth/auth.models';
import { AuthStore } from '../../../../core/auth/auth.store';

@Component({
  selector: 'sdi-forbidden-page',
  imports: [RouterLink],
  template: `
    <section
      class="page page--reading access-page"
      aria-labelledby="forbidden-title"
      aria-describedby="forbidden-description"
      role="status"
      aria-live="polite"
    >
      <div class="content-state card card--indexed">
        <p class="eyebrow">Akses dibatasi</p>
        <h1 id="forbidden-title">Akun Anda belum memiliki izin untuk halaman ini</h1>
        <p id="forbidden-description" class="access-page__description">
          Layanan dashboard yang dapat dibuka mengikuti izin akun aktif. Gunakan jalur yang tersedia
          atau masuk dengan akun lain bila diperlukan.
        </p>
        <div class="access-page__actions" aria-label="Aksi berikutnya">
          @if (dashboardPath(); as path) {
            <a class="button" [routerLink]="path">Buka dashboard saya</a>
          } @else {
            <a class="button" routerLink="/masuk">Masuk ke akun</a>
          }
          <a class="button button--secondary" routerLink="/katalog">Lihat katalog</a>
        </div>
      </div>
    </section>
  `,
  styles: `
    .access-page {
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

    .access-page__description {
      color: var(--color-text-muted);
      line-height: var(--leading-body);
    }

    .access-page__actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
      margin-top: var(--space-2);
    }

    @media (max-width: 36rem) {
      .access-page {
        min-height: auto;
      }

      .access-page__actions,
      .access-page__actions .button {
        width: 100%;
      }
    }
  `,
})
export class ForbiddenPage {
  private readonly authStore = inject(AuthStore);

  protected readonly dashboardPath = computed(() => {
    const role = this.authStore.currentRole();
    return role ? roleHomePath(role) : null;
  });
}
