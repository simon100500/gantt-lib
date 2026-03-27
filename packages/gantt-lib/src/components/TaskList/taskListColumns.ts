import type { ReactNode } from 'react';
import type { Task } from '../GanttChart';

export type BuiltInTaskListColumnId =
  | 'number'
  | 'name'
  | 'startDate'
  | 'endDate'
  | 'duration'
  | 'progress'
  | 'dependencies'
  | 'actions';

export interface TaskListColumnContext<TTask extends Task = Task> {
  task: TTask;
  rowIndex: number;
  columnId: string;
  isEditing: boolean;
  openEditor: () => void;
  closeEditor: () => void;
  updateTask: (patch: Partial<TTask>) => void;
}

export interface TaskListColumn<TTask extends Task = Task> {
  id: string;
  header: ReactNode;
  renderCell: (row: TaskListColumnContext<TTask>) => ReactNode;
  editor?: (row: TaskListColumnContext<TTask>) => ReactNode;
  width?: string | number;
  after?: BuiltInTaskListColumnId;
  meta?: Record<string, unknown>;
}
