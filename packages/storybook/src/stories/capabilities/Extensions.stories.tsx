import type { Meta, StoryObj } from '@storybook/react';
import { CapabilityStoryHarness } from '../CapabilityStoryHarness';
import { createCapabilityTasks } from '../fixtures/createCapabilityTasks';

const meta = {
  title: 'Capabilities/Extensions',
  component: CapabilityStoryHarness,
  tags: ['autodocs'],
} satisfies Meta<typeof CapabilityStoryHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AdditionalColumns: Story = {
  args: {
    title: 'Extensions / additional task-list columns',
    initialTasks: createCapabilityTasks(),
  },
};
