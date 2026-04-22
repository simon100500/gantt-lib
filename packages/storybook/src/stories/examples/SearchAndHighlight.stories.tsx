import type { Meta, StoryObj } from '@storybook/react';
import { ExampleScenarioHarness } from './ExampleScenarioHarness';
import { createSearchAndHighlightScenario } from '../fixtures/createExampleScenarioTasks';

const meta = {
  title: 'Examples/Search and highlight',
  component: ExampleScenarioHarness,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Search-focused example that routes host query/highlight state through the shared wrapper so visible diagnostics stay consistent across scenarios.',
      },
    },
  },
} satisfies Meta<typeof ExampleScenarioHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SearchTriageWorkspace: Story = {
  args: {
    title: 'Examples / search triage workspace',
    description:
      'Simulates a host search workflow with deterministic local query state, tracked highlight ids, no-match messaging, and visible dependency diagnostics.',
    scenario: createSearchAndHighlightScenario(),
    extraToolbarContent: (
      <>
        <span>taskFilterQuery: 'Critical'</span>
        <span>filterMode: 'highlight'</span>
        <span>highlightedTaskIds: new Set(['cap-interaction', 'cap-deps'])</span>
        <span>businessDays: true</span>
        <span>Announce triage focus</span>
      </>
    ),
  },
};
