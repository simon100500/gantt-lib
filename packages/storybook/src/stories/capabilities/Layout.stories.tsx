import type { Meta, StoryObj } from '@storybook/react';
import { CapabilityStoryHarness } from '../CapabilityStoryHarness';
import {
  createCapabilityTasks,
  createChartOnlyCapabilityTasks,
  createTaskListOnlyCapabilityTasks,
} from '../fixtures/createCapabilityTasks';

const meta = {
  title: 'Capabilities/Layout',
  component: CapabilityStoryHarness,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Layout capability stories isolate split, chart-only, task-list-only, collapsed hierarchy, and alternate view-mode surfaces without importing website runtime helpers.',
      },
    },
  },
} satisfies Meta<typeof CapabilityStoryHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SplitView: Story = {
  args: {
    title: 'Layout / split chart + task list',
    description:
      'Baseline capability surface with both panes visible, baseline markers enabled, and the default daily grid for quick visual parity checks.',
    initialTasks: createCapabilityTasks(),
    showTaskList: true,
    showChart: true,
    taskListWidth: 420,
    viewMode: 'day',
  },
};

export const ChartOnlyMonthView: Story = {
  args: {
    title: 'Layout / chart only month view',
    description:
      'Boundary condition for reviewers who want the timeline without task-list chrome; uses month mode so spacing shifts are visible in isolation.',
    initialTasks: createChartOnlyCapabilityTasks(),
    showTaskList: false,
    showChart: true,
    showBaseline: true,
    viewMode: 'month',
  },
};

export const TaskListOnlyCollapsed: Story = {
  args: {
    title: 'Layout / task list only collapsed hierarchy',
    description:
      'Task-list-only boundary surface with the parent row collapsed so hierarchy visibility can be reviewed without chart rendering noise.',
    initialTasks: createTaskListOnlyCapabilityTasks(),
    showTaskList: true,
    showChart: false,
    taskListWidth: 560,
    initiallyCollapsedParentIds: ['cap-program'],
  },
};

export const WeekViewWithWiderList: Story = {
  args: {
    title: 'Layout / week view with wider task list',
    description:
      'Alternative week-scale layout surface to verify that custom columns and the task-list width still coexist with denser timeline blocks.',
    initialTasks: createCapabilityTasks(),
    showTaskList: true,
    showChart: true,
    taskListWidth: 540,
    viewMode: 'week',
  },
};
