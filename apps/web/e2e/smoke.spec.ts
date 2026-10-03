import { expect, test } from '@playwright/test';
import { login } from './helpers';

test('landing page renders', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Meal planning');
});

test('signed-out visitors are sent to log in', async ({ page }) => {
  await page.goto('/home');
  await expect(page).toHaveURL(/\/login\/?\?next=/);
});

const ROUTES = [
  ['/home', /what are we cooking/],
  ['/search', /Search/],
  ['/discover', /Discover/],
  ['/party', /Meal Parties/],
  ['/create', /Create a recipe/],
  ['/food-history', /Food history/],
  ['/pantry', /Pantry/],
  ['/restaurants', /Restaurants/],
  ['/cookbook', /Community cookbook/],
  ['/calendar', /Family calendar/],
  ['/profile', /Your taste profile/],
  ['/recipes/thai-basil-chicken', /Thai Basil Chicken/],
  ['/party/pty_friday', /Friday Potluck/],
] as const;

test('every app route renders inside the app shell', async ({ page }) => {
  await login(page);
  for (const [path, heading] of ROUTES) {
    await page.goto(path);
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
  }
});

test('client-side navigation onto a dynamic route shows the real id', async ({ page }) => {
  await login(page);
  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('link', { name: 'Meal Parties' })
    .click();
  await page.getByRole('link', { name: 'Friday Potluck' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Friday Potluck');
});

test('public pages work without an account', async ({ page }) => {
  await page.goto('/r/marco-carbonara');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText("Marco's Real Carbonara");
  await page.goto('/c/priya');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Priya Shah');
});

test('unknown paths render the 404 page', async ({ page }) => {
  await page.goto('/definitely-not-a-page');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found');
});
