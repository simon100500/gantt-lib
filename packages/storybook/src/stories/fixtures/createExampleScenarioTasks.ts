import type { TaskListColumn, TaskListMenuCommand } from 'gantt-lib';
import {
  createBusinessDayCapabilityTasks,
  createDependencyFocusedCapabilityTasks,
  createFilteringCapabilityTasks,
  createInvalidDependencyCapabilityTasks,
  type CapabilityTask,
} from './createCapabilityTasks';

export interface ExampleScenarioDescriptor {
  id:
    | 'management-overview'
    | 'searchable-triage'
    | 'extension-workspace'
    | 'operations-review';
  title: string;
  query: string;
  filterMode: 'highlight' | 'hide';
  highlightedTaskIds: Set<string>;
  filteredTaskIds: Set<string>;
  isFilterActive: boolean;
  businessDays: boolean;
  enableAutoSchedule: boolean;
  tasks: CapabilityTask[];
  additionalColumns?: TaskListColumn<CapabilityTask>[];
  taskListMenuCommands?: TaskListMenuCommand<CapabilityTask>[];
  diagnosticsLabel: string;
  emptyStateLabel: string;
  unsupportedCommandLabel?: string;
  focusTaskId?: string;
  initialRefActionLabel?: string;
  dependencyExpectation: string;
}

const SHARED_HIGHLIGHT_IDS = ['cap-interaction', 'cap-deps'] as const;
const HIGHLIGHTED_TASK_IDS = new Set<string>(SHARED_HIGHLIGHT_IDS);

const createTrackedFilterIds = (tasks: CapabilityTask[], query: string): Set<string> => {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return new Set<string>();
  }

  return new Set(
    tasks
      .filter((task) => task.name.toLowerCase().includes(normalizedQuery))
      .map((task) => task.id),
  );
};

export const managementOverviewColumns: TaskListColumn<CapabilityTask>[] = [
  {
    id: 'risk',
    header: 'Risk',
    width: 96,
    after: 'status',
    renderCell: ({ task }) => task.risk ?? 'low',
  },
  {
    id: 'owner-region',
    header: 'Owner / zone',
    width: 168,
    after: 'risk',
    renderCell: ({ task }) => `${task.owner ?? 'Unassigned'} · ${task.parentId ? 'delivery' : 'program'}`,
  },
];

export const managementOverviewCommands: TaskListMenuCommand<CapabilityTask>[] = [
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
  {
    id: 'linear-recovery-note',
    label: 'Request recovery note',
    scope: 'linear',
    onSelect: () => undefined,
  },
];

export const extensionWorkspaceColumns: TaskListColumn<CapabilityTask>[] = [
  {
    id: 'risk',
    header: 'Risk',
    width: 96,
    after: 'status',
    renderCell: ({ task }) => task.risk ?? 'low',
  },
  {
    id: 'owner-notes',
    header: 'Owner notes',
    width: 190,
    after: 'risk',
    renderCell: ({ task }) => `${task.owner ?? 'Unassigned'} / ${task.statusLabel ?? 'Pending'}`,
  },
  {
    id: 'handoff-state',
    header: 'Handoff',
    width: 150,
    after: 'owner-notes',
    renderCell: ({ task }) => (task.accepted ? 'Ready for sign-off' : 'Needs host follow-up'),
  },
];

