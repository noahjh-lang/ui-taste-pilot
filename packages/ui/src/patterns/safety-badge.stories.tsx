import type { Meta, StoryObj } from '@storybook/react-vite';
import { SafetyBadge } from './safety-badge';
import { SafetyReasons } from './safety-reasons';

const meta = {
  title: 'Patterns/SafetyBadge',
  component: SafetyBadge,
  args: { status: 'safe' },
} satisfies Meta<typeof SafetyBadge>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Safe: Story = {};
export const Conflict: Story = { args: { status: 'conflict' } };
export const Unverified: Story = { args: { status: 'unverified' } };
/** No result from the server: always unverified. */
export const Missing: Story = { args: { status: null } };
/** Loading, even with a stale "safe" value: unverified. */
export const Pending: Story = { args: { status: 'safe', pending: true } };
export const Failed: Story = { args: { status: undefined, error: true, onRetry: () => undefined } };
export const Small: Story = { args: { status: 'conflict', size: 'sm' } };

export const AllStates: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <SafetyBadge status="safe" />
      <SafetyBadge status="conflict" />
      <SafetyBadge status="unverified" />
      <SafetyBadge status={null} pending />
      <SafetyBadge status={null} error onRetry={() => undefined} />
    </div>
  ),
};

export const WithReasons: Story = {
  render: () => (
    <div className="max-w-md space-y-3">
      <SafetyBadge status="conflict" />
      <SafetyReasons
        status="conflict"
        reasons={[
          {
            kind: 'conflict',
            ingredient: '1/3 cup pine nuts',
            constraintLabel: 'Tree nuts',
            memberName: null,
          },
          {
            kind: 'unmapped_ingredient',
            ingredient: '2 tbsp curry paste',
            constraintLabel: null,
            memberName: null,
          },
        ]}
      />
    </div>
  ),
};
