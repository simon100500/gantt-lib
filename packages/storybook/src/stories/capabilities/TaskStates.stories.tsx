import type { Meta, StoryObj } from '@storybook/react';
import { CapabilityStoryHarness } from '../CapabilityStoryHarness';
import { createTaskStateCapabilityTasks } from '../fixtures/createCapabilityTasks';

const meta = {
  title: 'Capabilities/Task states',
  component: CapabilityStoryHarness,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Task-state capability stories focus on accepted/review/blocked/locked/milestone surfaces plus baseline visibility and highlight-driven inspection.',
      },
    },
  },
} satisfies Meta<typeof CapabilityStoryHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const BaselineAndAcceptance: Story = {
  args: {
    title: 'Task states / accepted, review, blocked, milestone',
    description:
      'Shows accepted progress, review state, blocked status, milestone rendering, and baseline variance inside one package-local dataset.',
    initialTasks: createTaskStateCapabilityTasks(),
    showBaseline: true,
  },
};

export const HighlightedRiskRows: Story = {
  args: {
    title: 'Task states / highlighted review and blocked rows',
    description:
      'Uses highlight-driven inspection to keep all rows visible while drawing attention to risky states instead of hiding surrounding context.',
    initialTasks: createTaskStateCapabilityTasks(),
    highlightedTaskIds: new Set(['cap-states', 'cap-deps']),
  },
};

export const WithoutBaseline: Story = {
  args: {
    title: 'Task states / same dataset without baseline',
    description:
      'Boundary condition proving the same stateful dataset still mounts cleanly when baseline visuals are disabled.',
    initialTasks: createTaskStateCapabilityTasks(),
    showBaseline: false,
  },
};
