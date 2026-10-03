import type { Meta, StoryObj } from '@storybook/react-vite';
import { PreferenceChip, RecipeCard, RecipeGrid, ScoreBreakdown, StarRating } from './recipe';

const recipe = {
  id: 'thai-basil-chicken',
  title: 'Thai Basil Chicken',
  description: 'Pad krapow: fiery, garlicky stir-fried chicken with holy basil over jasmine rice.',
  cuisine: 'thai',
  timeMinutes: 20,
  emoji: '🌶️',
  color: '#fecaca',
  rating: { average: 4.7, count: 212 },
  author: null,
};

const meta = {
  title: 'Patterns/RecipeCard',
  component: RecipeCard,
  args: { recipe, href: '#', safety: { status: 'safe' }, score: 0.56 },
} satisfies Meta<typeof RecipeCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Safe: Story = {};
export const Conflict: Story = { args: { safety: { status: 'conflict' } } };
export const LoadingSafety: Story = { args: { safety: { status: undefined, pending: true } } };
export const NoUser: Story = { args: { safety: undefined, score: undefined } };

export const Grid: Story = {
  render: (args) => (
    <RecipeGrid>
      <RecipeCard {...args} />
      <RecipeCard {...args} safety={{ status: 'unverified' }} score={0.2} />
      <RecipeCard {...args} safety={{ status: 'conflict' }} score={-0.1} />
    </RecipeGrid>
  ),
};

export const WhyThisRecipe: Story = {
  render: () => (
    <div className="max-w-sm">
      <ScoreBreakdown
        total={0.56}
        components={[
          {
            key: 'taste',
            label: 'Your taste',
            weight: 0.5,
            value: 0.62,
            contribution: 0.31,
            explanation: 'You like thai, spicy, basil.',
          },
          {
            key: 'popularity',
            label: 'Popularity',
            weight: 0.2,
            value: 0.85,
            contribution: 0.17,
            explanation: '4.7★ from 212 ratings.',
          },
          {
            key: 'pantry',
            label: 'In your pantry',
            weight: 0.15,
            value: 0.6,
            contribution: 0.09,
            explanation: 'You have 3 of 5 key ingredients.',
          },
          {
            key: 'freshness',
            label: 'Variety',
            weight: 0.15,
            value: -0.6,
            contribution: -0.09,
            explanation: 'You had this in the last two weeks.',
          },
        ]}
      />
    </div>
  ),
};

export const Preferences: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <PreferenceChip label="Spicy" value={0.9} confidence={0.95} explicit />
      <PreferenceChip label="Cilantro" value={-0.8} confidence={0.9} explicit />
      <PreferenceChip label="Mushroom" value={0.1} confidence={0.3} explicit={false} />
      <StarRating value={4} />
    </div>
  ),
};
