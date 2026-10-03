import { describe, expect, it } from 'vitest';
import { SAFETY_STATUSES, getSafetyDisplay, resolveSafetyStatus } from './safety';

describe('resolveSafetyStatus', () => {
  it.each([null, undefined])('treats a missing result (%s) as unverified', (status) => {
    expect(resolveSafetyStatus(status)).toBe('unverified');
  });

  it('treats a pending result as unverified, even if a stale "safe" value is present', () => {
    expect(resolveSafetyStatus('safe', { pending: true })).toBe('unverified');
  });

  it('treats a failed result as unverified, even if a stale "safe" value is present', () => {
    expect(resolveSafetyStatus('safe', { error: true })).toBe('unverified');
  });

  it.each(SAFETY_STATUSES)('passes through a server-returned "%s"', (status) => {
    expect(resolveSafetyStatus(status)).toBe(status);
  });
});

describe('getSafetyDisplay', () => {
  it('gives every status a distinct text label (never color alone)', () => {
    const labels = SAFETY_STATUSES.map((s) => getSafetyDisplay(s).label);
    expect(new Set(labels).size).toBe(SAFETY_STATUSES.length);
  });
});
