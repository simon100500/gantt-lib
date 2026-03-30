import type { Task } from '../../GanttChart';
import type { TaskListColumn } from './types';

export const BUILT_IN_COLUMN_WIDTHS: Record<string, number> = {
  number: 40,
  name: 200,
  startDate: 90,
  endDate: 90,
  duration: 60,
  progress: 50,
  dependencies: 120,
  actions: 80,
};

export function createBuiltInColumns<TTask extends Task>(opts?: {
  businessDays?: boolean;
}): TaskListColumn<TTask>[] {
  return [
    { id: 'number', header: '\u2116', width: BUILT_IN_COLUMN_WIDTHS.number, renderCell: () => null },
    { id: 'name', header: '\u0418\u043C\u044F', width: BUILT_IN_COLUMN_WIDTHS.name, renderCell: () => null },
    { id: 'startDate', header: '\u041D\u0430\u0447\u0430\u043B\u043E', width: BUILT_IN_COLUMN_WIDTHS.startDate, renderCell: () => null },
    { id: 'endDate', header: '\u041E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u0435', width: BUILT_IN_COLUMN_WIDTHS.endDate, renderCell: () => null },
    { id: 'duration', header: opts?.businessDays ? '\u0414\u043D. (\u0440)' : '\u0414\u043D.', width: BUILT_IN_COLUMN_WIDTHS.duration, renderCell: () => null },
    { id: 'progress', header: '%', width: BUILT_IN_COLUMN_WIDTHS.progress, renderCell: () => null },
    { id: 'dependencies', header: null, width: BUILT_IN_COLUMN_WIDTHS.dependencies, renderCell: () => null },
  ];
}