export const extensionWorkspaceCommands: TaskListMenuCommand<CapabilityTask>[] = [
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

const createManagementOverviewTasks = (): CapabilityTask[] =>
  createFilteringCapabilityTasks().map((task) => {
    if (task.id === 'cap-program') {
      return {
        ...task,
        name: 'Capability portfolio workspace',
        statusLabel: 'Review board',
        risk: 'medium',
      };
    }

    if (task.id === 'cap-interaction') {
      return {
        ...task,
        owner: 'Ops council',
        risk: 'high',
        statusLabel: 'Needs triage',
      };
    }

    if (task.id === 'cap-deps') {
      return {
        ...task,
        owner: 'Controls desk',
        risk: 'high',
        statusLabel: 'Watch',
      };
    }

    return task;
  });

const createExtensionWorkspaceTasks = (): CapabilityTask[] =>
  createDependencyFocusedCapabilityTasks().map((task) => {
    if (task.id === 'cap-program') {
      return {
        ...task,
        statusLabel: 'Extension host',
      };
    }

    if (task.id === 'cap-interaction') {
      return {
        ...task,
        owner: 'Integrations',
        statusLabel: 'Awaiting host command',
      };
    }

    if (task.id === 'cap-launch') {
      return {
        ...task,
        statusLabel: 'Pending sign-off',
      };
    }

    return task;
  });

export const createManagementOverviewScenario = (): ExampleScenarioDescriptor => {
  const tasks = createManagementOverviewTasks();
  const query = 'Capability';

  return {
    id: 'management-overview',
    title: 'Examples / management overview',
    query,
    filterMode: 'highlight',
    highlightedTaskIds: new Set(HIGHLIGHTED_TASK_IDS),
    filteredTaskIds: createTrackedFilterIds(tasks, query),
    isFilterActive: true,
    businessDays: true,
    enableAutoSchedule: false,
    tasks,
    additionalColumns: managementOverviewColumns,
    taskListMenuCommands: managementOverviewCommands,
    diagnosticsLabel: 'Management overview chrome',
    emptyStateLabel: 'No rows match the management overview query.',
    unsupportedCommandLabel: 'Queue exec brief is unsupported for non-milestone rows.',
    dependencyExpectation: 'Management overview keeps dependencies stable while filters, highlights, columns, and menu feedback stay visible.',
  };
};

export const createSearchableTriageScenario = (): ExampleScenarioDescriptor => {
  const tasks = createFilteringCapabilityTasks();
  const query = 'Critical';

  return {
    id: 'searchable-triage',
    title: 'Examples / searchable triage',
    query,
    filterMode: 'highlight',
    highlightedTaskIds: new Set(HIGHLIGHTED_TASK_IDS),
    filteredTaskIds: createTrackedFilterIds(tasks, query),
    isFilterActive: true,
    businessDays: true,
    enableAutoSchedule: false,
    tasks,
    diagnosticsLabel: 'Searchable triage chrome',
    emptyStateLabel: 'No rows match the active triage query.',
    unsupportedCommandLabel: 'This scenario exposes search state only; menu commands are intentionally absent.',
    dependencyExpectation: 'Critical search keeps all rows visible while highlighting tracked ids and surfacing no-match feedback.',
  };
};

export const createExtensionWorkspaceScenario = (): ExampleScenarioDescriptor => {
  const tasks = createExtensionWorkspaceTasks();
  const query = 'dependency';

  return {
    id: 'extension-workspace',
    title: 'Examples / extension workspace',
    query,
    filterMode: 'hide',
    highlightedTaskIds: new Set(HIGHLIGHTED_TASK_IDS),
    filteredTaskIds: createTrackedFilterIds(tasks, query),
    isFilterActive: true,
    businessDays: false,
    enableAutoSchedule: true,
    tasks,
    additionalColumns: extensionWorkspaceColumns,
    taskListMenuCommands: extensionWorkspaceCommands,
    diagnosticsLabel: 'Extension workspace chrome',
    emptyStateLabel: 'No extension rows are visible for the current query.',
    unsupportedCommandLabel: 'Linear-only recovery actions reject milestone and group rows.',
    focusTaskId: 'cap-deps',
    initialRefActionLabel: 'Ready to focus dependency audit via scrollToTask().',
    dependencyExpectation: 'Extension workspace combines additional columns, scoped menu commands, hide mode, and dependency-focused auto-schedule review.',
  };
};

export const createOperationsReviewScenario = (): ExampleScenarioDescriptor => {
  const tasks = createBusinessDayCapabilityTasks().map((task) => {
    if (task.id === 'cap-program') {
      return {
        ...task,
        statusLabel: 'Operations board',
      };
    }

    if (task.id === 'cap-deps') {
      return {
        ...task,
        statusLabel: 'Weekend handoff',
      };
    }

    return task;
  });
  const query = 'Weekday';

  return {
    id: 'operations-review',
    title: 'Examples / operations review',
    query,
    filterMode: 'highlight',
    highlightedTaskIds: new Set(HIGHLIGHTED_TASK_IDS),
    filteredTaskIds: createTrackedFilterIds(tasks, query),
    isFilterActive: true,
    businessDays: true,
    enableAutoSchedule: true,
    tasks,
    diagnosticsLabel: 'Operations review chrome',
    emptyStateLabel: 'No weekday-focused rows matched the current query.',
    focusTaskId: 'missing-task-id',
    initialRefActionLabel: 'Ready to verify that missing ref targets remain safe no-ops.',
    dependencyExpectation: 'Operations review keeps business-day scheduling on while making ref feedback and dependency expectations explicit.',
  };
};

export const createInvalidDependencyExampleTasks = (): CapabilityTask[] =>
  createInvalidDependencyCapabilityTasks();

export const exampleScenarioCatalog = [
  createManagementOverviewScenario,
  createSearchableTriageScenario,
  createExtensionWorkspaceScenario,
  createOperationsReviewScenario,
] as const;
