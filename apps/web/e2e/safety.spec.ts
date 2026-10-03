import { expect, test } from '@playwright/test';
import { login, mockControls, safetyIn } from './helpers';

// RELEASE-BLOCKING: safety is never shown as "safe" unless the server said so.
test.describe('recipe safety', () => {
  test('is unverified, never safe, while the check is still loading', async ({ page }) => {
    await mockControls(page, { hang: ['/safety'] });
    await login(page);
    await page.goto('/recipes/thai-basil-chicken');
    const badge = safetyIn(page, 'Safety for you');
    await expect(badge).toHaveAttribute('data-safety-status', 'unverified');
    await expect(badge).not.toContainText('Safe');
  });

  test('is unverified with a retry when the check fails', async ({ page }) => {
    test.slow(); // TanStack Query retries with backoff before giving up.
    await mockControls(page, { fail: ['/safety'] });
    await login(page);
    await page.goto('/recipes/thai-basil-chicken');
    await expect(page.getByRole('button', { name: 'Retry safety check' })).toBeVisible({
      timeout: 20_000,
    });
    await expect(safetyIn(page, 'Safety for you')).toHaveAttribute(
      'data-safety-status',
      'unverified',
    );
  });

  test('shows the server result once it arrives', async ({ page }) => {
    await login(page);
    await page.goto('/recipes/thai-basil-chicken');
    await expect(safetyIn(page, 'Safety for you')).toHaveAttribute('data-safety-status', 'safe');
    await page.goto('/recipes/pesto-pasta');
    await expect(safetyIn(page, 'Safety for you')).toHaveAttribute(
      'data-safety-status',
      'conflict',
    );
    await expect(
      page.getByRole('region', { name: 'Safety for you' }).getByText(/pine nuts/),
    ).toBeVisible();
  });

  test('an unmapped ingredient is unverified, not safe', async ({ page }) => {
    await login(page);
    await page.goto('/recipes/pad-thai');
    await expect(safetyIn(page, 'Safety for you')).toHaveAttribute(
      'data-safety-status',
      'unverified',
    );
    await expect(
      page.getByRole('region', { name: 'Safety for you' }).getByText(/tamarind paste/),
    ).toBeVisible();
  });
});

test('"allergic to nuts" is not guessed: we ask tree nuts or peanuts', async ({ page }) => {
  await login(page);
  await page.goto('/profile');
  await page.getByLabel('Tell us in your own words').fill("I'm allergic to nuts");
  await page.getByRole('button', { name: 'Check what we understood' }).click();
  await expect(page.getByText(/tree nuts, peanuts, or both/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save to my profile' })).toBeDisabled();
});

test.describe('party safety summary', () => {
  test('says unverified, never a blank, while the summary loads', async ({ page }) => {
    await mockControls(page, { hang: ['/safety-summary'] });
    await login(page);
    await page.goto('/party/pty_friday');
    const summary = page.getByRole('region', { name: 'Group safety summary' });
    await expect(summary.getByRole('status').first()).toHaveAttribute(
      'data-safety-status',
      'unverified',
    );
    await expect(summary).toContainText('Loading the group’s allergies and diets');
  });

  test('tells the host to treat dishes as unverified when it fails', async ({ page }) => {
    test.slow();
    await mockControls(page, { fail: ['/safety-summary'] });
    await login(page);
    await page.goto('/party/pty_friday');
    const summary = page.getByRole('region', { name: 'Group safety summary' });
    await expect(summary).toContainText('treat every dish as unverified', { timeout: 20_000 });
    await expect(summary.getByRole('button', { name: 'Retry safety check' })).toBeVisible();
  });
});
