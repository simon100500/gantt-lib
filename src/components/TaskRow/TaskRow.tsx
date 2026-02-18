'use client';

import React, { useMemo } from 'react';
import { parseUTCDate } from '../../utils/dateUtils';
import { calculateTaskBar } from '../../utils/geometry';
import type { Task } from '../GanttChart';
import styles from './TaskRow.module.css';

export interface TaskRowProps {
  /** Task data to render */
  task: Task;
  /** Start of the month for positioning calculations */
  monthStart: Date;
  /** Width of each day column in pixels */
  dayWidth: number;
  /** Height of the task row in pixels */
  rowHeight: number;
}

/**
 * Custom comparison function for React.memo
 * Only re-renders if task properties that affect rendering change
 */
const arePropsEqual = (prevProps: TaskRowProps, nextProps: TaskRowProps) => {
  return (
    prevProps.task.id === nextProps.task.id &&
    prevProps.task.name === nextProps.task.name &&
    prevProps.task.startDate === nextProps.task.startDate &&
    prevProps.task.endDate === nextProps.task.endDate &&
    prevProps.task.color === nextProps.task.color &&
    prevProps.dayWidth === nextProps.dayWidth &&
    prevProps.rowHeight === nextProps.rowHeight
  );
};

/**
 * TaskRow component - renders a single task row with a task bar
 *
 * Uses React.memo for performance optimization (QL-01).
 * The task bar is positioned absolutely based on start/end dates.
 */
const TaskRow: React.FC<TaskRowProps> = React.memo(
  ({ task, monthStart, dayWidth, rowHeight }) => {
    // Parse dates as UTC
    const taskStartDate = useMemo(() => parseUTCDate(task.startDate), [task.startDate]);
    const taskEndDate = useMemo(() => parseUTCDate(task.endDate), [task.endDate]);

    // Calculate task bar position and dimensions
    const { left, width } = useMemo(
      () => calculateTaskBar(taskStartDate, taskEndDate, monthStart, dayWidth),
      [taskStartDate, taskEndDate, monthStart, dayWidth]
    );

    // Determine task bar color
    const barColor = task.color || 'var(--gantt-task-bar-default-color)';

    return (
      <div
        className={styles.row}
        style={{ height: `${rowHeight}px` }}
      >
        <div
          className={styles.taskBar}
          style={{
            left: `${left}px`,
            width: `${width}px`,
            backgroundColor: barColor,
            height: 'var(--gantt-task-bar-height)',
          }}
        >
          <span className={styles.taskName}>{task.name}</span>
        </div>
      </div>
    );
  },
  arePropsEqual
);

TaskRow.displayName = 'TaskRow';

export default TaskRow;
