import type { Meta, StoryObj } from '@storybook/react';
import { ExampleScenarioHarness } from './ExampleScenarioHarness';
import {
  createBusinessDayReviewScenario,
  createDependencyControlCenterScenario,
} from '../fixtures/createExampleScenarioTasks';

const meta = {
  title: 'Examples/Dependency control center',
  component: ExampleScenarioHarness,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Operations-oriented examples that reuse the same wrapper for dependency-heavy and business-day variants while keeping ref and validation state visible.',
      },
    },
  },
} satisfies Meta<typeof ExampleScenarioHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ScheduleControlCenter: Story = {
  args: {
    title: 'Examples / dependency control center',
    description:
      'Presents a host-like dependency review surface with auto-schedule state, hide-mode filtering, and safe ref feedback exposed by the shared example harness.',
    scenario: createDependencyControlCenterScenario(),
    extraToolbarContent: (
      <>
        <span>createDependencyFocusedCapabilityTasks</span>
        <span>enableAutoSchedule: true</span>
        <span>businessDays: false</span>
        <span>scrollToTask</span>
        <span>collapseAll</span>
      </>
    ),
  },
};

export const BusinessDayToggleView: Story = {
  args: {
    title: 'Examples / business-day review view',
    description:
      'Companion scenario that keeps the same wrapper seam while switching to weekday-oriented data and business-day scheduling.',
    scenario: createBusinessDayReviewScenario(),
    extraToolbarContent: (
      <>
        <span>createBusinessDayCapabilityTasks</span>
        <span>enableAutoSchedule: true</span>
        <span>businessDays: true</span>
        <span>scrollToTask</span>
        <span>collapseAll</span>
      </>
    ),
  },
};
