import axe, { type Result } from 'axe-core';

const wcagTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] as const;

export async function axeViolations(root: Element): Promise<Result[]> {
  const result = await axe.run(root, {
    runOnly: { type: 'tag', values: [...wcagTags] },
    rules: {
      // jsdom has no layout engine, so contrast is verified in the browser pass.
      'color-contrast': { enabled: false },
    },
  });
  return result.violations;
}
