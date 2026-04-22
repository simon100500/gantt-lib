import type { Meta, StoryObj } from '@storybook/react';
import { GanttChart, type Task } from 'gantt-lib';
import { StorybookScaffold } from './StorybookScaffold';
import {
  createEmptyStorybookTasks,
  createStorybookTasks,
} from './fixtures/createStorybookTasks';

const meta = {
  title: 'Overview/Scaffold',
  component: StorybookScaffold,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Baseline gantt-lib rendering through the public package surface with Storybook-local fixtures and required CSS loaded from preview.ts.',
      },
    },
  },
} satisfies Meta<typeof StorybookScaffold>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    initialTasks: createStorybookTasks(),
  },
};

export const EmptyState: Story = {
  args: {
    initialTasks: createEmptyStorybookTasks() as Task[],
  },
  parameters: {
    docs: {
      description: {
        story:
          'Negative test fixture: the chart should still mount cleanly with an empty task array.',
      },
    },
  },
};
