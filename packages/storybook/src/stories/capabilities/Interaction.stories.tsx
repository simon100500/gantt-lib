import type { Meta, StoryObj } from '@storybook/react';
import { CapabilityStoryHarness } from '../CapabilityStoryHarness';
import { createCapabilityTasks } from '../fixtures/createCapabilityTasks';

const meta = {
  title: 'Capabilities/Interaction',
  component: CapabilityStoryHarness,
  tags: ['autodocs'],
} satisfies Meta<typeof CapabilityStoryHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DragAndEditSurface: Story = {
  args: {
    title: 'Interaction / merge-by-id state updates',
    description:
      'Harness keeps changed-task merges local so downstream interaction stories can focus on drag, inline edit, reorder, and add/remove behavior.',
    initialTasks: createCapabilityTasks(),
  },
};
