import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'sdi-home-page',
  imports: [RouterLink],
  template: `
    <section class="hero">
      <div>
        <p class="eyebrow">Perpustakaan sekolah</p>
        <h1>Buku, pengetahuan, dan layanan perpustakaan dalam satu tempat.</h1>
        <p class="lead">
          Fondasi aplikasi siap untuk katalog, sirkulasi buku, kunjungan, dan koleksi digital.
        </p>
        <div class="actions">
          <a class="button" routerLink="/katalog">Lihat katalog</a>
          <a class="button button--secondary" routerLink="/masuk">Masuk ke akun</a>
        </div>
      </div>
      <aside aria-label="Status pengembangan">
        <strong>Fondasi tahap pertama</strong>
        <p>Fitur autentikasi dan transaksi akan disambungkan pada tahap implementasi berikutnya.</p>
      </aside>
    </section>
  `,
  styles: `
    .hero {
      width: min(72rem, 100% - 2rem);
      min-height: 65dvh;
      margin: auto;
      display: grid;
      grid-template-columns: minmax(0, 1.5fr) minmax(16rem, 0.7fr);
      align-items: center;
      gap: 3rem;
      padding-block: 4rem;
    }
    h1 {
      max-width: 18ch;
      margin: 0;
      font-size: clamp(2.25rem, 5vw, 4.5rem);
      line-height: 1.05;
    }
    .lead {
      max-width: 42rem;
      color: #506158;
      font-size: 1.15rem;
      line-height: 1.65;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-top: 1.5rem;
    }
    aside {
      padding: 1.5rem;
      border: 1px solid #bdd0c4;
      border-radius: 1rem;
      background: #fff;
      box-shadow: 0 1rem 3rem rgb(23 107 67 / 8%);
    }
    aside p {
      margin-bottom: 0;
      color: #506158;
      line-height: 1.6;
    }
    @media (max-width: 48rem) {
      .hero {
        grid-template-columns: 1fr;
        gap: 2rem;
      }
    }
  `,
})
export class HomePage {}
