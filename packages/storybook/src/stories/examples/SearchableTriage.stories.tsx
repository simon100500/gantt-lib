import type { Meta, StoryObj } from '@storybook/react';
import { ExampleScenarioHarness } from './ExampleScenarioHarness';
import { createSearchableTriageScenario } from '../fixtures/createExampleScenarioTasks';

const meta = {
  title: 'Examples/Searchable triage',
  component: ExampleScenarioHarness,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Search-oriented triage flow that keeps the active query, highlighted ids, and no-match status visible through Storybook-local host chrome.',
      },
    },
  },
} satisfies Meta<typeof ExampleScenarioHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const HighlightDrivenQueue: Story = {
  args: {
    title: 'Examples / searchable triage',
    description:
      'Simulates a searchable triage queue with tracked query state, highlight diagnostics, and explicit malformed-input coverage via the host query controls.',
    scenario: createSearchableTriageScenario(),
    extraToolbarContent: (
      <>
        <span>taskFilterQuery: 'Critical'</span>
        <span>filterMode: 'highlight'</span>
        <span>highlightedTaskIds: new Set(['cap-interaction', 'cap-deps'])</span>
        <span>businessDays: true</span>
        <span>Clear query for no-match coverage</span>
      </>
    ),
  },
};
