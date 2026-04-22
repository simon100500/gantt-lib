import type { TaskListColumn, TaskListMenuCommand } from 'gantt-lib';
import {
  createBusinessDayCapabilityTasks,
  createDependencyFocusedCapabilityTasks,
  createFilteringCapabilityTasks,
  createInvalidDependencyCapabilityTasks,
  type CapabilityTask,
} from './createCapabilityTasks';

export interface ExampleScenarioDescriptor {
  id: 'program-workspace' | 'search-and-highlight' | 'dependency-control-center' | 'dependency-business-days';
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

export const programWorkspaceColumns: TaskListColumn<CapabilityTask>[] = [
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

export const programWorkspaceCommands: TaskListMenuCommand<CapabilityTask>[] = [
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

const createProgramWorkspaceTasks = (): CapabilityTask[] =>
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

export const createProgramWorkspaceScenario = (): ExampleScenarioDescriptor => {
  const tasks = createProgramWorkspaceTasks();
  const query = 'Capability';

  return {
    id: 'program-workspace',
    title: 'Examples / management review workspace',
    query,
    filterMode: 'highlight',
    highlightedTaskIds: new Set(HIGHLIGHTED_TASK_IDS),
    filteredTaskIds: createTrackedFilterIds(tasks, query),
    isFilterActive: true,
    businessDays: true,
    enableAutoSchedule: false,
    tasks,
    additionalColumns: programWorkspaceColumns,
    taskListMenuCommands: programWorkspaceCommands,
    diagnosticsLabel: 'Workspace review chrome',
    emptyStateLabel: 'No rows match the management review query.',
    unsupportedCommandLabel: 'Queue exec brief is unsupported for non-milestone rows.',
    dependencyExpectation: 'Validation should stay clean while review chrome tracks menu/ref feedback.',
  };
};

export const createSearchAndHighlightScenario = (): ExampleScenarioDescriptor => {
  const tasks = createFilteringCapabilityTasks();
  const query = 'Critical';

  return {
    id: 'search-and-highlight',
    title: 'Examples / search triage workspace',
    query,
    filterMode: 'highlight',
    highlightedTaskIds: new Set(HIGHLIGHTED_TASK_IDS),
    filteredTaskIds: createTrackedFilterIds(tasks, query),
    isFilterActive: true,
    businessDays: true,
    enableAutoSchedule: false,
    tasks,
    diagnosticsLabel: 'Search triage chrome',
    emptyStateLabel: 'No rows match the active search query.',
    unsupportedCommandLabel: 'This scenario exposes search state only; menu commands are intentionally absent.',
    dependencyExpectation: 'Critical search keeps all rows visible while highlighting tracked ids.',
  };
};

export const createDependencyControlCenterScenario = (): ExampleScenarioDescriptor => {
  const tasks = createDependencyFocusedCapabilityTasks();
  const query = 'dependency';

  return {
    id: 'dependency-control-center',
    title: 'Examples / dependency control center',
    query,
    filterMode: 'hide',
    highlightedTaskIds: new Set(HIGHLIGHTED_TASK_IDS),
    filteredTaskIds: createTrackedFilterIds(tasks, query),
    isFilterActive: true,
    businessDays: false,
    enableAutoSchedule: true,
    tasks,
    diagnosticsLabel: 'Dependency control chrome',
    emptyStateLabel: 'No dependency rows are visible for the current query.',
    unsupportedCommandLabel: 'Linear-only recovery actions reject milestone and group rows.',
    focusTaskId: 'cap-deps',
    initialRefActionLabel: 'Ready to focus dependency audit via scrollToTask().',
    dependencyExpectation: 'Auto-schedule is active and hide mode should reveal only dependency-related rows.',
  };
};

export const createBusinessDayReviewScenario = (): ExampleScenarioDescriptor => {
  const tasks = createBusinessDayCapabilityTasks();
  const query = 'Weekday';

  return {
    id: 'dependency-business-days',
    title: 'Examples / business-day review view',
    query,
    filterMode: 'highlight',
    highlightedTaskIds: new Set(HIGHLIGHTED_TASK_IDS),
    filteredTaskIds: createTrackedFilterIds(tasks, query),
    isFilterActive: true,
    businessDays: true,
    enableAutoSchedule: true,
    tasks,
    diagnosticsLabel: 'Business-day chrome',
    emptyStateLabel: 'No weekday-focused rows matched the current query.',
    dependencyExpectation: 'Business-day mode should stay deterministic while ref state remains visible.',
  };
};

export const createInvalidDependencyExampleTasks = (): CapabilityTask[] =>
  createInvalidDependencyCapabilityTasks();

export const exampleScenarioCatalog = [
  createProgramWorkspaceScenario,
  createSearchAndHighlightScenario,
  createDependencyControlCenterScenario,
  createBusinessDayReviewScenario,
] as const;
