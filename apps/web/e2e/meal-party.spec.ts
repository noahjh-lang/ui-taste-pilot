import { expect, test } from '@playwright/test';
import { joinAsGuest, login } from './helpers';

test('a guest joins through an invite as a lite account and appears in the safety summary', async ({
  page,
}) => {
  await joinAsGuest(page, 'friday-group', 'Dana', "I'm allergic to sesame");
  const summary = page.getByRole('region', { name: 'Group safety summary' });
  await expect(summary.getByText('Sesame', { exact: true })).toBeVisible();
  await expect(summary.getByText('Dana')).toBeVisible();
  // A guest only sees their own party.
  await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link')).toHaveText([
    'TastePilot',
    'Your party',
  ]);
  await page.goto('/home');
  await expect(page).toHaveURL(/\/party\/pty_friday\/?$/);
});

test('a potluck dish that conflicts with a member is flagged', async ({ page }) => {
  await login(page);
  await page.goto('/party/pty_friday');
  await page.getByRole('button', { name: 'Bring a dish' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Dish').fill('Shrimp cocktail');
  await dialog.getByLabel('Ingredients').fill('shrimp, lemon, mayonnaise');
  await dialog.getByRole('button', { name: 'Check and add' }).click();
  const row = page
    .getByRole('region', { name: 'Potluck' })
    .getByRole('listitem')
    .filter({ hasText: 'Shrimp cocktail' });
  await expect(row.getByRole('status')).toHaveAttribute('data-safety-status', 'conflict');
  await expect(row).toContainText('conflicts with Priya Shah’s shellfish');
});

test('claiming a lite account keeps its history and party', async ({ page }) => {
  await joinAsGuest(page, 'friday-group', 'Dana', "I'm allergic to sesame");
  await page.getByRole('link', { name: 'Save profile' }).click();
  await page.getByLabel('Email').fill('dana@example.org');
  await page.getByLabel('Choose a password').fill('a-long-password');
  await page.getByRole('button', { name: 'Save my profile' }).click();
  await expect(page).toHaveURL(/\/profile\/?\?welcome=1/);
  await expect(
    page
      .getByRole('region', { name: 'Allergies & dietary restrictions' })
      .getByRole('listitem')
      .filter({ hasText: 'Sesame' }),
  ).toBeVisible();
  await page.goto('/party');
  await expect(page.getByRole('link', { name: 'Friday Potluck' })).toBeVisible();
});

test('revoking one invite link leaves the other working', async ({ page }) => {
  await login(page);
  await page.goto('/party/pty_friday');
  const links = page.getByRole('region', { name: 'Invite links' });
  await links
    .getByRole('listitem')
    .filter({ hasText: 'For Lena' })
    .getByRole('button', { name: 'Revoke' })
    .click();
  await page.getByRole('dialog').getByRole('button', { name: 'Revoke link' }).click();
  await expect(links.getByRole('listitem').filter({ hasText: 'For Lena' })).toContainText(
    'Revoked',
  );

  // Log out (same browser, so the same stub backend data) and try both links as a guest.
  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.getByRole('menuitem', { name: 'Log out' }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto('/invite/friday-lena');
  await expect(page.getByText('This link was turned off')).toBeVisible();
  await page.goto('/invite/friday-group');
  await expect(page.getByRole('button', { name: 'Join as a guest' })).toBeVisible();
});

test('a likely duplicate guest gets a dismissible hint, not a block', async ({ page }) => {
  await joinAsGuest(page, 'friday-group', 'Chris');
  await expect(page.getByText(/Did you already join as/)).toBeVisible();
  await page.getByRole('button', { name: 'No, I’m new' }).click();
  await expect(page.getByText(/Did you already join as/)).toBeHidden();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Friday Potluck');
});
