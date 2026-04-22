import { type Task } from 'gantt-lib';

const DAY = 24 * 60 * 60 * 1000;

const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10);

const shiftDate = (isoDate: string, days: number): string => {
  const source = new Date(`${isoDate}T00:00:00.000Z`);
  return toIsoDate(new Date(source.getTime() + days * DAY));
};

export type CapabilityTask = Task & {
  owner?: string;
  statusLabel?: string;
  risk?: 'low' | 'medium' | 'high';
};

export interface CapabilityFixtureOptions {
  anchorDate?: string;
}

const createBaseTasks = (anchorDate: string): CapabilityTask[] => {
  const kickoff = anchorDate;
  const designStart = shiftDate(anchorDate, 1);
  const buildStart = shiftDate(anchorDate, 3);
  const qaStart = shiftDate(anchorDate, 7);
  const launchDate = shiftDate(anchorDate, 10);

  return [
    {
      id: 'cap-program',
      name: 'Capability catalog rollout',
      startDate: kickoff,
      endDate: launchDate,
      progress: 62,
      accepted: false,
      color: '#2563eb',
      owner: 'Platform',
      statusLabel: 'In progress',
      risk: 'medium',
      baselineStartDate: kickoff,
      baselineEndDate: shiftDate(anchorDate, 9),
    },
    {
      id: 'cap-layout',
      parentId: 'cap-program',
      name: 'Stabilize layout surfaces',
      startDate: kickoff,
      endDate: shiftDate(anchorDate, 3),
      progress: 100,
      accepted: true,
      color: '#0ea5e9',
      owner: 'Alex',
      statusLabel: 'Accepted',
      risk: 'low',
      dependencies: [],
      baselineStartDate: kickoff,
      baselineEndDate: shiftDate(anchorDate, 2),
    },
    {
      id: 'cap-states',
      parentId: 'cap-program',
      name: 'Model task states and markers',
      startDate: designStart,
      endDate: shiftDate(anchorDate, 5),
      progress: 70,
      accepted: false,
      color: '#7c3aed',
      owner: 'Mira',
      statusLabel: 'Review',
      risk: 'medium',
      dependencies: [{ taskId: 'cap-layout', type: 'FS', lag: 0 }],
      baselineStartDate: designStart,
      baselineEndDate: shiftDate(anchorDate, 4),
    },
    {
      id: 'cap-interaction',
      parentId: 'cap-program',
      name: 'Exercise drag, edit, and reorder flows',
      startDate: buildStart,
      endDate: shiftDate(anchorDate, 8),
      progress: 40,
      accepted: false,
      color: '#f97316',
      owner: 'Ira',
      statusLabel: 'Needs test',
      risk: 'high',
      dependencies: [{ taskId: 'cap-states', type: 'FS', lag: 1 }],
      baselineStartDate: buildStart,
      baselineEndDate: shiftDate(anchorDate, 7),
    },
    {
      id: 'cap-deps',
      parentId: 'cap-program',
      name: 'Validate dependency semantics',
      startDate: qaStart,
      endDate: shiftDate(anchorDate, 9),
      progress: 35,
      accepted: false,
      color: '#ef4444',
      owner: 'Nora',
      statusLabel: 'Blocked',
      risk: 'high',
      dependencies: [
        { taskId: 'cap-layout', type: 'SS', lag: 1 },
        { taskId: 'cap-interaction', type: 'FS', lag: 0 },
      ],
      baselineStartDate: qaStart,
      baselineEndDate: shiftDate(anchorDate, 8),
    },
    {
      id: 'cap-launch',
      parentId: 'cap-program',
      name: 'Catalog sign-off',
      startDate: launchDate,
      endDate: launchDate,
      type: 'milestone',
      progress: 0,
      accepted: false,
      color: '#f59e0b',
      owner: 'PM',
      statusLabel: 'Pending',
      risk: 'medium',
      dependencies: [{ taskId: 'cap-deps', type: 'FS', lag: 0 }],
    },
  ];
};

export const createCapabilityTasks = (
  options: CapabilityFixtureOptions = {},
): CapabilityTask[] => {
  const anchorDate = options.anchorDate ?? '2026-04-20';
  return createBaseTasks(anchorDate);
};

export const createEmptyCapabilityTasks = (): CapabilityTask[] => [];

export const createChartOnlyCapabilityTasks = (
  options?: CapabilityFixtureOptions,
): CapabilityTask[] => createCapabilityTasks(options);

export const createTaskListOnlyCapabilityTasks = (
  options?: CapabilityFixtureOptions,
): CapabilityTask[] =>
  createCapabilityTasks(options).map((task) => {
    if (task.id === 'cap-program') {
      return {
        ...task,
        progress: 78,
        statusLabel: 'Coordinating',
      };
    }

    return task;
  });

export const createDependencyFocusedCapabilityTasks = (
  options?: CapabilityFixtureOptions,
): CapabilityTask[] =>
  createCapabilityTasks(options).map((task) => {
    if (task.id === 'cap-deps') {
      return {
        ...task,
        dependencies: [
          { taskId: 'cap-layout', type: 'SS', lag: 2 },
          { taskId: 'cap-interaction', type: 'FF', lag: -1 },
        ],
      };
    }

    return task;
  });

export const createFilteringCapabilityTasks = (
  options?: CapabilityFixtureOptions,
): CapabilityTask[] =>
  createCapabilityTasks(options).map((task) => {
    if (task.id === 'cap-interaction') {
      return {
        ...task,
        name: 'Critical interaction parity',
        progress: 15,
        statusLabel: 'Critical',
      };
    }

    if (task.id === 'cap-deps') {
      return {
        ...task,
        name: 'Critical dependency audit',
        progress: 20,
        statusLabel: 'Critical',
      };
    }

    return task;
  });

export const capabilityFixtureVariantNames = [
  'default',
  'empty',
  'chart-only',
  'task-list-only',
  'dependency-focused',
  'filtering-focused',
] as const;
