import { Component, input } from '@angular/core';
import type { DashboardIconName } from '../../../core/auth/access-policy';

@Component({
  selector: 'sdi-dashboard-icon',
  template: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      @switch (name()) {
        @case ('dashboard') {
          <rect x="3" y="3" width="7" height="7" rx="2" />
          <rect x="14" y="3" width="7" height="4" rx="2" />
          <rect x="14" y="11" width="7" height="10" rx="2" />
          <rect x="3" y="14" width="7" height="7" rx="2" />
        }
        @case ('users') {
          <path d="M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 20v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        }
        @case ('settings') {
          <circle cx="12" cy="12" r="3" />
          <path
            d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1 1.55V21h-4v-.08a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3v-4h.08a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3h4v.08a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.55 1H21v4h-.08a1.7 1.7 0 0 0-1.52 1Z"
          />
        }
        @case ('audit') {
          <path d="M9 11 12 14 22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        }
        @case ('system') {
          <rect x="3" y="4" width="18" height="12" rx="2" />
          <path d="M8 20h8M12 16v4M7 9h4M7 12h7" />
        }
        @case ('reports') {
          <path d="M4 19V9M10 19V5M16 19v-7M22 19V3" />
        }
        @case ('activity') {
          <path d="M3 12h4l3-8 4 16 3-8h4" />
        }
        @case ('members') {
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        }
        @case ('database') {
          <ellipse cx="12" cy="5" rx="8" ry="3" />
          <path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />
        }
        @case ('books') {
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5v13Z" />
          <path d="M8 7h8M8 11h6" />
        }
        @case ('digital') {
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <path d="M8 7h8M8 11h8M8 15h5" />
        }
        @case ('import') {
          <path d="M12 3v12M7 10l5 5 5-5M4 21h16" />
        }
        @case ('scan') {
          <path
            d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 8v8M10 8v8M14 8v8M17 8v8"
          />
        }
        @case ('catalog') {
          <circle cx="10" cy="10" r="6" />
          <path d="m15 15 6 6M7 10h6M10 7v6" />
        }
        @case ('loan') {
          <path d="M4 4h12v16H4zM8 8h4M8 12h4M18 8h2v12H8" />
        }
        @case ('reservation') {
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 10h18M8 15l2 2 5-5" />
        }
        @case ('fine') {
          <circle cx="12" cy="12" r="9" />
          <path d="M15 8.5a4 4 0 1 0 0 7M8 11h6M8 14h5" />
        }
        @case ('history') {
          <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
          <path d="M3 3v5h5M12 7v5l3 2" />
        }
      }
    </svg>
  `,
  styles: `
    :host,
    svg {
      display: block;
      width: 1.1rem;
      height: 1.1rem;
    }

    svg {
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.8;
    }
  `,
})
export class DashboardIcon {
  readonly name = input.required<DashboardIconName>();
}
