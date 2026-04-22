import type { CapabilityTask } from './createCapabilityTasks';

const DAY = 24 * 60 * 60 * 1000;
const OWNER_POOL = ['Ops', 'Platform', 'PMO', 'QA', 'Infra', 'Design'] as const;
const STATUS_POOL = ['Queued', 'Review', 'In progress', 'Blocked', 'Accepted'] as const;
const COLOR_POOL = ['#2563eb', '#0ea5e9', '#7c3aed', '#f97316', '#ef4444', '#14b8a6'] as const;
const RISK_POOL: CapabilityTask['risk'][] = ['low', 'medium', 'high'];

const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10);

const shiftDate = (isoDate: string, days: number): string => {
  const source = new Date(`${isoDate}T00:00:00.000Z`);
  return toIsoDate(new Date(source.getTime() + days * DAY));
};

export const heavyDataTierOrder = ['around-100', 'around-500', 'around-1000'] as const;

export type HeavyDataDensityTier = (typeof heavyDataTierOrder)[number];

export interface HeavyDataTierConfig {
  tier: HeavyDataDensityTier;
  approxLabel: '~100 rows' | '~500 rows' | '~1000 rows';
  exactRowCount: number;
  groupCount: number;
  childRowsPerGroup: number;
  collapsedGroupCount: number;
  anchorDate: string;
  focusTaskId: string;
  reviewNotes: string[];
}

export interface HeavyDataFixture {
  tier: HeavyDataDensityTier;
  approxLabel: HeavyDataTierConfig['approxLabel'];
  exactRowCount: number;
  focusTaskId: string;
  reviewNotes: string[];
  initiallyCollapsedParentIds: string[];
  tasks: CapabilityTask[];
}

const heavyDataTierConfigs: Record<HeavyDataDensityTier, HeavyDataTierConfig> = {
  'around-100': {
    tier: 'around-100',
    approxLabel: '~100 rows',
    exactRowCount: 102,
    groupCount: 6,
    childRowsPerGroup: 16,
    collapsedGroupCount: 2,
    anchorDate: '2026-05-04',
    focusTaskId: 'heavy-around-100-group-03-task-08',
    reviewNotes: [
      'Use this tier to sanity-check readability before denser reviews.',
      'Two groups start collapsed so visible-row diagnostics can drift if collapse math regresses.',
    ],
  },
  'around-500': {
    tier: 'around-500',
    approxLabel: '~500 rows',
    exactRowCount: 510,
    groupCount: 30,
    childRowsPerGroup: 16,
    collapsedGroupCount: 5,
    anchorDate: '2026-05-11',
    focusTaskId: 'heavy-around-500-group-12-task-08',
    reviewNotes: [
      'Use this tier to inspect chart/list density and scanline fatigue in a realistic mid-scale board.',
      'Five groups start collapsed to keep visible-row counts and rendered totals explicit during review.',
    ],
  },
  'around-1000': {
    tier: 'around-1000',
    approxLabel: '~1000 rows',
    exactRowCount: 1020,
    groupCount: 60,
    childRowsPerGroup: 16,
    collapsedGroupCount: 8,
    anchorDate: '2026-05-18',
    focusTaskId: 'heavy-around-1000-group-24-task-08',
    reviewNotes: [
      'Use this tier to inspect dense rendering pressure before choosing follow-up optimization work.',
      'Collapsed groups make row totals and hidden descendants observable instead of implicit.',
    ],
  },
};

const isHeavyDataDensityTier = (value: string): value is HeavyDataDensityTier =>
  heavyDataTierOrder.includes(value as HeavyDataDensityTier);

const getStatusLabel = (index: number): CapabilityTask['statusLabel'] =>
  STATUS_POOL[index % STATUS_POOL.length];

const getOwner = (index: number): CapabilityTask['owner'] => OWNER_POOL[index % OWNER_POOL.length];

