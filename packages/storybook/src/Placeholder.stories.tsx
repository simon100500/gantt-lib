import type { Meta, StoryObj } from '@storybook/react';
import { GanttChart, type Task } from 'gantt-lib';

const tasks: Task[] = [
  {
    id: 'task-1',
    name: 'Scaffold Storybook workspace',
    startDate: '2026-04-20',
    endDate: '2026-04-22',
    color: '#2563eb',
    progress: 100,
    accepted: true,
  },
  {
    id: 'task-2',
    name: 'Add public-package smoke story',
    startDate: '2026-04-23',
    endDate: '2026-04-25',
    color: '#7c3aed',
    progress: 45,
  },
];

const meta = {
  title: 'Overview/Workspace Smoke Test',
  component: GanttChart,
  tags: ['autodocs'],
  args: {
    tasks,
    dayWidth: 36,
    rowHeight: 40,
    headerHeight: 44,
    containerHeight: 320,
    onChange: () => undefined,
  },
  parameters: {
    docs: {
      description: {
        component:
          'Minimal placeholder story proving the standalone Storybook package renders gantt-lib through its public package exports.',
      },
    },
  },
} satisfies Meta<typeof GanttChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Placeholder: Story = {};
