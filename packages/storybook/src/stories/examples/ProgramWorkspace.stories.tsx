import type { Meta, StoryObj } from '@storybook/react';
import type { TaskListColumn, TaskListMenuCommand } from 'gantt-lib';
import { CapabilityStoryHarness } from '../CapabilityStoryHarness';
import { createCapabilityTasks, type CapabilityTask } from '../fixtures/createCapabilityTasks';

const programColumns: TaskListColumn<CapabilityTask>[] = [
  {
    id: 'risk',
    header: 'Risk',
    width: 96,
    after: 'status',
    renderCell: ({ task }) => task.risk ?? 'low',
  },
  {
    id: 'owner',
    header: 'Owner',
    width: 120,
    after: 'risk',
    renderCell: ({ task }) => task.owner ?? 'Unassigned',
  },
];

const programCommands: TaskListMenuCommand<CapabilityTask>[] = [
  {
    id: 'promote-risk-review',
    label: 'Promote risk review',
    scope: 'group',
    onSelect: () => undefined,
  },
  {
    id: 'queue-exec-brief',
    label: 'Queue exec brief',
    scope: 'milestone',
    onSelect: () => undefined,
  },
];

const meta = {
  title: 'Examples/Program workspace',
  component: CapabilityStoryHarness,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Host-like management workspace composition that layers filter state, highlighted rows, extra columns, menu commands, and visible toolbar copy on top of the public gantt-lib API.',
      },
    },
  },
} satisfies Meta<typeof CapabilityStoryHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ManagementReviewWorkspace: Story = {
  args: {
    title: 'Examples / management review workspace',
    description:
      'Combines a PM-style toolbar, highlighted risk rows, task-list extensions, and menu commands so reviewers can inspect a richer host-like composition without leaving Storybook.',
    initialTasks: createCapabilityTasks(),
    taskListWidth: 840,
    taskFilterQuery: 'Capability',
    filterMode: 'highlight',
    highlightedTaskIds: new Set(['cap-interaction', 'cap-deps']),
    additionalColumns: programColumns,
    taskListMenuCommands: programCommands,
    renderToolbar: ({ tasks, collapsedParentIds, lastEvent, announce }) => (
      <>
        <span>Query: Capability</span>
        <span>Highlight: cap-interaction, cap-deps</span>
        <span>Columns: owner, risk</span>
        <span>Commands: group + milestone</span>
        <span>Collapsed: {collapsedParentIds.size}</span>
        <span>Visible tasks: {tasks.length}</span>
        <button type="button" onClick={() => announce(`Workspace checkpoint — ${lastEvent}`)}>
          Capture workspace status
        </button>
      </>
    ),
  },
};
