import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Button } from './button';
import { Badge, Card, CardHeader, EmptyState, ErrorState, Skeleton } from './display';
import { Field, Input, Select, Switch, Textarea } from './form';
import { ConfirmDialog, Dialog, Tabs, TabPanel, Tooltip } from './overlay';

const meta = { title: 'Primitives/Overview', component: Button } satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Buttons: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Button>Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="destructive">Delete</Button>
      <Button loading>Saving</Button>
      <Button size="sm">Small</Button>
    </div>
  ),
};

export const FormFields: Story = {
  render: function Render() {
    const [on, setOn] = useState(true);
    return (
      <div className="max-w-md space-y-4">
        <Field label="Name" hint="As your host will see it">
          <Input defaultValue="Dana" />
        </Field>
        <Field label="Email" error="Enter a valid email">
          <Input defaultValue="dana@" />
        </Field>
        <Field label="Course">
          <Select defaultValue="main">
            <option value="main">Main</option>
            <option value="side">Side</option>
          </Select>
        </Field>
        <Field label="Notes">
          <Textarea />
        </Field>
        <Switch
          label="Share my taste with parties"
          description="Allergies are always shared."
          checked={on}
          onCheckedChange={setOn}
        />
      </div>
    );
  },
};

export const Cards: Story = {
  render: () => (
    <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader
          title="Card title"
          description="Description"
          action={<Badge tone="brand">Badge</Badge>}
        />
        <div className="p-4 text-sm">Body</div>
      </Card>
      <EmptyState
        icon="🍽️"
        title="Nothing here yet"
        description="An empty state"
        action={<Button size="sm">Do it</Button>}
      />
      <ErrorState message="The server is having trouble." onRetry={() => undefined} />
      <div className="space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  ),
};

export const Overlays: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Dialog
        trigger={<Button variant="secondary">Open dialog</Button>}
        title="A dialog"
        description="Focus is trapped while open."
      >
        <p className="text-sm">Content</p>
      </Dialog>
      <ConfirmDialog
        trigger={<Button variant="secondary">Revoke link</Button>}
        title="Revoke “Group chat”?"
        description="Other links keep working."
        confirmLabel="Revoke"
        onConfirm={() => undefined}
      />
      <Tooltip content="Helpful hint">
        <Button variant="ghost">Hover me</Button>
      </Tooltip>
    </div>
  ),
};

export const TabsExample: Story = {
  render: function Render() {
    const [tab, setTab] = useState('a');
    return (
      <Tabs
        value={tab}
        onValueChange={setTab}
        label="Example"
        tabs={[
          { value: 'a', label: 'First' },
          { value: 'b', label: 'Second' },
        ]}
      >
        <TabPanel value="a">First panel</TabPanel>
        <TabPanel value="b">Second panel</TabPanel>
      </Tabs>
    );
  },
};
