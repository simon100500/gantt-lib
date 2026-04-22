import type { Meta, StoryObj } from '@storybook/react';
import { CapabilityStoryHarness } from '../CapabilityStoryHarness';
import { createCapabilityTasks } from '../fixtures/createCapabilityTasks';

const meta = {
  title: 'Capabilities/Imperative controls',
  component: CapabilityStoryHarness,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Imperative control stories focus on the documented safe GanttChartHandle subset — scrolling and hierarchy controls — and intentionally avoid mandatory PDF side effects.',
      },
    },
  },
} satisfies Meta<typeof CapabilityStoryHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SafeRefActions: Story = {
  args: {
    title: 'Imperative controls / safe ref actions',
    description:
      'Toolbar buttons call the documented safe handle methods: `scrollToToday`, `scrollToTask`, `scrollToRow`, `collapseAll`, and `expandAll`.',
    initialTasks: createCapabilityTasks(),
    renderToolbar: ({ chartHandle, announce }) => (
      <>
        <button
          type="button"
          onClick={() => {
            chartHandle?.scrollToToday();
            announce('Triggered scrollToToday().');
          }}
        >
          Scroll to today
        </button>
        <button
          type="button"
          onClick={() => {
            chartHandle?.scrollToTask('cap-interaction');
            announce('Triggered scrollToTask(cap-interaction).');
          }}
        >
          Scroll to task
        </button>
        <button
          type="button"
          onClick={() => {
            chartHandle?.scrollToRow('cap-deps');
            announce('Triggered scrollToRow(cap-deps).');
          }}
        >
          Scroll to row
        </button>
        <button
          type="button"
          onClick={() => {
            chartHandle?.collapseAll();
            announce('Triggered collapseAll().');
          }}
        >
          Collapse all
        </button>
        <button
          type="button"
          onClick={() => {
            chartHandle?.expandAll();
            announce('Triggered expandAll().');
          }}
        >
          Expand all
        </button>
      </>
    ),
  },
};

export const InvalidTaskIdsAreSafe: Story = {
  args: {
    title: 'Imperative controls / invalid task ids are no-op safe',
    description:
      'Boundary check for invalid task IDs: scroll commands should remain safe no-ops and surface status through the Storybook toolbar instead of throwing.',
    initialTasks: createCapabilityTasks(),
    renderToolbar: ({ chartHandle, announce }) => (
      <>
        <button
          type="button"
          onClick={() => {
            chartHandle?.scrollToTask('missing-task-id');
            announce('Triggered scrollToTask(missing-task-id) — safe no-op expected.');
          }}
        >
          Scroll to missing task
        </button>
        <button
          type="button"
          onClick={() => {
            chartHandle?.scrollToRow('missing-row-id');
            announce('Triggered scrollToRow(missing-row-id) — safe no-op expected.');
          }}
        >
          Scroll to missing row
        </button>
      </>
    ),
  },
};

export const RefReadyHarness: Story = {
  args: {
    title: 'Imperative controls / ref-ready wrapper',
    description:
      'Reference harness keeps the ref surface visible for reviewer inspection while deliberately excluding `exportToPdf` from the default control set.',
    initialTasks: createCapabilityTasks(),
    renderToolbar: ({ announce }) => (
      <button type="button" onClick={() => announce('PDF export intentionally left out of the default safe controls.') }>
        Why no PDF action?
      </button>
    ),
  },
};
