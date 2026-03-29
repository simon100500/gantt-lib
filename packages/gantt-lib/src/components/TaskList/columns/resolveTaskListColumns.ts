import type { Task } from '../../GanttChart';
import type { TaskListColumn, TaskListColumnAnchor } from './types';

// Stub implementation — will be replaced in GREEN phase
export function resolveTaskListColumns<TTask extends Task>(
  _builtIn: TaskListColumn<TTask>[],
  _custom: TaskListColumn<TTask>[],
): TaskListColumn<TTask>[] {
  return [];
}
