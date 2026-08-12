import { Component, inject } from '@angular/core';
import { AppThemeService } from '../../../core/theme/app-theme.service';

@Component({
  selector: 'sdi-theme-toggle',
  template: `
    <button
      type="button"
      [attr.aria-pressed]="theme.isDark()"
      [attr.aria-label]="theme.isDark() ? 'Gunakan tema terang' : 'Gunakan tema gelap'"
      (click)="theme.toggleTheme()"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
        @if (theme.isDark()) {
          <path
            d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"
          />
          <circle cx="12" cy="12" r="4" />
        } @else {
          <path d="M20.5 14.3A8.5 8.5 0 0 1 9.7 3.5 8.5 8.5 0 1 0 20.5 14.3Z" />
        }
      </svg>
    </button>
  `,
  styles: `
    :host {
      display: inline-grid;
    }
    button {
      display: grid;
      place-items: center;
      width: 2.5rem;
      height: 2.5rem;
      padding: 0;
      border: 1px solid var(--color-border);
      border-radius: 0.75rem;
      background: var(--color-surface);
      color: var(--color-text);
      box-shadow: var(--shadow-sm);
      cursor: pointer;
      transition:
        border-color 150ms ease,
        background-color 150ms ease,
        color 150ms ease,
        transform 150ms ease;
    }
    button:hover {
      border-color: var(--color-border-strong);
      background: var(--color-neutral-surface);
      transform: translateY(-1px);
    }
    button:active {
      transform: scale(0.98);
    }
    svg {
      width: 1.1rem;
      height: 1.1rem;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.8;
    }
    @media (prefers-reduced-motion: reduce) {
      button {
        transition: none;
      }
    }
  `,
})
export class ThemeToggle {
  protected readonly theme = inject(AppThemeService);
}
