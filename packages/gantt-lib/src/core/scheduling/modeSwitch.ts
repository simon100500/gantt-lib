import type { Task } from './types';
import { normalizeUTCDate, getTaskDuration, alignToWorkingDay } from './dateMath';
import { buildTaskRangeFromStart } from './commands';
import { computeParentDates, isTaskParent } from './hierarchy';
import { recalculateProjectSchedule } from './execute';

/**
 * Recalculate all task dates when switching between business/calendar day modes.
 *
 * Mode switch semantics are not a simple per-task move:
 * 1. Leaf tasks first preserve their current duration count while snapping to
 *    the target calendar rules.
 * 2. Parent tasks roll up from children.
 * 3. The full dependency graph is then recalculated in the target mode so
 *    successors obey the new FS/SS/FF/SF semantics (for example Fri -> Mon in
 *    business mode, Fri -> Sat in calendar mode).
 */
export function reflowTasksOnModeSwitch(
  sourceTasks: Task[],
  toBusinessDays: boolean,
  weekendPredicate: (date: Date) => boolean
): Task[] {
  const fromBusinessDays = !toBusinessDays;
  let tasks: Task[] = sourceTasks.map(task => ({
    ...task,
    dependencies: task.dependencies?.map(dependency => ({ ...dependency })),
  }));

  const toISO = (date: Date) => date.toISOString().split('T')[0];

  for (const task of tasks) {
    if (isTaskParent(task.id, tasks)) continue;

    const start = normalizeUTCDate(new Date(`${task.startDate}T00:00:00.000Z`));
    const duration = getTaskDuration(task.startDate, task.endDate, fromBusinessDays, weekendPredicate);

    const range = toBusinessDays
      ? buildTaskRangeFromStart(
          alignToWorkingDay(start, 1, weekendPredicate),
          duration,
          true,
          weekendPredicate
        )
      : buildTaskRangeFromStart(start, duration, false);

    task.startDate = toISO(range.start);
    task.endDate = toISO(range.end);
  }

  for (const task of tasks) {
    if (!isTaskParent(task.id, tasks)) continue;
    const { startDate, endDate } = computeParentDates(task.id, tasks);
    task.startDate = toISO(startDate);
    task.endDate = toISO(endDate);
  }

  const rescheduled = recalculateProjectSchedule(tasks, {
    businessDays: toBusinessDays,
    weekendPredicate,
  });

  if (rescheduled.changedTasks.length === 0) {
    return tasks;
  }

  const updates = new Map(rescheduled.changedTasks.map((task): [string, Task] => [task.id, task]));
  return tasks.map(task => updates.get(task.id) ?? task);
}
