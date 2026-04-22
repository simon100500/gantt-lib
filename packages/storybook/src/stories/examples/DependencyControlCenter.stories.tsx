import type { Meta, StoryObj } from '@storybook/react';
import { CapabilityStoryHarness } from '../CapabilityStoryHarness';
import { createBusinessDayCapabilityTasks, createDependencyFocusedCapabilityTasks } from '../fixtures/createCapabilityTasks';

const meta = {
  title: 'Examples/Dependency control center',
  component: CapabilityStoryHarness,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Operations-oriented example that combines dependency-heavy data, business-day/calendar toggles, and safe imperative ref controls while surfacing current state in toolbar copy.',
      },
    },
  },
} satisfies Meta<typeof CapabilityStoryHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ScheduleControlCenter: Story = {
  args: {
    title: 'Examples / dependency control center',
    description:
      'Presents a host-like control bar for dependency review, combining auto-schedule semantics, business-day data, and safe ref methods through the public chart handle.',
    initialTasks: createDependencyFocusedCapabilityTasks(),
    enableAutoSchedule: true,
    businessDays: false,
    renderToolbar: ({ chartHandle, dependencyValidation, lastEvent, announce }) => (
      <>
        <span>Dependency mode: auto-schedule</span>
        <span>Business days: off</span>
        <span>Validation: {dependencyValidation.isValid ? 'clean' : 'issues'}</span>
        <button
          type="button"
          onClick={() => {
            chartHandle?.scrollToTask('cap-deps');
            announce('Scrolled to cap-deps from dependency control center.');
          }}
        >
          Focus dependency audit
        </button>
        <button
          type="button"
          onClick={() => {
            chartHandle?.collapseAll();
            announce(`Collapsed all groups from dependency control center. Last event: ${lastEvent}`);
          }}
        >
          Collapse for review
        </button>
      </>
    ),
  },
};

export const BusinessDayToggleView: Story = {
  args: {
    title: 'Examples / business-day review view',
    description:
      'Companion scenario that keeps the same reviewer chrome while switching to weekday-oriented data so downstream stories can compare calendar vs business-day scheduling.',
    initialTasks: createBusinessDayCapabilityTasks(),
    enableAutoSchedule: true,
    businessDays: true,
    renderToolbar: ({ announce }) => (
      <>
        <span>Dependency mode: auto-schedule</span>
        <span>Business days: on</span>
        <span>Scenario: weekday review</span>
        <button type="button" onClick={() => announce('Weekday review view is active.') }>
          Announce weekday mode
        </button>
      </>
    ),
  },
};
