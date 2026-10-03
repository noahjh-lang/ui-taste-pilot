import { describe, expect, it } from 'vitest';
import {
  addDays,
  formatMinutes,
  formatRelativeDate,
  pluralize,
  scoreToPercent,
  startOfWeek,
} from './format';

describe('format helpers', () => {
  it('maps scores to a clamped 0-100 match', () => {
    expect(scoreToPercent(-1)).toBe(0);
    expect(scoreToPercent(0)).toBe(50);
    expect(scoreToPercent(1)).toBe(100);
    expect(scoreToPercent(3)).toBe(100);
  });

  it('formats minutes', () => {
    expect(formatMinutes(25)).toBe('25 min');
    expect(formatMinutes(60)).toBe('1 h');
    expect(formatMinutes(95)).toBe('1 h 35 min');
  });

  it('formats relative dates', () => {
    const now = new Date('2026-10-03T15:00:00');
    expect(formatRelativeDate('2026-10-03', now)).toBe('today');
    expect(formatRelativeDate('2026-10-02', now)).toBe('yesterday');
    expect(formatRelativeDate('2026-09-30', now)).toBe('3 days ago');
    expect(formatRelativeDate('2026-10-06', now)).toBe('in 3 days');
  });

  it('does date arithmetic on local dates', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(startOfWeek('2026-10-03')).toBe('2026-09-28'); // Saturday -> Monday
  });

  it('pluralizes', () => {
    expect(pluralize(1, 'dish')).toBe('1 dish');
    expect(pluralize(2, 'dish', 'dishes')).toBe('2 dishes');
  });
});
