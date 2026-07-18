import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NotificationBanner } from '../../shared/components/notification-banner/notification-banner';

@Component({
  selector: 'sdi-public-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, NotificationBanner],
  template: `
    <a class="skip-link" href="#main-content">Lewati ke konten utama</a>
    <header>
      <nav aria-label="Navigasi utama">
        <a class="brand" routerLink="/">SDI Digital Library</a>
        <div class="links">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }"
            >Beranda</a
          >
          <a routerLink="/katalog" routerLinkActive="active">Katalog</a>
          <a class="button" routerLink="/masuk">Masuk</a>
        </div>
      </nav>
    </header>
    <sdi-notification-banner />
    <main id="main-content" tabindex="-1"><router-outlet /></main>
    <footer><p>SDI Digital Library · Fondasi aplikasi perpustakaan sekolah</p></footer>
  `,
  styles: `
    .skip-link {
      position: fixed;
      top: 0.5rem;
      left: 0.5rem;
      z-index: 10;
      padding: 0.7rem 1rem;
      background: #fff;
      transform: translateY(-150%);
    }
    .skip-link:focus {
      transform: translateY(0);
    }
    header {
      background: #0e3b28;
      color: #fff;
    }
    nav {
      width: min(72rem, 100% - 2rem);
      min-height: 4.5rem;
      margin: auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }
    .brand {
      font-weight: 800;
      text-decoration: none;
    }
    .links {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .links > a:not(.button) {
      padding-block: 0.5rem;
      text-decoration: none;
    }
    .links > a.active:not(.button) {
      text-decoration: underline;
      text-underline-offset: 0.35rem;
    }
    footer {
      padding: 1rem;
      border-top: 1px solid #d9e3dd;
      color: #506158;
      text-align: center;
    }
    @media (max-width: 36rem) {
      nav {
        align-items: flex-start;
        flex-direction: column;
        padding-block: 1rem;
      }
      .links {
        width: 100%;
        justify-content: space-between;
      }
    }
  `,
})
export class PublicLayout {}
