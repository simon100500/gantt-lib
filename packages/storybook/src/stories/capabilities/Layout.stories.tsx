import type { Meta, StoryObj } from '@storybook/react';
import { CapabilityStoryHarness } from '../CapabilityStoryHarness';
import { createCapabilityTasks, createTaskListOnlyCapabilityTasks } from '../fixtures/createCapabilityTasks';

const meta = {
  title: 'Capabilities/Layout',
  component: CapabilityStoryHarness,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Layout capability stories isolate chart-only and task-list-heavy presentations without importing website runtime helpers.',
      },
    },
  },
} satisfies Meta<typeof CapabilityStoryHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SplitView: Story = {
  args: {
    title: 'Layout / split chart + task list',
    initialTasks: createCapabilityTasks(),
    showTaskList: true,
    showChart: true,
    taskListWidth: 420,
  },
};

export const TaskListOnly: Story = {
  args: {
    title: 'Layout / task list only',
    initialTasks: createTaskListOnlyCapabilityTasks(),
    showTaskList: true,
    showChart: false,
    taskListWidth: 520,
  },
};
