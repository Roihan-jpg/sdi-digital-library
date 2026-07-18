import { Component, input } from '@angular/core';

@Component({
  selector: 'sdi-empty-state',
  template: `
    <section class="empty" aria-labelledby="empty-title">
      <h2 id="empty-title">{{ title() }}</h2>
      <p>{{ description() }}</p>
    </section>
  `,
  styles: `
    .empty {
      padding: 2rem;
      border: 1px dashed #9caf9f;
      border-radius: 0.75rem;
      background: #fff;
      text-align: center;
    }
    h2 {
      margin-top: 0;
      font-size: 1.15rem;
    }
    p {
      margin-bottom: 0;
      color: #506158;
    }
  `,
})
export class EmptyState {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
}
