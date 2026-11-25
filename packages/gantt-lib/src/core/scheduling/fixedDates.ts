// START_MODULE_CONTRACT
// PURPOSE: Resolve independently fixed task boundaries without changing anchor values.
// SCOPE: Parent rollups and incoming constraints, leaf durations and milestone dates; reject incompatible anchors.
// INPUTS: Task, proposed range, hierarchy status and scheduling calendar.
// OUTPUTS: Non-inverted range retaining each supplied fixed date.
// DEPENDS: scheduling types, dateMath, commands
// LINKS: M-SCHEDULING
// ROLE: RUNTIME
// MAP_MODE: EXPORTS
// END_MODULE_CONTRACT
import type { Task } from './types';
import { parseDateOnly, getTaskDuration } from './dateMath';
import { buildTaskRangeFromStart, buildTaskRangeFromEnd } from './commands';
import { calculateSuccessorDate, getDependencyLag, normalizePredecessorDates } from './dependencies';

export function resolveFixedDates(
  task: Task,
  range: { start: Date; end: Date },
  parent: boolean,
  businessDays = false,
  weekendPredicate?: (date: Date) => boolean,
  preserveDuration = true,
): { start: Date; end: Date } {
  for (const value of [task.fixedStartDate, task.fixedEndDate]) {
    if (value && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value)) {
      throw new Error(`Invalid fixed date on task ${task.id}`);
    }
  }
  const fixedStart = task.fixedStartDate ? parseDateOnly(task.fixedStartDate) : undefined;
  const fixedEnd = task.fixedEndDate ? parseDateOnly(task.fixedEndDate) : undefined;
  if (!fixedStart && !fixedEnd) return range;
  if (fixedStart && fixedEnd && (fixedStart > fixedEnd || (task.type === 'milestone' && +fixedStart !== +fixedEnd))) {
    throw new Error(`Fixed dates conflict on task ${task.id}`);
  }
  if (task.type === 'milestone') {
    const date = fixedStart ?? fixedEnd!;
    return { start: date, end: date };
  }
  if (fixedStart && fixedEnd) return { start: fixedStart, end: fixedEnd };
  if (!parent && preserveDuration) {
    const duration = getTaskDuration(task.startDate, task.endDate, businessDays, weekendPredicate);
    if (fixedStart) return { start: fixedStart, end: buildTaskRangeFromStart(fixedStart, duration, businessDays, weekendPredicate).end };
    return { start: buildTaskRangeFromEnd(fixedEnd!, duration, businessDays, weekendPredicate).start, end: fixedEnd! };
  }
  if (fixedStart) return { start: fixedStart, end: range.end < fixedStart ? fixedStart : range.end };
  return { start: range.start > fixedEnd! ? fixedEnd! : range.start, end: fixedEnd! };
}

export function resolveParentFixedDates(
  task: Task,
  range: { start: Date; end: Date },
  getTask: (id: string) => Task | undefined,
  businessDays = false,
  weekendPredicate?: (date: Date) => boolean,
): { start: Date; end: Date } {
  if (!task.fixedStartDate && !task.fixedEndDate) return range;
  let { start, end } = range;
  for (const dep of task.dependencies ?? []) {
    const targetStart = dep.type === 'FS' || dep.type === 'SS';
    if (targetStart ? task.fixedStartDate : task.fixedEndDate) continue;
    const predecessor = getTask(dep.taskId);
    if (!predecessor) continue;
    const anchor = predecessor.type === 'milestone' ? predecessor.fixedStartDate ?? predecessor.fixedEndDate : undefined;
    const { predStart, predEnd } = normalizePredecessorDates({
      ...predecessor,
      startDate: anchor ?? predecessor.fixedStartDate ?? predecessor.startDate,
      endDate: anchor ?? predecessor.fixedEndDate ?? predecessor.endDate,
    }, parseDateOnly);
    const date = calculateSuccessorDate(predStart, predEnd, dep.type, getDependencyLag(dep), businessDays, weekendPredicate, task.type);
    if (targetStart && date > start) start = date;
    if (!targetStart && date > end) end = date;
  }
  return resolveFixedDates(task, { start, end }, true, businessDays, weekendPredicate);
}
