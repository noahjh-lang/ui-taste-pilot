import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RecipeCard, ScoreBreakdown } from './recipe';

const recipe = {
  id: 'r1',
  title: 'Thai Basil Chicken',
  description: 'Spicy',
  cuisine: 'thai',
  timeMinutes: 20,
  emoji: '🌶️',
  color: '#fecaca',
  rating: { average: 4.7, count: 10 },
};

// RELEASE-BLOCKING: every consumer of a safety result renders unverified,
// never safe, while the result is missing, loading or failed.
describe('RecipeCard safety', () => {
  it.each([
    ['missing', { status: null }],
    ['loading', { status: undefined, pending: true }],
    ['failed', { status: undefined, error: true }],
    ['loading with stale safe', { status: 'safe' as const, pending: true }],
  ])('renders unverified when the result is %s', (_, safety) => {
    render(<RecipeCard recipe={recipe} href="/recipes/r1" safety={safety} />);
    expect(screen.getByRole('status')).toHaveAttribute('data-safety-status', 'unverified');
  });

  it('links the title to the recipe', () => {
    render(
      <RecipeCard recipe={recipe} href="/recipes/r1" safety={{ status: 'safe' }} score={0.5} />,
    );
    expect(screen.getByRole('link', { name: 'Thai Basil Chicken' })).toHaveAttribute(
      'href',
      '/recipes/r1',
    );
    expect(screen.getByText('75% match')).toBeInTheDocument();
  });
});

describe('ScoreBreakdown', () => {
  it('lists every weighted component with its explanation', () => {
    render(
      <ScoreBreakdown
        total={0.4}
        components={[
          {
            key: 'taste',
            label: 'Your taste',
            weight: 0.5,
            value: 0.6,
            contribution: 0.3,
            explanation: 'You like thai.',
          },
          {
            key: 'freshness',
            label: 'Variety',
            weight: 0.15,
            value: -0.6,
            contribution: -0.09,
            explanation: 'Had it recently.',
          },
        ]}
      />,
    );
    expect(screen.getByText('70%')).toBeInTheDocument();
    expect(screen.getByText('You like thai.')).toBeInTheDocument();
    expect(screen.getByText('Had it recently.')).toBeInTheDocument();
  });
});
