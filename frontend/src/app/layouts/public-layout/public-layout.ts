import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { roleHomePath } from '../../core/auth/auth.models';
import { AuthStore } from '../../core/auth/auth.store';
import { NotificationBanner } from '../../shared/components/notification-banner/notification-banner';

@Component({
  selector: 'sdi-public-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, NotificationBanner],
  template: `
    <a class="skip-link" href="#main-content">Lewati ke konten utama</a>
    <header class="site-header">
      <nav class="site-nav" aria-label="Navigasi utama">
        <a class="app-brand" routerLink="/" (click)="closeNavigation()">
          <img class="app-brand__mark" src="/sdi_logo.png" alt="" aria-hidden="true" />
          <span>SDI <small>Digital Library</small></span>
        </a>
        <button
          class="menu-button button button--tertiary"
          type="button"
          aria-controls="public-navigation"
          [attr.aria-expanded]="navigationOpen()"
          (click)="toggleNavigation()"
        >
          <span class="menu-icon" aria-hidden="true"></span>
          <span>{{ navigationOpen() ? 'Tutup' : 'Menu' }}</span>
        </button>
        <div id="public-navigation" class="links" [class.links--open]="navigationOpen()">
          <a
            routerLink="/"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: true }"
            (click)="closeNavigation()"
            >Beranda</a
          >
          <a routerLink="/katalog" routerLinkActive="active" (click)="closeNavigation()">Katalog</a>
          <a routerLink="/koleksi-digital" routerLinkActive="active" (click)="closeNavigation()"
            >Koleksi digital</a
          >
          @if (authStore.currentRole(); as role) {
            <a class="button" [routerLink]="roleHomePath(role)" (click)="closeNavigation()"
              >Dashboard</a
            >
          } @else {
            <a class="button" routerLink="/masuk" (click)="closeNavigation()">Masuk</a>
          }
        </div>
      </nav>
    </header>
    <sdi-notification-banner />
    <main id="main-content" tabindex="-1"><router-outlet /></main>
    <footer><p>SDI Digital Library · Akses pengetahuan untuk warga sekolah</p></footer>
  `,
  styles: `
    :host {
      display: grid;
      min-height: 100dvh;
      grid-template-rows: auto auto 1fr auto;
    }
    .site-header {
      position: sticky;
      top: 0;
      z-index: var(--z-header);
      border-bottom: var(--border-width) solid var(--color-brand-divider);
      background: var(--color-brand-950);
      color: var(--color-text-inverse);
    }
    .site-nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-4);
      width: min(var(--container-content), calc(100% - 2 * var(--page-gutter)));
      min-height: var(--header-height);
      margin-inline: auto;
    }
    .links {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }
    .links > a:not(.button) {
      min-height: var(--control-height);
      padding: var(--space-3);
      border-radius: var(--radius-md);
      font-weight: var(--weight-semibold);
      text-decoration: none;
    }
    .links > a:not(.button):hover {
      background: var(--color-brand-800);
    }
    .links > a.active:not(.button) {
      background: var(--color-brand-800);
      box-shadow: inset 0 calc(-1 * var(--border-width-accent)) 0 var(--color-brand-100);
    }
    .menu-button {
      display: none;
      color: var(--color-text-inverse);
    }
    footer {
      padding: var(--space-4) var(--page-gutter);
      border-top: var(--border-width) solid var(--color-border);
      background: var(--color-surface);
      color: var(--color-text-muted);
      text-align: center;
    }
    footer p {
      margin: 0;
    }
    @media (max-width: 36rem) {
      .site-nav {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        padding-block: var(--space-2);
      }
      .menu-button {
        display: inline-flex;
      }
      .links {
        display: none;
        grid-column: 1 / -1;
        align-items: stretch;
        grid-template-columns: 1fr;
        gap: var(--space-1);
        width: 100%;
        padding-block: var(--space-2);
      }
      .links--open {
        display: grid;
      }
      .links > a {
        width: 100%;
      }
      .links > a:not(.button) {
        display: flex;
        align-items: center;
      }
      .links > a.active:not(.button) {
        box-shadow: inset var(--border-width-accent) 0 0 var(--color-brand-100);
      }
    }
  `,
})
export class PublicLayout {
  protected readonly authStore = inject(AuthStore);
  protected readonly roleHomePath = roleHomePath;
  protected readonly navigationOpen = signal(false);

  protected toggleNavigation(): void {
    this.navigationOpen.update((open) => !open);
  }

  protected closeNavigation(): void {
    this.navigationOpen.set(false);
  }
}
