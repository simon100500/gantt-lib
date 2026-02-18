'use client';

import React, { useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { getMonthDays } from '../../utils/dateUtils';
import { calculateGridWidth } from '../../utils/geometry';
import TimeScaleHeader from '../TimeScaleHeader';
import TaskRow from '../TaskRow';
import TodayIndicator from '../TodayIndicator';
import styles from './GanttChart.module.css';

/**
 * Task data structure for Gantt chart
 */
export interface Task {
  /** Unique identifier for the task */
  id: string;
  /** Display name of the task */
  name: string;
  /** Task start date (ISO string or Date object) */
  startDate: string | Date;
  /** Task end date (ISO string or Date object) */
  endDate: string | Date;
  /** Optional color for task bar visualization */
  color?: string;
}

export interface GanttChartProps {
  /** Array of tasks to display */
  tasks: Task[];
  /** Month to display (defaults to current month) */
  month?: Date | string;
  /** Width of each day column in pixels (default: 40) */
  dayWidth?: number;
  /** Height of each task row in pixels (default: 40) */
  rowHeight?: number;
  /** Height of the header row in pixels (default: 40) */
  headerHeight?: number;
  /** Callback when tasks are modified via drag/resize */
  onChange?: (tasks: Task[]) => void;
}

/**
 * GanttChart component - displays tasks on a monthly timeline with Excel-like styling
 *
 * @example
 * ```tsx
 * <GanttChart
 *   tasks={[
 *     { id: '1', name: 'Task 1', startDate: '2026-02-01', endDate: '2026-02-05' }
 *   ]}
 * />
 * ```
 */
export const GanttChart: React.FC<GanttChartProps> = ({
  tasks,
  month = new Date(),
  dayWidth = 40,
  rowHeight = 40,
  headerHeight = 40,
  onChange,
}) => {
  // Calculate month days once
  const monthDays = useMemo(() => getMonthDays(month), [month]);

  // Calculate grid width
  const gridWidth = useMemo(
    () => calculateGridWidth(monthDays.length, dayWidth),
    [monthDays.length, dayWidth]
  );

  // Get month start for calculations
  const monthStart = useMemo(() => {
    const date = typeof month === 'string' ? new Date(`${month}T00:00:00Z`) : month;
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  }, [month]);

  /**
   * Stable callback for task updates
   *
   * NOTE: This callback intentionally depends on `tasks` to ensure the parent
   * receives the correct task state. However, this means the callback reference
   * changes when tasks change, which could cause TaskRow re-renders.
   *
   * To prevent re-render storms during drag:
   * 1. The onChange callback is only called AFTER drag completes (mouseUp)
   * 2. During drag, only the dragged TaskRow re-renders (due to its internal state)
   * 3. Other TaskRows don't re-render because their props haven't changed
   *
   * The React.memo comparison in TaskRow excludes onChange from comparison,
   * relying on the fact that onChange fires only after drag completes.
   */
  const handleTaskChange = useCallback((updatedTask: Task) => {
    // Create updated tasks array with the modified task
    const updatedTasks = tasks.map((t) =>
      t.id === updatedTask.id ? updatedTask : t
    );
    onChange?.(updatedTasks);
  }, [tasks, onChange]);

  return (
    <div className={styles.container}>
      <div className={styles.chartWrapper}>
        <TimeScaleHeader
          days={monthDays}
          dayWidth={dayWidth}
          headerHeight={headerHeight}
        />

        <div
          className={styles.taskArea}
          style={{
            position: 'relative',
            width: `${gridWidth}px`,
          }}
        >
          <TodayIndicator monthStart={monthStart} dayWidth={dayWidth} />

          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              monthStart={monthStart}
              dayWidth={dayWidth}
              rowHeight={rowHeight}
              onChange={handleTaskChange}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default GanttChart;
