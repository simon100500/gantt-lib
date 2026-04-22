import type { Meta, StoryObj } from '@storybook/react';
import { CapabilityStoryHarness } from '../CapabilityStoryHarness';
import { createDependencyFocusedCapabilityTasks } from '../fixtures/createCapabilityTasks';

const meta = {
  title: 'Capabilities/Dependencies',
  component: CapabilityStoryHarness,
  tags: ['autodocs'],
} satisfies Meta<typeof CapabilityStoryHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MixedDependencyTypes: Story = {
  args: {
    title: 'Dependencies / FS, SS, FF coverage',
    initialTasks: createDependencyFocusedCapabilityTasks(),
  },
};
