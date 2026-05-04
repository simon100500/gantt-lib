import type { ReactNode } from 'react';
import type { Task } from '../../GanttChart';

export type BuiltInTaskListColumnId =
  | 'selection' | 'number' | 'name' | 'startDate' | 'endDate'
  | 'duration' | 'progress' | 'dependencies' | 'actions';

export type TaskListColumnId = BuiltInTaskListColumnId | (string & {});

export type TaskListColumnWidthMap = Partial<Record<TaskListColumnId, number>>;

export type TaskListColumnAnchor =
  | { after: BuiltInTaskListColumnId | string }
  | { before: BuiltInTaskListColumnId | string }
  | {};

export interface TaskListColumnContext<TTask extends Task> {
  task: TTask;
  rowIndex: number;
  isEditing: boolean;
  editStartValue?: string;
  openEditor: () => void;
  closeEditor: () => void;
  updateTask: (patch: Partial<TTask>) => void;
}

export type TaskListColumn<TTask extends Task> = TaskListColumnAnchor & {
  id: string;
  header: ReactNode;
  width?: number;
  minWidth?: number;
  align?: 'left' | 'center' | 'right';
  editable?: boolean;
  renderCell: (ctx: TaskListColumnContext<TTask>) => ReactNode;
  renderEditor?: (ctx: TaskListColumnContext<TTask>) => ReactNode;
  meta?: Record<string, unknown>;
};
