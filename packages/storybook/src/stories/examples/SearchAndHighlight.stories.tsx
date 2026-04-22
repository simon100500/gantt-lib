import type { Meta, StoryObj } from '@storybook/react';
import { CapabilityStoryHarness } from '../CapabilityStoryHarness';
import { createFilteringCapabilityTasks } from '../fixtures/createCapabilityTasks';

const meta = {
  title: 'Examples/Search and highlight',
  component: CapabilityStoryHarness,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Search-focused example that keeps the current query, filter mode, highlight set, and business-day mode visible so state changes are reviewable from the canvas alone.',
      },
    },
  },
} satisfies Meta<typeof CapabilityStoryHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SearchTriageWorkspace: Story = {
  args: {
    title: 'Examples / search triage workspace',
    description:
      'Combines search-like filtering, explicit highlight state, business-day scheduling, and reviewer-facing toolbar copy to simulate triage workflows in a host application.',
    initialTasks: createFilteringCapabilityTasks(),
    taskFilterQuery: 'Critical',
    filterMode: 'highlight',
    highlightedTaskIds: new Set(['cap-interaction', 'cap-deps']),
    businessDays: true,
    renderToolbar: ({ collapsedParentIds, dependencyValidation, announce }) => (
      <>
        <span>Query: Critical</span>
        <span>Filter mode: highlight</span>
        <span>Highlights: 2 tracked ids</span>
        <span>Business days: on</span>
        <span>Collapsed groups: {collapsedParentIds.size}</span>
        <span>Dependency validation: {dependencyValidation.isValid ? 'clean' : 'issues'}</span>
        <button type="button" onClick={() => announce('Search triage note: focus remains on critical tasks.') }>
          Announce triage focus
        </button>
      </>
    ),
  },
};
