import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthStore } from '../../core/auth/auth.store';
import { NotificationBanner } from '../../shared/components/notification-banner/notification-banner';

@Component({
  selector: 'sdi-dashboard-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, NotificationBanner],
  template: `
    <div class="shell">
      <aside>
        <a class="brand" routerLink="/dashboard">SDI Digital Library</a>
        <nav aria-label="Navigasi dashboard">
          <a
            routerLink="/dashboard"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: true }"
            >Ringkasan</a
          >
        </nav>
        <button type="button" (click)="logout()">Keluar</button>
      </aside>
      <section class="content">
        <sdi-notification-banner />
        <main id="main-content" tabindex="-1"><router-outlet /></main>
      </section>
    </div>
  `,
  styles: `
    .shell {
      min-height: 100dvh;
      display: grid;
      grid-template-columns: 16rem 1fr;
    }
    aside {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      padding: 1.5rem;
      background: #0e3b28;
      color: #fff;
    }
    .brand {
      font-weight: 800;
      text-decoration: none;
    }
    nav {
      display: grid;
      gap: 0.5rem;
    }
    nav a,
    button {
      padding: 0.75rem;
      border: 0;
      border-radius: 0.5rem;
      background: transparent;
      color: inherit;
      text-align: left;
      text-decoration: none;
      cursor: pointer;
    }
    nav a:hover,
    nav a.active,
    button:hover {
      background: #19543a;
    }
    button {
      margin-top: auto;
    }
    .content {
      min-width: 0;
    }
    @media (max-width: 48rem) {
      .shell {
        grid-template-columns: 1fr;
      }
      aside {
        position: static;
      }
    }
  `,
})
export class DashboardLayout {
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  protected logout(): void {
    this.authStore.clearSession();
    void this.router.navigate(['/']);
  }
}