const getRisk = (index: number): CapabilityTask['risk'] => RISK_POOL[index % RISK_POOL.length];

const getColor = (index: number): string => COLOR_POOL[index % COLOR_POOL.length];

const createGroupTask = (
  config: HeavyDataTierConfig,
  groupIndex: number,
): CapabilityTask => {
  const groupNumber = String(groupIndex + 1).padStart(2, '0');
  const startDate = shiftDate(config.anchorDate, groupIndex % 9);
  const endDate = shiftDate(startDate, 18 + (groupIndex % 4));

  return {
    id: `heavy-${config.tier}-group-${groupNumber}`,
    name: `Program group ${groupNumber}`,
    startDate,
    endDate,
    progress: (groupIndex * 11) % 101,
    accepted: groupIndex % 4 === 0,
    color: getColor(groupIndex),
    owner: getOwner(groupIndex),
    statusLabel: getStatusLabel(groupIndex),
    risk: getRisk(groupIndex),
    baselineStartDate: startDate,
    baselineEndDate: shiftDate(endDate, -1),
  };
};

const createChildTask = (
  config: HeavyDataTierConfig,
  groupTask: CapabilityTask,
  groupIndex: number,
  childIndex: number,
): CapabilityTask => {
  const groupNumber = String(groupIndex + 1).padStart(2, '0');
  const childNumber = String(childIndex + 1).padStart(2, '0');
  const isMilestone = childIndex === config.childRowsPerGroup - 1;
  const startDate = shiftDate(String(groupTask.startDate), childIndex);
  const endDate = isMilestone ? startDate : shiftDate(startDate, 1 + (childIndex % 3));
  const dependencyTaskId =
    childIndex === 0
      ? undefined
      : `heavy-${config.tier}-group-${groupNumber}-task-${String(childIndex).padStart(2, '0')}`;

  return {
    id: `heavy-${config.tier}-group-${groupNumber}-task-${childNumber}`,
    parentId: groupTask.id,
    name: isMilestone
      ? `Milestone ${groupNumber}.${childNumber}`
      : `Task ${groupNumber}.${childNumber} · ${['layout', 'sync', 'handoff', 'validation'][childIndex % 4]}`,
    type: isMilestone ? 'milestone' : undefined,
    startDate,
    endDate,
    progress: isMilestone ? 0 : ((groupIndex + 1) * (childIndex + 3) * 7) % 101,
    accepted: !isMilestone && (groupIndex + childIndex) % 5 === 0,
    color: getColor(groupIndex + childIndex + 1),
    owner: getOwner(groupIndex + childIndex + 1),
    statusLabel: isMilestone ? 'Pending' : getStatusLabel(groupIndex + childIndex + 1),
    risk: getRisk(groupIndex + childIndex + 1),
    dependencies: dependencyTaskId
      ? [
          {
            taskId: dependencyTaskId,
            type: childIndex % 2 === 0 ? 'FS' : 'SS',
            lag: childIndex % 3 === 0 ? 1 : 0,
          },
        ]
      : [],
    baselineStartDate: startDate,
    baselineEndDate: isMilestone ? startDate : shiftDate(endDate, -1),
  };
};

const getTierConfig = (tier: HeavyDataDensityTier | string): HeavyDataTierConfig => {
  if (!isHeavyDataDensityTier(tier)) {
    throw new Error(
      `Unsupported heavy data density tier: ${tier}. Expected one of ${heavyDataTierOrder.join(', ')}.`,
    );
  }

  return heavyDataTierConfigs[tier];
};

