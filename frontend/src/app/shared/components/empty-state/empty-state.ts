import { Component, input } from '@angular/core';

@Component({
  selector: 'sdi-empty-state',
  template: `
    <section class="content-state" aria-live="polite">
      <span class="empty-state__mark" aria-hidden="true"></span>
      <h2>{{ title() }}</h2>
      <p class="content-state__description">{{ description() }}</p>
      <ng-content />
    </section>
  `,
  styles: `
    .empty-state__mark {
      width: var(--space-10);
      height: var(--border-width-accent);
      border-radius: var(--radius-pill);
      background: var(--color-brand-700);
    }
  `,
})
export class EmptyState {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
}
