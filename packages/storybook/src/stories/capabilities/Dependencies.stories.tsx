import type { Meta, StoryObj } from '@storybook/react';
import { CapabilityStoryHarness } from '../CapabilityStoryHarness';
import {
  createDependencyFocusedCapabilityTasks,
  createInvalidDependencyCapabilityTasks,
} from '../fixtures/createCapabilityTasks';

const meta = {
  title: 'Capabilities/Dependencies',
  component: CapabilityStoryHarness,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Dependency capability stories cover FS/SS/FF/SF surfaces, validation visibility, hard-mode cascade wiring, and unconstrained debugging using only documented public props.',
      },
    },
  },
} satisfies Meta<typeof CapabilityStoryHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MixedDependencyTypes: Story = {
  args: {
    title: 'Dependencies / FS, SS, FF, SF semantics',
    description:
      'Reference dependency surface with all four public link types represented so reviewers can inspect line routing and milestone adjacency in one place.',
    initialTasks: createDependencyFocusedCapabilityTasks(),
  },
};

export const HardModeCascade: Story = {
  args: {
    title: 'Dependencies / hard-mode cascade via onCascade',
    description:
      'Auto-schedule hard mode routes drag completion through `onCascade` instead of `onTasksChange`, matching the documented separation of concerns.',
    initialTasks: createDependencyFocusedCapabilityTasks(),
    enableAutoSchedule: true,
    disableConstraints: false,
  },
};

export const UnconstrainedDebugMode: Story = {
  args: {
    title: 'Dependencies / unconstrained debug surface',
    description:
      'Debug variant disables dependency constraints while keeping dependency rows visible, useful for layout inspection and manual what-if edits.',
    initialTasks: createDependencyFocusedCapabilityTasks(),
    disableConstraints: true,
  },
};

export const InvalidPredecessorValidation: Story = {
  args: {
    title: 'Dependencies / invalid predecessor visibility',
    description:
      'Negative fixture deliberately references a missing predecessor so dependency validation warnings remain observable from the Storybook surface.',
    initialTasks: createInvalidDependencyCapabilityTasks(),
  },
};
