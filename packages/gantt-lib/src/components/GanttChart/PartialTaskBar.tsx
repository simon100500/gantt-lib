import React, { useRef, useState } from 'react';
import { alignToWorkingDay, parseDateOnly } from '../../core/scheduling/dateMath';
import { resolveTaskHorizontalGeometry } from '../../utils/geometry';
import type { Task } from './GanttChart';

interface PartialTaskBarProps {
  task: Task;
  date: string | Date;
  dayWidth: number;
  monthStart: Date;
  weekendPredicate?: (date: Date) => boolean;
  onChange?: (task: Task) => void;
}

export function PartialTaskBar({ task, date, dayWidth, monthStart, weekendPredicate, onChange }: PartialTaskBarProps) {
  const drag = useRef<{ id: number; x: number; scrollLeft: number; container: HTMLElement | null } | null>(null);
  const [preview, setPreview] = useState<Date>();
  const isStart = !!task.startDate;
  const pinned = isStart ? task.fixedStartDate : task.fixedEndDate;
  const movable = !!onChange && !task.locked && !pinned;
  const field = isStart ? 'startDate' : 'endDate';
  const displayedDate = preview ?? date;
  const geometry = resolveTaskHorizontalGeometry({ ...task, [field]: displayedDate }, monthStart, dayWidth);
  const boundary = isStart ? 'начало' : 'окончание';
  const label = `${task.name} · ${pinned ? `Закреплено ${boundary}` : isStart ? 'Окончание не задано' : 'Начало не задано'}`;

  const shiftDate = (days: number) => {
    const shifted = parseDateOnly(date);
    shifted.setUTCDate(shifted.getUTCDate() + days);
    return days && weekendPredicate ? alignToWorkingDay(shifted, days < 0 ? -1 : 1, weekendPredicate) : shifted;
  };
  const commit = (next: Date) => {
    if (+next !== +parseDateOnly(date)) onChange?.({ ...task, [field]: next.toISOString().slice(0, 10) });
  };
  const getDelta = (event: React.PointerEvent) => {
    const state = drag.current!;
    const scrollDelta = (state.container?.scrollLeft ?? 0) - state.scrollLeft;
    return Math.round((event.clientX - state.x + scrollDelta) / dayWidth);
  };
  const reset = () => {
    drag.current = null;
    setPreview(undefined);
  };
  return <div
    className="gantt-partial-task"
    data-taskbar={movable || undefined}
    data-open-edge={isStart ? 'end' : 'start'}
    data-movable={movable || undefined}
    data-dragging={preview !== undefined || undefined}
    tabIndex={movable ? 0 : undefined}
    aria-label={movable ? `${label}. Дата перемещается стрелками влево и вправо` : label}
    title={label}
    style={{
      '--gantt-partial-anchor': `${isStart ? geometry.left : geometry.right}px`,
      '--gantt-partial-color': task.color,
    } as React.CSSProperties}
    onPointerDown={event => {
      if (!movable || !event.isPrimary || event.button !== 0) return;
      const container = event.currentTarget.closest<HTMLElement>('.gantt-scrollContainer');
      drag.current = { id: event.pointerId, x: event.clientX, scrollLeft: container?.scrollLeft ?? 0, container };
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }}
    onPointerMove={event => {
      if (drag.current?.id === event.pointerId) setPreview(shiftDate(getDelta(event)));
    }}
    onPointerUp={event => {
      if (drag.current?.id !== event.pointerId) return;
      const next = shiftDate(getDelta(event));
      reset();
      if (movable) commit(next);
    }}
    onPointerCancel={reset}
    onLostPointerCapture={reset}
    onKeyDown={event => {
      if (!movable || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
      event.preventDefault();
      event.stopPropagation();
      commit(shiftDate(event.key === 'ArrowLeft' ? -1 : 1));
    }}
  >
    {pinned && <span className={`gantt-tr-fixedBoundary gantt-tr-fixedBoundary-${isStart ? 'start' : 'end'}`} aria-hidden="true" />}
  </div>;
}