export const assertHeavyDataTaskIntegrity = (tasks: CapabilityTask[]): CapabilityTask[] => {
  if (tasks.length === 0) {
    throw new Error('Heavy data fixtures must generate at least one row.');
  }

  const seenIds = new Set<string>();
  const taskIds = new Set(tasks.map((task) => task.id));

  for (const task of tasks) {
    if (!task.id) {
      throw new Error('Heavy data fixtures require every task to have a stable id.');
    }

    if (seenIds.has(task.id)) {
      throw new Error(`Heavy data fixtures found a duplicate task id: ${task.id}.`);
    }
    seenIds.add(task.id);

    if (task.parentId && !taskIds.has(task.parentId)) {
      throw new Error(
        `Heavy data fixtures found a missing parent link for ${task.id}: ${task.parentId}.`,
      );
    }
  }

  return tasks;
};

export const createHeavyDataTasks = (tier: HeavyDataDensityTier | string): CapabilityTask[] => {
  const config = getTierConfig(tier);
  const tasks: CapabilityTask[] = [];

  for (let groupIndex = 0; groupIndex < config.groupCount; groupIndex += 1) {
    const groupTask = createGroupTask(config, groupIndex);
    tasks.push(groupTask);

    for (let childIndex = 0; childIndex < config.childRowsPerGroup; childIndex += 1) {
      tasks.push(createChildTask(config, groupTask, groupIndex, childIndex));
    }
  }

  if (tasks.length !== config.exactRowCount) {
    throw new Error(
      `Heavy data fixture drift for ${config.tier}: expected ${config.exactRowCount} rows, received ${tasks.length}.`,
    );
  }

  return assertHeavyDataTaskIntegrity(tasks.map((task) => ({ ...task })));
};

export const getHeavyDataCollapsedParentIds = (
  tier: HeavyDataDensityTier | string,
): string[] => {
  const config = getTierConfig(tier);

  return Array.from({ length: config.collapsedGroupCount }, (_, index) => {
    const groupNumber = String(index + 1).padStart(2, '0');
    return `heavy-${config.tier}-group-${groupNumber}`;
  });
};

export const getHeavyDataTaskCounts = (tasks: CapabilityTask[]) => {
  const totalRows = tasks.length;
  const groupRows = tasks.filter((task) => task.parentId == null).length;
  const milestoneRows = tasks.filter((task) => task.type === 'milestone').length;
  const leafRows = totalRows - groupRows;

  return {
    totalRows,
    groupRows,
    leafRows,
    milestoneRows,
  };
};

export const getHeavyDataVisibleRowCount = (
  tasks: CapabilityTask[],
  collapsedParentIds: Iterable<string>,
): number => {
  const collapsedSet = new Set(collapsedParentIds);
  const childrenByParent = new Map<string, CapabilityTask[]>();

  for (const task of tasks) {
    if (!task.parentId) {
      continue;
    }

    const siblings = childrenByParent.get(task.parentId) ?? [];
    siblings.push(task);
    childrenByParent.set(task.parentId, siblings);
  }

  const hiddenIds = new Set<string>();
  const visit = (parentId: string) => {
    for (const child of childrenByParent.get(parentId) ?? []) {
      if (hiddenIds.has(child.id)) {
        continue;
      }

      hiddenIds.add(child.id);
      visit(child.id);
    }
  };

  for (const parentId of collapsedSet) {
    visit(parentId);
  }

  return tasks.filter((task) => !hiddenIds.has(task.id)).length;
};

export const createHeavyDataFixture = (tier: HeavyDataDensityTier | string): HeavyDataFixture => {
  const config = getTierConfig(tier);

  return {
    tier: config.tier,
    approxLabel: config.approxLabel,
    exactRowCount: config.exactRowCount,
    focusTaskId: config.focusTaskId,
    reviewNotes: [...config.reviewNotes],
    initiallyCollapsedParentIds: getHeavyDataCollapsedParentIds(config.tier),
    tasks: createHeavyDataTasks(config.tier),
  };
};

export const heavyDataFixtures = heavyDataTierOrder.map((tier) => createHeavyDataFixture(tier));
export const heavyDataExactRowCounts = heavyDataTierOrder.map(
  (tier) => heavyDataTierConfigs[tier].exactRowCount,
);
