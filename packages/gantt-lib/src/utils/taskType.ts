import { parseUTCDate } from './dateUtils';

export type TaskType = 'task' | 'milestone';

export type TaskWithType = {
  startDate: string | Date;
  endDate: string | Date;
  type?: TaskType;
};

export const TASK_TYPE_DEFAULT = 'task';

export function getTaskType(task: { type?: TaskType }): TaskType {
  return task.type ?? TASK_TYPE_DEFAULT;
}

export function isMilestoneTask(task: { type?: TaskType }): boolean {
  return getTaskType(task) === 'milestone';
}

function normalizeMilestoneStartDate(startDateInput: string | Date): string | Date {
  const parsedStartDate = parseUTCDate(startDateInput);

  if (startDateInput instanceof Date) {
    return new Date(Date.UTC(
      parsedStartDate.getUTCFullYear(),
      parsedStartDate.getUTCMonth(),
      parsedStartDate.getUTCDate()
    ));
  }

  return parsedStartDate.toISOString().split('T')[0];
}

export function normalizeTaskDatesForType<
  TTask extends { startDate: string | Date; endDate: string | Date; type?: 'task' | 'milestone' }
>(task: TTask): TTask {
  if (!isMilestoneTask(task)) {
    return task;
  }

  const startDate = normalizeMilestoneStartDate(task.startDate);

  return {
    ...task,
    endDate: startDate,
  } as TTask;
}
