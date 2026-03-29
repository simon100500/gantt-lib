import type { ReactNode } from 'react';
import type { Task } from '../../GanttChart';

export type BuiltInTaskListColumnId =
  | 'number' | 'name' | 'startDate' | 'endDate'
  | 'duration' | 'progress' | 'dependencies' | 'actions';

export type TaskListColumnAnchor =
  | { after: BuiltInTaskListColumnId | string }
  | { before: BuiltInTaskListColumnId | string }
  | {};

export interface TaskListColumnContext<TTask extends Task> {
  task: TTask;
  rowIndex: number;
  isEditing: boolean;
  openEditor: () => void;
  closeEditor: () => void;
  updateTask: (patch: Partial<TTask>) => void;
}

export type TaskListColumn<TTask extends Task> = TaskListColumnAnchor & {
  id: string;
  header: ReactNode;
  width?: number;
  minWidth?: number;
  editable?: boolean;
  renderCell: (ctx: TaskListColumnContext<TTask>) => ReactNode;
  renderEditor?: (ctx: TaskListColumnContext<TTask>) => ReactNode;
  meta?: Record<string, unknown>;
};
