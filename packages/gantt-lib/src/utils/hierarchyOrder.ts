// START_MODULE_CONTRACT
// PURPOSE: Order task hierarchies and roll parent dates/progress from direct children.
// SCOPE: Compact group boundary classes from full visible order, stable depth-first ordering and one indexed bottom-up normalization pass; preserve fixed date boundaries and optional manual parent progress.
// INPUTS: Task hierarchy and optional per-parent progressAggregation.
// OUTPUTS: Normalized hierarchy with unchanged default duration-weighted progress semantics.
// DEPENDS: scheduling types, dateUtils
// LINKS: M-SCHEDULE, fn-normalizeHierarchyTasks
// ROLE: RUNTIME
// MAP_MODE: EXPORTS
// END_MODULE_CONTRACT
import type { Task } from '../types';
import { normalizeTaskDates } from './dateUtils';
import { activityBounds } from './activities';
import { resolveFixedDates, resolveParentFixedDates } from '../core/scheduling/fixedDates';
import { getChildDateBounds, getChildDurationWeight } from '../core/scheduling/hierarchy';
import { normalizeTaskDatesForType } from './taskType';

type HierarchyTask = Task & {
  sortOrder?: number;
};

/**
 * Build a stable depth-first task order from parentId links.
 * Sibling order follows the order in the input array.
 * Tasks with missing parents are treated as root tasks.
 */
export function flattenHierarchy<T extends HierarchyTask>(tasks: T[]): T[] {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const byParent = new Map<string | undefined, T[]>();
  const originalIndexById = new Map(tasks.map((task, index) => [task.id, index]));

  for (const task of tasks) {
    const normalizedParentId = task.parentId && byId.has(task.parentId)
      ? task.parentId
      : undefined;
    const siblings = byParent.get(normalizedParentId) ?? [];
    siblings.push(task);
    byParent.set(normalizedParentId, siblings);
  }

  for (const siblings of byParent.values()) {
    siblings.sort((left, right) => {
      const leftSortOrder = left.sortOrder;
      const rightSortOrder = right.sortOrder;

      if (leftSortOrder !== undefined || rightSortOrder !== undefined) {
        const normalizedLeftSortOrder = leftSortOrder ?? Number.MAX_SAFE_INTEGER;
        const normalizedRightSortOrder = rightSortOrder ?? Number.MAX_SAFE_INTEGER;
        if (normalizedLeftSortOrder !== normalizedRightSortOrder) {
          return normalizedLeftSortOrder - normalizedRightSortOrder;
        }
      }

      return (originalIndexById.get(left.id) ?? 0) - (originalIndexById.get(right.id) ?? 0);
    });
  }

  const result: T[] = [];
  const visited = new Set<string>();

  const walk = (parentId?: string) => {
    const children = byParent.get(parentId) ?? [];
    for (const task of children) {
      if (visited.has(task.id)) continue;
      visited.add(task.id);
      result.push(task);
      walk(task.id);
    }
  };

  walk(undefined);

  for (const task of tasks) {
    if (!visited.has(task.id)) {
      result.push(task);
    }
  }

  return result;
}

/**
 * Normalize hierarchy-aware display fields.
 * Parent dates are recomputed from children; progress is recomputed unless manual aggregation is requested,
 * taking precedence over any hardcoded parent values from the input.
 * Also normalizes task dates to ensure startDate is always before or equal to endDate.
 */
export function normalizeHierarchyTasks<T extends HierarchyTask>(tasks: T[], businessDays = false, weekendPredicate?: (date: Date) => boolean): T[] {
  const parentIds = new Set(tasks.map(task => task.parentId).filter(Boolean));
  const orderedTasks = flattenHierarchy(tasks).map((task) => {
    // Строка с работами сама зависит сроками от них: её границы — это охват
    // activities. Иначе родитель (секция/этаж) считался бы от устаревших дат
    // задачи после переноса отдельной работы. Затем — обычная нормализация дат.
    const bounds = activityBounds(task.activities);
    const start = bounds?.startDate ?? task.startDate;
    const end = bounds?.endDate ?? task.endDate;
    if (!start || !end) {
      return normalizeTaskDatesForType({
        ...task,
        startDate: task.fixedStartDate ?? start,
        endDate: task.fixedEndDate ?? end,
      });
    }
    const { startDate, endDate } = normalizeTaskDates(start, end);
    if (!task.fixedStartDate && !task.fixedEndDate) {
      return { ...task, startDate: startDate as T['startDate'], endDate: endDate as T['endDate'] };
    }
    const range = resolveFixedDates(task, { start: new Date(startDate), end: new Date(endDate) }, parentIds.has(task.id));
    return { ...task, startDate: range.start.toISOString().slice(0, 10) as T['startDate'], endDate: range.end.toISOString().slice(0, 10) as T['endDate'] };
  }) as T[];

  const childrenByParent = new Map<string, number[]>();
  const taskIndex = new Map(orderedTasks.map((task, index) => [task.id, index]));
  for (let index = 0; index < orderedTasks.length; index++) {
    const parentId = orderedTasks[index].parentId;
    if (!parentId) continue;
    const children = childrenByParent.get(parentId) ?? [];
    children.push(index);
    childrenByParent.set(parentId, children);
  }

  for (let index = orderedTasks.length - 1; index >= 0; index--) {
    const children = childrenByParent.get(orderedTasks[index].id);
    if (!children?.length) continue;
    const childTasks = children.map(childIndex => orderedTasks[childIndex]);
    let totalWeight = 0;
    let weightedProgress = 0;
    for (const child of childTasks) {
      const duration = getChildDurationWeight(child);
      totalWeight += duration;
      weightedProgress += duration * (child.progress ?? 0);
    }
    const task = orderedTasks[index];
    const range = resolveParentFixedDates(task, getChildDateBounds(childTasks), id => {
      const predecessorIndex = taskIndex.get(id);
      return predecessorIndex === undefined ? undefined : orderedTasks[predecessorIndex];
    }, businessDays, weekendPredicate);
    orderedTasks[index] = {
      ...task,
      startDate: (Number.isFinite(+range.start) ? range.start.toISOString().slice(0, 10) : undefined) as T['startDate'],
      endDate: (Number.isFinite(+range.end) ? range.end.toISOString().slice(0, 10) : undefined) as T['endDate'],
      progress: (orderedTasks[index].progressAggregation === 'manual'
        ? orderedTasks[index].progress
        : totalWeight === 0 ? 0 : Math.round((weightedProgress / totalWeight) * 10) / 10) as T['progress'],
    };
  }

  return orderedTasks;
}

/** Group edges use the full visible order, not the virtualized DOM window. */
export function compactGroupBoundaryClasses<T extends { parentId?: string | null }>(
  tasks: readonly T[], index: number, compositeParents: { has(id: string): boolean },
): string | undefined {
  const parentId = tasks[index]?.parentId;
  if (!parentId || !compositeParents.has(parentId)) return undefined;
  const classes = [
    tasks[index - 1]?.parentId !== parentId ? 'gantt-compact-group-start' : '',
    tasks[index + 1]?.parentId !== parentId ? 'gantt-compact-group-end' : '',
  ].filter(Boolean).join(' ');
  return classes || undefined;
}
