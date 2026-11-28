import React from 'react';

export type DependencyPortPointerDown = (
  taskId: string,
  side: 'left' | 'right',
  event: React.PointerEvent<HTMLButtonElement>,
) => void;

interface TaskDependencyPortProps {
  taskId: string;
  taskName: string;
  side: 'left' | 'right';
  edgeX: number;
  active?: boolean;
  milestone?: boolean;
  parent?: boolean;
  onPointerDown: DependencyPortPointerDown;
}

export function TaskDependencyPort({
  taskId, taskName, side, edgeX, active, milestone, parent, onPointerDown,
}: TaskDependencyPortProps) {
  const left = side === 'left';
  const sideClass = left ? 'gantt-tr-dependencyPortLeft' : 'gantt-tr-dependencyPortRight';
  return <button
    type="button"
    data-gantt-dependency-port
    data-task-id={taskId}
    data-port-side={side}
    className={[
      'gantt-tr-dependencyPort',
      sideClass,
      milestone && 'gantt-tr-dependencyPortMilestone',
      parent && 'gantt-tr-dependencyPortParent',
      active && 'gantt-tr-dependencyPortDragActive',
    ].filter(Boolean).join(' ')}
    style={{ left: edgeX - (left ? 24 : 0) }}
    aria-label={`Начать связь от ${left ? 'левого' : 'правого'} края: ${taskName}`}
    title="Потяните к краю другой полосы, чтобы создать связь"
    onPointerDown={event => onPointerDown(taskId, side, event)}
  />;
}
