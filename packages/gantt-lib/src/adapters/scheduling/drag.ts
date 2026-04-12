/**
 * UI adapter: converts pixel coordinates to date ranges for drag interactions.
 * @module adapters/scheduling
 *
 * These functions bridge the chart's pixel-space (left, width, dayWidth)
 * with the scheduling domain's date-space. They depend on core scheduling
 * primitives but are NOT part of the domain core themselves.
 */

import type { Task } from '../../core/scheduling/types';
import {
  moveTaskRange,
  buildTaskRangeFromStart,
  buildTaskRangeFromEnd,
} from '../../core/scheduling/commands';
import {
  alignToWorkingDay,
  getBusinessDaysCount,
} from '../../core/scheduling/dateMath';
import { clampTaskRangeForIncomingFS } from '../../core/scheduling/commands';

/**
 * Convert pixel coordinates to a date range, applying business-day alignment
 * when businessDays mode is active. This is the pure scheduling core of
 * drag-to-date conversion.
 *
 * Extracted from useTaskDrag.ts resolveDraggedRange.
 */
export function resolveDateRangeFromPixels(
  mode: 'move' | 'resize-left' | 'resize-right',
  left: number,
  width: number,
  monthStart: Date,
  dayWidth: number,
  task: Task,
  businessDays?: boolean,
  weekendPredicate?: (date: Date) => boolean
): { start: Date; end: Date } {
  const dayOffset = Math.round(left / dayWidth);
  const rawStartDate = new Date(Date.UTC(
    monthStart.getUTCFullYear(),
    monthStart.getUTCMonth(),
    monthStart.getUTCDate() + dayOffset
  ));
  const rawEndOffset = dayOffset + Math.round(width / dayWidth) - 1;
  const rawEndDate = new Date(Date.UTC(
    monthStart.getUTCFullYear(),
    monthStart.getUTCMonth(),
    monthStart.getUTCDate() + rawEndOffset
  ));
  const isMilestone = task.type === 'milestone';

  // Milestone type has priority over incoming date span.
  // During drag, milestones are always treated as zero-duration (single date).
  if (isMilestone) {
    const anchorDate = mode === 'resize-right' ? rawEndDate : rawStartDate;
    if (businessDays && weekendPredicate) {
      const originalAnchor = mode === 'resize-right'
        ? new Date(task.endDate as string)
        : new Date(task.startDate as string);
      const snapDirection: 1 | -1 = anchorDate.getTime() >= originalAnchor.getTime() ? 1 : -1;
      const alignedDate = alignToWorkingDay(anchorDate, snapDirection, weekendPredicate);
      return { start: alignedDate, end: alignedDate };
    }
    return { start: anchorDate, end: anchorDate };
  }

  if (!(businessDays && weekendPredicate)) {
    return { start: rawStartDate, end: rawEndDate };
  }

  if (mode === 'move') {
    const originalStart = new Date(task.startDate as string);
    const snapDirection = rawStartDate.getTime() >= originalStart.getTime() ? 1 : -1;
    return moveTaskRange(
      task.startDate,
      task.endDate,
      rawStartDate,
      true,
      weekendPredicate,
      snapDirection
    );
  }

  if (mode === 'resize-right') {
    const fixedStart = new Date(task.startDate as string);
    const originalEnd = new Date(task.endDate as string);
    const snapDirection: 1 | -1 = rawEndDate.getTime() >= originalEnd.getTime() ? 1 : -1;
    const alignedEnd = alignToWorkingDay(rawEndDate, snapDirection, weekendPredicate);
    const duration = Math.max(1, getBusinessDaysCount(fixedStart, alignedEnd, weekendPredicate));
    return buildTaskRangeFromStart(fixedStart, duration, true, weekendPredicate);
  }

  const fixedEnd = new Date(task.endDate as string);
  const originalStart = new Date(task.startDate as string);
  const snapDirection: 1 | -1 = rawStartDate.getTime() >= originalStart.getTime() ? 1 : -1;
  const alignedStart = alignToWorkingDay(rawStartDate, snapDirection, weekendPredicate);
  const duration = Math.max(1, getBusinessDaysCount(alignedStart, fixedEnd, weekendPredicate));
  return buildTaskRangeFromEnd(fixedEnd, duration, true, weekendPredicate);
}

/**
 * Clamp a proposed date range based on incoming FS dependencies.
 * For resize-right mode, returns range unchanged (only start is clamped).
 *
 * Extracted from useTaskDrag.ts clampDraggedRangeForIncomingFS.
 */
export function clampDateRangeForIncomingFS(
  task: Task,
  range: { start: Date; end: Date },
  allTasks: Task[],
  mode: 'move' | 'resize-left' | 'resize-right',
  businessDays?: boolean,
  weekendPredicate?: (date: Date) => boolean
): { start: Date; end: Date } {
  if (mode === 'resize-right') {
    return range;
  }

  return clampTaskRangeForIncomingFS(
    task,
    range.start,
    range.end,
    allTasks,
    businessDays,
    weekendPredicate
  );
}
