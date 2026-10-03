import { expect, test } from '@playwright/test';

test('landing page renders', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Meal planning');
});

const APP_ROUTES = [
  ['/home', 'Home'],
  ['/search', 'Search'],
  ['/discover', 'Discover'],
  ['/party/demo', 'Meal Party'],
  ['/profile', 'Profile'],
  ['/food-history', 'Food history'],
  ['/pantry', 'Pantry'],
  ['/restaurants', 'Restaurants'],
  ['/cookbook', 'Cookbook'],
  ['/calendar', 'Calendar'],
] as const;

for (const [path, heading] of APP_ROUTES) {
  test(`app route ${path} renders inside the app shell`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
  });
}

test('recipe safety is unverified, never safe, when the backend has not answered', async ({
  page,
}) => {
  // Hold the safety request open so the query stays pending.
  await page.route('**/recipes/*/safety', () => {});
  await page.goto('/recipes/42');
  const badge = page.getByRole('status');
  await expect(badge).toHaveAttribute('data-safety-status', 'unverified');
  await expect(badge).not.toContainText('Safe');
});

test('recipe safety renders the status the backend returned', async ({ page }) => {
  await page.route('**/recipes/*/safety', (route) =>
    route.fulfill({ json: { status: 'conflict' } }),
  );
  await page.goto('/recipes/42');
  await expect(page.getByRole('status')).toHaveAttribute('data-safety-status', 'conflict');
});
