import type { Meta, StoryObj } from '@storybook/react';
import { CapabilityStoryHarness } from '../CapabilityStoryHarness';
import {
  createBusinessDayCapabilityTasks,
  createCapabilityTasks,
} from '../fixtures/createCapabilityTasks';

const meta = {
  title: 'Capabilities/Interaction',
  component: CapabilityStoryHarness,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Interaction capability stories keep state local to Storybook while demonstrating merge-by-id `onTasksChange`, editability toggles, drag constraints, hierarchy collapse, and business-day scheduling.',
      },
    },
  },
} satisfies Meta<typeof CapabilityStoryHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EditableSurface: Story = {
  args: {
    title: 'Interaction / editable merge-by-id surface',
    description:
      'Default interactive surface: inline edits, row actions, drag/resize, and hierarchy toggles feed local state through the documented partial-update merge contract.',
    initialTasks: createCapabilityTasks(),
    showTaskList: true,
    showChart: true,
  },
};

export const LockedMode: Story = {
  args: {
    title: 'Interaction / locked task names and drag disabled',
    description:
      'Constrained variant for reviewers who need to compare editable and locked behavior without changing datasets or wrapper semantics.',
    initialTasks: createCapabilityTasks(),
    disableTaskNameEditing: true,
    disableTaskDrag: true,
  },
};

export const BusinessDayScheduling: Story = {
  args: {
    title: 'Interaction / business-days schedule semantics',
    description:
      'Business-days dataset spans a weekend so reviewers can verify weekday-aware duration semantics and partial-update merges without switching packages.',
    initialTasks: createBusinessDayCapabilityTasks(),
    businessDays: true,
  },
};

export const CalendarDayScheduling: Story = {
  args: {
    title: 'Interaction / calendar-day schedule semantics',
    description:
      'Same fixture family with calendar-day math enabled, making it easy to contrast with the business-days variant when editing dates or durations.',
    initialTasks: createBusinessDayCapabilityTasks(),
    businessDays: false,
  },
};
