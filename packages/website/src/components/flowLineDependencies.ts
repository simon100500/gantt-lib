import type { Task, TaskActivityDependency } from 'gantt-lib';

/** Demo conveyor topology: consecutive works on each floor are explicitly linked. */
export function buildFlowLineDependencies(tasks: Task[]): TaskActivityDependency[] {
  return tasks.flatMap(task => (task.activities ?? []).slice(1).map((activity, index) => ({
    predecessorTaskId: task.id,
    predecessorActivityId: task.activities![index].id,
    successorTaskId: task.id,
    successorActivityId: activity.id,
    type: 'FS' as const,
    lag: activity.lag ?? 0,
  })));
}
