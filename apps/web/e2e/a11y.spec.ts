import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { login } from './helpers';

/** WCAG 2.1 AA baseline: no serious or critical axe violations on key pages. */
async function expectAccessible(page: import('@playwright/test').Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const serious = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  expect(
    serious.map(
      (v) =>
        `${v.id}: ${v.nodes
          .map((n) => n.target.join(' '))
          .slice(0, 3)
          .join(', ')}`,
    ),
  ).toEqual([]);
}

test('public pages are accessible', async ({ page }) => {
  for (const path of ['/', '/login', '/invite/friday-group']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expectAccessible(page);
  }
});

test('app pages are accessible', async ({ page }) => {
  await login(page);
  for (const path of [
    '/home',
    '/recipes/pesto-pasta',
    '/party/pty_friday',
    '/profile',
    '/calendar',
  ]) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.waitForLoadState('networkidle');
    await expectAccessible(page);
  }
});
