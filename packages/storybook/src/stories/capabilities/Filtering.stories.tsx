import type { Meta, StoryObj } from '@storybook/react';
import { CapabilityStoryHarness } from '../CapabilityStoryHarness';
import { createFilteringCapabilityTasks } from '../fixtures/createCapabilityTasks';

const meta = {
  title: 'Capabilities/Filtering',
  component: CapabilityStoryHarness,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Filtering stories demonstrate both highlight and hide modes on Storybook-local datasets, including the no-match boundary state and an empty query that leaves the catalog untouched.',
      },
    },
  },
} satisfies Meta<typeof CapabilityStoryHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const HighlightMatches: Story = {
  args: {
    title: 'Filtering / highlight matched tasks',
    description:
      'Uses `taskFilter` with highlight mode so reviewers can keep the full dependency context visible while drawing attention to critical rows.',
    initialTasks: createFilteringCapabilityTasks(),
    filterMode: 'highlight',
    taskFilterQuery: 'Critical',
    highlightedTaskIds: new Set(['cap-interaction', 'cap-deps']),
  },
};

export const HideMatchesOnly: Story = {
  args: {
    title: 'Filtering / hide non-matching tasks',
    description:
      'Same dataset in hide mode: only the matched rows remain visible, which exercises the documented filteredTaskIds / isFilterActive behavior through the public filter API.',
    initialTasks: createFilteringCapabilityTasks(),
    filterMode: 'hide',
    taskFilterQuery: 'Critical',
    highlightedTaskIds: new Set(['cap-interaction', 'cap-deps']),
  },
};

export const NoMatchesBoundary: Story = {
  args: {
    title: 'Filtering / no-match boundary state',
    description:
      'Negative case for an active filter with no results; the chart should stay mounted and signal the empty filtered view without touching the underlying task data.',
    initialTasks: createFilteringCapabilityTasks(),
    filterMode: 'hide',
    taskFilterQuery: 'No such task',
  },
};

export const EmptyQueryLeavesCatalogVisible: Story = {
  args: {
    title: 'Filtering / empty query is inactive',
    description:
      'Malformed-input guard: an empty search query does not activate filtering, so the full capability dataset remains visible and unmodified.',
    initialTasks: createFilteringCapabilityTasks(),
    filterMode: 'highlight',
    taskFilterQuery: '',
  },
};
