import React, { memo, useState } from 'react';
import { alignToWorkingDay, parseDateOnly } from '../../core/scheduling/dateMath';
import { shiftPickerDate } from '../../utils/dateUtils';
import { CellDatePicker } from '../SimpleGridVendor/DatePicker';
import type { Task } from './GanttChart';

interface UnscheduledTaskDatesProps {
  task: Task;
  initialMonth: Date;
  weekendPredicate?: (date: Date) => boolean;
  onTasksChange?: (tasks: Task[]) => void;
}

export const UnscheduledTaskDates = memo(function UnscheduledTaskDates({
  task, initialMonth, weekendPredicate, onTasksChange,
}: UnscheduledTaskDatesProps) {
  const [open, setOpen] = useState(false);
  const hasDate = !!(task.startDate || task.endDate);
  // Keep the same open calendar after the first pick. Existing one-sided rows
  // already have date cells, so they don't need a hidden second calendar.
  if (hasDate && !open) return null;

  const start = task.startDate ? parseDateOnly(task.startDate).toISOString().slice(0, 10) : undefined;
  const end = task.endDate ? parseDateOnly(task.endDate).toISOString().slice(0, 10) : undefined;
  const initialDate = initialMonth.toISOString().slice(0, 10);
  return <div className="gantt-unscheduled-task" data-has-anchor={hasDate || undefined}>
    {onTasksChange && !task.locked ? <CellDatePicker
      fields={(['startDate', 'endDate'] as const).map(id => ({
        id,
        title: id === 'startDate' ? 'Начало' : 'Окончание',
        value: (id === 'startDate' ? start : end) ?? '',
        disabled: false,
        min: id === 'endDate' ? start : undefined,
        max: id === 'startDate' ? end : undefined,
        context: {
          initialDate,
          range: { start, end, boundary: id === 'startDate' ? 'start' : 'end' },
          shiftDate: (iso, days) => shiftPickerDate(iso, days, weekendPredicate),
        },
        onPick: date => {
          const chosen = parseDateOnly(date);
          const isStart = id === 'startDate';
          const opposite = isStart ? end : start;
          const aligned = weekendPredicate ? alignToWorkingDay(chosen, isStart ? 1 : -1, weekendPredicate) : chosen;
          const crossesOther = opposite && (isStart ? aligned > parseDateOnly(opposite) : aligned < parseDateOnly(opposite));
          const iso = (crossesOther ? chosen : aligned).toISOString().slice(0, 10);
          onTasksChange([task.type === 'milestone'
            ? { ...task, startDate: iso, endDate: iso }
            : { ...task, [id]: iso }]);
        },
      }))}
      initialFieldId="startDate"
      triggerLabel="Назначить даты"
      advanceToEmptyField
      beforeOpen={() => true}
      onClose={() => {}}
      onOpenChange={setOpen}
    /> : <span>Без дат</span>}
    {!hasDate && task.durationDays !== undefined && <span>{task.durationDays} д</span>}
  </div>;
});
