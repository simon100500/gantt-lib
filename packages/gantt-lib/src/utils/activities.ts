import { calculateTaskBar } from './geometry';
import { parseUTCDate } from './dateUtils';
import type { TaskActivity } from '../types';

// Шаг дорожки работ в строке: брусок 24px (как главный) + зазор 4px.
export const ACTIVITY_LANE_STEP = 28;
export const ACTIVITY_LANE_BAR_HEIGHT = 24;
// Внешний отступ пачки дорожек от границ строки.
export const ACTIVITY_LANES_PADDING = 2;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ActivitySegment {
  id: string;
  name: string;
  color?: string;
  /** Lane index counted from the top */
  lane: number;
  /** Left offset in px from the timeline start */
  left: number;
  /** Width in px, end date inclusive */
  width: number;
}

export interface ActivityLanesLayout {
  segments: ActivitySegment[];
  laneCount: number;
}

/**
 * Pack intervals into the smallest number of lanes greedily (first fit):
 * a sequential work lands in the first lane free at its start, a concurrent
 * one opens a new lane below. Lane count therefore equals the maximum number
 * of simultaneous activities.
 */
export function packIntervals<T extends { start: number; end: number }>(
  intervals: T[]
): Array<T & { lane: number }> {
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const laneEnds: number[] = [];
  return sorted.map(item => {
    let lane = 0;
    while (lane < laneEnds.length && item.start < laneEnds[lane]) {
      lane += 1;
    }
    laneEnds[lane] = item.end;
    return { ...item, lane };
  });
}

/**
 * Resolve the lane layout of one task's activities in px geometry.
 * Used both for rendering (segments) and for the row height (laneCount).
 */
export function computeActivityLanes(
  activities: TaskActivity[],
  monthStart: Date,
  dayWidth: number
): ActivityLanesLayout {
  if (activities.length === 0) {
    return { segments: [], laneCount: 0 };
  }

  const packed = packIntervals(activities.map(activity => {
    const bar = calculateTaskBar(parseUTCDate(activity.startDate), parseUTCDate(activity.endDate), monthStart, dayWidth);
    return {
      id: activity.id,
      name: activity.name,
      color: activity.color,
      start: bar.left,
      end: bar.left + bar.width,
      left: bar.left,
      width: bar.width,
    };
  }));

  return {
    segments: packed.map(({ id, name, color, lane, left, width }) => ({ id, name, color, lane, left, width })),
    laneCount: Math.max(...packed.map(item => item.lane + 1)),
  };
}

/**
 * Row height needed to show the given number of activity lanes,
 * or 0 when the row fits its normal height (single lane or none).
 */
export function activityLanesExtraHeight(laneCount: number): number {
  if (laneCount <= 1) return 0;
  return laneCount * ACTIVITY_LANE_STEP + ACTIVITY_LANES_PADDING * 2;
}

/** Inclusive day-length helper for date-based lane counting. */
export function activitySpanMs(activity: Pick<TaskActivity, 'startDate' | 'endDate'>): { start: number; end: number } {
  return {
    start: parseUTCDate(activity.startDate).getTime(),
    end: parseUTCDate(activity.endDate).getTime() + DAY_MS,
  };
}

/** Сдвиг даты на N дней с сохранением типа (ISO-строка остаётся ISO-строкой). */
export function shiftActivityDate(value: string | Date, days: number): string | Date {
  const shifted = new Date(parseUTCDate(value).getTime() + days * DAY_MS);
  return typeof value === 'string' ? shifted.toISOString().slice(0, 10) : shifted;
}

export interface ActivityChainTask {
  id: string;
  activityChain?: boolean;
  activities?: TaskActivity[];
}

export interface ActivityChainShift {
  taskId: string;
  activities: TaskActivity[];
  /** Ids of the activities that were actually shifted (chain successors). */
  shiftedIds: Set<string>;
}

/**
 * ОН-конвейер: работы едут вслед за изменённой.
 * Рёбра цепочки: внутри строки работы идут друг за другом (окончание–начало),
 * одинаковые (тот же id или имя) работы соседних строк-этажей связаны между собой.
 * Весь конвейер ниже изменённой работы сдвигается на ту же дельту (жёстко, без пересчёта).
 * Возвращает только реально изменившиеся задачи; сама изменённая работа не сдвигается.
 */
export function shiftActivityChain(
  orderedTasks: ActivityChainTask[],
  draggedTaskId: string,
  draggedActivityId: string,
  deltaDays: number,
): ActivityChainShift[] {
  if (deltaDays === 0) return [];

  const keyOf = (taskId: string, activityId: string) => `${taskId}\u0000${activityId}`;
  const successors = new Map<string, string[]>();
  const link = (from: string, to: string) => {
    const list = successors.get(from);
    if (list) {
      if (!list.includes(to)) list.push(to);
    } else {
      successors.set(from, [to]);
    }
  };

  const flagged = orderedTasks.filter((task): task is ActivityChainTask & { activities: TaskActivity[] } =>
    Boolean(task.activityChain) && Array.isArray(task.activities) && task.activities.length > 0);
  for (const task of flagged) {
    for (let i = 0; i < task.activities.length - 1; i += 1) {
      link(keyOf(task.id, task.activities[i].id), keyOf(task.id, task.activities[i + 1].id));
    }
  }
  for (let i = 0; i < flagged.length - 1; i += 1) {
    const current = flagged[i];
    const next = flagged[i + 1];
    for (const activity of current.activities) {
      const twin = next.activities.find(candidate => candidate.id === activity.id || candidate.name === activity.name);
      if (twin) link(keyOf(current.id, activity.id), keyOf(next.id, twin.id));
    }
  }

  const visited = new Set<string>();
  const queue = [...(successors.get(keyOf(draggedTaskId, draggedActivityId)) ?? [])];
  while (queue.length > 0) {
    const key = queue.shift() as string;
    if (visited.has(key)) continue;
    visited.add(key);
    queue.push(...(successors.get(key) ?? []));
  }
  if (visited.size === 0) return [];

  const shiftedByTask = new Map<string, Set<string>>();
  for (const key of visited) {
    const [taskId, activityId] = key.split('\u0000');
    const set = shiftedByTask.get(taskId);
    if (set) set.add(activityId);
    else shiftedByTask.set(taskId, new Set([activityId]));
  }

  const shifts: ActivityChainShift[] = [];
  for (const task of orderedTasks) {
    const shiftedIds = shiftedByTask.get(task.id);
    if (!shiftedIds) continue;
    shifts.push({
      taskId: task.id,
      shiftedIds: shiftedIds,
      activities: (task.activities ?? []).map(activity => shiftedIds.has(activity.id)
        ? {
          ...activity,
          startDate: shiftActivityDate(activity.startDate, deltaDays),
          endDate: shiftActivityDate(activity.endDate, deltaDays),
        }
        : activity),
    });
  }
  return shifts;
}
