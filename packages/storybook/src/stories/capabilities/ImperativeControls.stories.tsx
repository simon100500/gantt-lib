import type { Meta, StoryObj } from '@storybook/react';
import { CapabilityStoryHarness } from '../CapabilityStoryHarness';
import { createCapabilityTasks } from '../fixtures/createCapabilityTasks';

const meta = {
  title: 'Capabilities/Imperative controls',
  component: CapabilityStoryHarness,
  tags: ['autodocs'],
} satisfies Meta<typeof CapabilityStoryHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const RefReadyHarness: Story = {
  args: {
    title: 'Imperative controls / ref-ready wrapper',
    description:
      'Harness exposes a stable ref slot for follow-up stories around scroll, collapse, expand, and export controls.',
    initialTasks: createCapabilityTasks(),
    renderToolbar: () => null,
  },
};
