import type { Meta, StoryObj } from '@storybook/react';
import type { TaskListColumn, TaskListMenuCommand } from 'gantt-lib';
import { CapabilityStoryHarness, mergeChangedTasks } from '../CapabilityStoryHarness';
import { createCapabilityTasks, type CapabilityTask } from '../fixtures/createCapabilityTasks';

const editableColumns: TaskListColumn<CapabilityTask>[] = [
  {
    id: 'risk',
    header: 'Risk',
    width: 96,
    after: 'status',
    editable: true,
    renderCell: ({ task }) => task.risk ?? 'low',
    renderEditor: ({ task, updateTask, closeEditor }) => (
      <select
        autoFocus
        defaultValue={task.risk ?? 'low'}
        onChange={(event) => {
          updateTask({ risk: event.target.value as CapabilityTask['risk'] });
          closeEditor();
        }}
      >
        <option value="low">low</option>
        <option value="medium">medium</option>
        <option value="high">high</option>
      </select>
    ),
  },
  {
    id: 'ownerNotes',
    header: 'Owner notes',
    width: 180,
    after: 'risk',
    editable: true,
    renderCell: ({ task }) => `${task.owner ?? 'Unassigned'} / ${task.statusLabel ?? 'Pending'}`,
    renderEditor: ({ task, updateTask, closeEditor }) => (
      <button
        type="button"
        onClick={() => {
          updateTask({
            owner: task.owner ? `${task.owner} + QA` : 'QA',
            statusLabel: 'Reviewed',
          });
          closeEditor();
        }}
      >
        save-{task.id}
      </button>
    ),
  },
];

const menuCommands: TaskListMenuCommand<CapabilityTask>[] = [
  {
    id: 'group-checkpoint',
    label: 'Mark group checkpoint',
    scope: 'group',
    onSelect: () => undefined,
  },
  {
    id: 'linear-review',
    label: 'Request linear review',
    scope: 'linear',
    onSelect: () => undefined,
  },
  {
    id: 'milestone-signoff',
    label: 'Prepare milestone sign-off',
    scope: 'milestone',
    onSelect: () => undefined,
  },
];

const meta = {
  title: 'Capabilities/Extensions',
  component: CapabilityStoryHarness,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Extension stories cover package-local additionalColumns editors and taskListMenuCommands scopes using only the public gantt-lib API surface.',
      },
    },
  },
} satisfies Meta<typeof CapabilityStoryHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AdditionalColumns: Story = {
  args: {
    title: 'Extensions / additional task-list columns',
    description:
      'Minimal editable columns demonstrate `renderCell` and `renderEditor` without reaching into website code or introducing scenario-specific chrome.',
    initialTasks: createCapabilityTasks(),
    taskListWidth: 760,
    additionalColumns: editableColumns,
  },
};

export const TaskListMenuCommandScopes: Story = {
  args: {
    title: 'Extensions / task-list menu command scopes',
    description:
      'Scope-specific row commands show how group, linear, and milestone actions can be declared from public types while remaining package-local and deterministic.',
    initialTasks: createCapabilityTasks(),
    taskListMenuCommands: menuCommands,
    renderToolbar: ({ announce }) => (
      <button
        type="button"
        onClick={() => announce('Task-list menu commands are visible on matching row scopes only.')}
      >
        Explain command scopes
      </button>
    ),
  },
};

export const EditorClosePath: Story = {
  render: (args) => {
    const tasks = createCapabilityTasks();
    const changed = [
      {
        ...tasks[1],
        risk: 'high' as const,
        statusLabel: 'Reviewed',
      },
    ];
    const merged = mergeChangedTasks(tasks, changed);

    return (
      <CapabilityStoryHarness
        {...args}
        title="Extensions / editor close-path contract"
        description={`Demonstrates the update-and-close path used by custom editors. Sample merge result: ${merged[1]?.risk} / ${merged[1]?.statusLabel}.`}
        initialTasks={tasks}
        taskListWidth={760}
        additionalColumns={editableColumns}
      />
    );
  },
};
