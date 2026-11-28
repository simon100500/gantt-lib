import React, { useRef, useState } from 'react';
import { alignToWorkingDay, parseDateOnly } from '../../core/scheduling/dateMath';
import { resolveTaskHorizontalGeometry } from '../../utils/geometry';
import type { Task } from './GanttChart';
import { TaskDependencyPort, type DependencyPortPointerDown } from '../TaskRow/TaskDependencyPort';

const PARTIAL_BAR_WIDTH = 72;

interface PartialTaskBarProps {
  task: Task;
  originalDate: string | Date;
  dayWidth: number;
  monthStart: Date;
  weekendPredicate?: (date: Date) => boolean;
  onPreview: (date?: Date) => void;
  onChange?: (date: Date) => void;
  onDragActiveChange: (active: boolean) => void;
  onDependencyPortPointerDown?: DependencyPortPointerDown;
  isDependencyDragActive?: boolean;
  isDependencyDragSource?: boolean;
  horizontalWindow?: { startPx: number; endPx: number };
}

export function PartialTaskBar({
  task, originalDate, dayWidth, monthStart, weekendPredicate, onPreview, onChange, onDragActiveChange,
  onDependencyPortPointerDown, isDependencyDragActive, isDependencyDragSource, horizontalWindow,
}: PartialTaskBarProps) {
  const drag = useRef<{ id: number; x: number; scrollLeft: number; container: HTMLElement | null; lastDate?: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const isStart = !!task.startDate;
  const pinned = isStart ? task.fixedStartDate : task.fixedEndDate;
  const movable = !!onChange && !task.locked && !pinned;
  const geometry = resolveTaskHorizontalGeometry(task, monthStart, dayWidth);
  const edgeX = isStart ? geometry.left : geometry.right;
  const left = isStart ? edgeX : edgeX - PARTIAL_BAR_WIDTH;
  const right = left + PARTIAL_BAR_WIDTH;
  if (!isDragging && !isDependencyDragSource && horizontalWindow
    && (right < horizontalWindow.startPx || left > horizontalWindow.endPx)) return null;
  const boundary = isStart ? 'начало' : 'окончание';
  const label = `${task.name} · ${pinned ? `Закреплено ${boundary}` : isStart ? 'Окончание не задано' : 'Начало не задано'}`;

  const shiftDate = (days: number) => {
    const shifted = parseDateOnly(originalDate);
    shifted.setUTCDate(shifted.getUTCDate() + days);
    return days && weekendPredicate ? alignToWorkingDay(shifted, days < 0 ? -1 : 1, weekendPredicate) : shifted;
  };
  const commit = (next: Date) => {
    if (+next !== +parseDateOnly(originalDate)) onChange?.(next);
  };
  const getDelta = (event: React.PointerEvent) => {
    const state = drag.current!;
    const scrollDelta = (state.container?.scrollLeft ?? 0) - state.scrollLeft;
    return Math.round((event.clientX - state.x + scrollDelta) / dayWidth);
  };
  const reset = () => {
    if (!drag.current) return;
    drag.current = null;
    setIsDragging(false);
    onDragActiveChange(false);
    onPreview();
  };
  return <>
    <div
      className="gantt-partial-task"
      data-taskbar={movable || undefined}
      data-open-edge={isStart ? 'end' : 'start'}
      data-movable={movable || undefined}
      data-dragging={isDragging || undefined}
      tabIndex={movable ? 0 : undefined}
      aria-label={movable ? `${label}. Дата перемещается стрелками влево и вправо` : label}
      title={label}
      style={{
        '--gantt-partial-anchor': `${edgeX}px`,
        '--gantt-partial-width': `${PARTIAL_BAR_WIDTH}px`,
        '--gantt-partial-color': task.color,
      } as React.CSSProperties}
      onPointerDown={event => {
        if (!movable || !event.isPrimary || event.button !== 0) return;
        const container = event.currentTarget.closest<HTMLElement>('.gantt-scrollContainer');
        drag.current = { id: event.pointerId, x: event.clientX, scrollLeft: container?.scrollLeft ?? 0, container };
        setIsDragging(true);
        onDragActiveChange(true);
        event.currentTarget.setPointerCapture?.(event.pointerId);
      }}
      onPointerMove={event => {
        const state = drag.current;
        if (state?.id !== event.pointerId) return;
        const next = shiftDate(getDelta(event));
        if (state.lastDate === +next) return;
        state.lastDate = +next;
        onPreview(+next === +parseDateOnly(originalDate) ? undefined : next);
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
    </div>
    {!isDragging && onDependencyPortPointerDown && <TaskDependencyPort
      taskId={task.id}
      taskName={task.name}
      side={isStart ? 'left' : 'right'}
      edgeX={edgeX}
      active={isDependencyDragActive}
      onPointerDown={onDependencyPortPointerDown}
    />}
  </>;
}
