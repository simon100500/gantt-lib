import { buildTaskRangeFromEnd, buildTaskRangeFromStart, getTaskDuration } from '../../core/scheduling';
import type { TaskDateChangeMode } from '../../types';
import { parseUTCDate } from '../../utils/dateUtils';
import type { Task } from '../GanttChart';

export const taskDateISO = (date: string | Date) => (
  date instanceof Date ? date.toISOString().slice(0, 10) : date.split('T')[0]
);

export function getTaskDatePin<TTask extends Task>({ task, boundary, isParent, mode, businessDays, isWeekend, canToggle, onChange }: {
  task: TTask;
  boundary: 'start' | 'end';
  isParent: boolean;
  mode?: TaskDateChangeMode;
  businessDays?: boolean;
  isWeekend: (date: Date) => boolean;
  canToggle: boolean;
  onChange?: (update: TTask) => void;
}) {
  const isStart = boundary === 'start';
  const isMilestone = task.type === 'milestone';
  const field = isStart ? 'fixedStartDate' : 'fixedEndDate';
  const oppositeAnchor = isStart ? task.fixedEndDate : task.fixedStartDate;
  const fixedDate = task[field] ?? (isMilestone ? oppositeAnchor : null);
  const currentDate = taskDateISO(isStart ? task.startDate : task.endDate);
  const preserveDuration = mode === 'preserve-duration';
  const moveBothPins = !isMilestone && !!oppositeAnchor && preserveDuration;
  const keepOppositeDate = !isMilestone && !oppositeAnchor && !isParent && !preserveDuration;
  const pinAction = onChange && !task.locked && canToggle ? {
    label: fixedDate ? 'Снять закрепление' : 'Закрепить текущую дату',
    run: () => onChange(isMilestone && fixedDate
      ? { ...task, fixedStartDate: null, fixedEndDate: null }
      : { ...task, [field]: fixedDate ? null : currentDate }),
  } : undefined;

  return {
    value: fixedDate ?? currentDate,
    pinAction,
    disableDuration: isMilestone || (!!fixedDate && isParent && !oppositeAnchor),
    note: fixedDate && (moveBothPins ? 'Обе закреплённые даты сдвинутся.'
      : isParent && !oppositeAnchor ? 'Длительность этапа зависит от вложенных работ.' : undefined),
    fixedDateEdit: fixedDate ? {
      title: isMilestone ? 'Закреплённая дата вехи' : isStart ? 'Закреплённое начало' : 'Закреплённое окончание',
      validate: (date: string) => {
        if (isMilestone || moveBothPins) return;
        const opposite = oppositeAnchor ?? (keepOppositeDate ? taskDateISO(isStart ? task.endDate : task.startDate) : null);
        if (!opposite) return;
        if (isStart && date > opposite) return oppositeAnchor ? 'Начало позже закреплённого окончания.' : 'Начало позже окончания.';
        if (!isStart && date < opposite) return oppositeAnchor ? 'Окончание раньше закреплённого начала.' : 'Окончание раньше начала.';
      },
    } : undefined,
    changeFixedDate: (date: string) => {
      const update = {
        ...task,
        fixedStartDate: task.fixedStartDate && (isStart || isMilestone) ? date : task.fixedStartDate,
        fixedEndDate: task.fixedEndDate && (!isStart || isMilestone) ? date : task.fixedEndDate,
      };
      if (moveBothPins) {
        const duration = getTaskDuration(task.startDate, task.endDate, businessDays, isWeekend);
        const selected = parseUTCDate(date);
        if (isStart) update.fixedEndDate = taskDateISO(buildTaskRangeFromStart(selected, duration, businessDays, isWeekend).end);
        else update.fixedStartDate = taskDateISO(buildTaskRangeFromEnd(selected, duration, businessDays, isWeekend).start);
      } else if (keepOppositeDate) {
        if (isStart) update.startDate = date;
        else update.endDate = date;
      }
      onChange?.(update);
    },
  };
}
