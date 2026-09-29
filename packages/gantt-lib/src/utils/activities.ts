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
