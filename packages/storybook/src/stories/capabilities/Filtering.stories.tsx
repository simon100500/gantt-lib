import type { Meta, StoryObj } from '@storybook/react';
import { CapabilityStoryHarness } from '../CapabilityStoryHarness';
import { createFilteringCapabilityTasks } from '../fixtures/createCapabilityTasks';

const meta = {
  title: 'Capabilities/Filtering',
  component: CapabilityStoryHarness,
  tags: ['autodocs'],
} satisfies Meta<typeof CapabilityStoryHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NameFilterHighlight: Story = {
  args: {
    title: 'Filtering / taskFilter-ready dataset',
    description:
      'Fixture includes critical-name variants so later stories can demonstrate predicate filtering and highlight-driven navigation without website imports.',
    initialTasks: createFilteringCapabilityTasks(),
    taskFilterQuery: 'Critical',
  },
};
