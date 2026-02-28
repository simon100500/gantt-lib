'use client';

import React, { useMemo, useCallback } from 'react';
import type { Task } from '../GanttChart';
import { TaskListRow } from './TaskListRow';
import './TaskList.css';

export interface TaskListProps {
  /** Array of tasks to display */
  tasks: Task[];
  /** Height of each row in pixels (must match Gantt chart's rowHeight) */
  rowHeight: number;
  /** Height of the header row in pixels (must match Gantt chart's headerHeight) */
  headerHeight: number;
  /** Width of the task list overlay in pixels (default: 400) */
  taskListWidth?: number;
  /** Callback when task is modified via inline edit */
  onTaskChange?: (task: Task) => void;
  /** ID of currently selected task */
  selectedTaskId?: string;
  /** Callback when task row is clicked */
  onTaskSelect?: (taskId: string | null) => void;
  /** Show or hide the task list (default: true) */
  show?: boolean;
}

/**
 * TaskList component - displays tasks in a table format as an overlay
 *
 * Renders a table with columns: № (number), Name, Start Date, End Date
 * Uses position: sticky for synchronized vertical scrolling with the chart.
 */
export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  rowHeight,
  headerHeight,
  taskListWidth = 520,
  onTaskChange,
  selectedTaskId,
  onTaskSelect,
  show = true,
}) => {
  const totalHeight = useMemo(
    () => tasks.length * rowHeight,
    [tasks.length, rowHeight]
  );

  const handleRowClick = useCallback((taskId: string) => {
    onTaskSelect?.(taskId);
  }, [onTaskSelect]);

  return (
    <div
      className={`gantt-tl-overlay${show ? '' : ' gantt-tl-hidden'}`}
      style={{ width: `${taskListWidth}px` }}
    >
      <div className="gantt-tl-table">
        {/* Header row - aligns with TimeScaleHeader, 1px taller for row alignment */}
        <div className="gantt-tl-header" style={{ height: `${headerHeight + 0.5}px` }}>
          <div className="gantt-tl-headerCell gantt-tl-cell-number">№</div>
          <div className="gantt-tl-headerCell gantt-tl-cell-name">Имя</div>
          <div className="gantt-tl-headerCell gantt-tl-cell-date">Начало</div>
          <div className="gantt-tl-headerCell gantt-tl-cell-date">Окончание</div>
        </div>

        {/* Data rows */}
        <div className="gantt-tl-body" style={{ height: `${totalHeight}px` }}>
          {tasks.map((task, index) => (
            <TaskListRow
              key={task.id}
              task={task}
              rowIndex={index}
              rowHeight={rowHeight}
              onTaskChange={onTaskChange}
              selectedTaskId={selectedTaskId}
              onRowClick={handleRowClick}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default TaskList;
