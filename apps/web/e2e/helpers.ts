import { expect, type Page } from '@playwright/test';

export const ALEX = { email: 'alex@tastepilot.dev', password: 'tastepilot' };

/** Each Playwright test gets a fresh browser context, so the stub backend starts from its seed. */
export async function login(page: Page, who = ALEX) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(who.email);
  await page.getByLabel('Password').fill(who.password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL(/\/home\/?$/);
}

/** Make the stub backend hang or fail for matching API paths (see mock-api/src/http.ts). */
export async function mockControls(page: Page, controls: { hang?: string[]; fail?: string[] }) {
  await page.addInitScript((value) => {
    window.localStorage.setItem('tastepilot:mock-controls', value);
  }, JSON.stringify(controls));
}

export async function joinAsGuest(page: Page, token: string, name: string, note = '') {
  await page.goto(`/invite/${token}`);
  await page.getByLabel('Your name').fill(name);
  if (note) await page.getByLabel(/allergies or dietary/i).fill(note);
  await page.getByRole('button', { name: 'Join as a guest' }).click();
  await expect(page).toHaveURL(/\/party\/pty_friday\/?/);
}

/** The badge inside a given region, e.g. the "Safety for you" section. */
export const safetyIn = (page: Page, region: string) =>
  page.getByRole('region', { name: region }).getByRole('status').first();
