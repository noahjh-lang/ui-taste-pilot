import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SafetyBadge } from './safety-badge';

// RELEASE-BLOCKING: a missing, loading, or failed safety result must never
// render as "safe". See HLD > Testing Strategy.
describe('SafetyBadge', () => {
  function badge() {
    return screen.getByRole('status');
  }

  it.each([
    ['null', { status: null }],
    ['undefined', { status: undefined }],
    ['pending', { status: undefined, pending: true }],
    ['errored', { status: undefined, error: true }],
    ['pending with a stale safe value', { status: 'safe' as const, pending: true }],
    ['errored with a stale safe value', { status: 'safe' as const, error: true }],
  ])('renders unverified, never safe, when %s', (_, props) => {
    render(<SafetyBadge {...props} />);
    expect(badge()).toHaveAttribute('data-safety-status', 'unverified');
    expect(badge()).toHaveTextContent('Unverified');
    expect(badge()).not.toHaveTextContent('Safe');
  });

  it.each([
    ['safe', 'Safe'],
    ['conflict', 'Conflict'],
    ['unverified', 'Unverified'],
  ] as const)('renders a server-returned "%s" with a text label', (status, label) => {
    render(<SafetyBadge status={status} />);
    expect(badge()).toHaveAttribute('data-safety-status', status);
    expect(badge()).toHaveTextContent(label);
  });

  it('offers a retry when the safety check failed', async () => {
    const onRetry = vi.fn();
    render(<SafetyBadge status={undefined} error onRetry={onRetry} />);
    await userEvent.click(screen.getByRole('button', { name: /retry safety check/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
