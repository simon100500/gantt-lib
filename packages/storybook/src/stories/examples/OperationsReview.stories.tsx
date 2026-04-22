import type { Meta, StoryObj } from '@storybook/react';
import { ExampleScenarioHarness } from './ExampleScenarioHarness';
import { createOperationsReviewScenario } from '../fixtures/createExampleScenarioTasks';

const meta = {
  title: 'Examples/Operations review',
  component: ExampleScenarioHarness,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Operations review surface that keeps business-day scheduling, dependency expectations, and safe ref feedback visible in one host-like screen.',
      },
    },
  },
} satisfies Meta<typeof ExampleScenarioHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DependencyAndBusinessDayAudit: Story = {
  args: {
    title: 'Examples / operations review',
    description:
      'Exercises business-day scheduling with explicit ref controls and dependency review state, including the safe missing-id path through the shared wrapper.',
    scenario: createOperationsReviewScenario(),
    extraToolbarContent: (
      <>
        <span>taskFilterQuery: 'Weekday'</span>
        <span>filterMode: 'highlight'</span>
        <span>enableAutoSchedule: true</span>
        <span>businessDays: true</span>
        <span>Run focus ref action for missing-task-id</span>
      </>
    ),
  },
};
