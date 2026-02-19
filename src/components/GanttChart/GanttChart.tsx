'use client';

import React, { useMemo, useCallback, useRef, useState } from 'react';
import { getMultiMonthDays } from '../../utils/dateUtils';
import { calculateGridWidth } from '../../utils/geometry';
import TimeScaleHeader from '../TimeScaleHeader';
import TaskRow from '../TaskRow';
import TodayIndicator from '../TodayIndicator';
import GridBackground from '../GridBackground';
import DragGuideLines from '../DragGuideLines/DragGuideLines';
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
  /** Width of each day column in pixels (default: 40) */
  dayWidth?: number;
  /** Height of each task row in pixels (default: 40) */
  rowHeight?: number;
  /** Height of the header row in pixels (default: 40) */
  headerHeight?: number;
  /** Container height in pixels (default: 600) - adds vertical scrolling when tasks exceed this height */
  containerHeight?: number;
  /** Callback when tasks are modified via drag/resize. Can receive either the new tasks array or a functional updater. */
  onChange?: (tasks: Task[] | ((currentTasks: Task[]) => Task[])) => void;
}

/**
 * GanttChart component - displays tasks on a monthly timeline with Excel-like styling
 *
 * The calendar automatically shows full months based on task date ranges.
 * For example, if tasks span from March 25 to May 5, the calendar shows
 * the complete months of March, April, and May (March 1 - May 31).
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
  dayWidth = 40,
  rowHeight = 40,
  headerHeight = 40,
  containerHeight = 600,
  onChange,
}) => {
  // Scroll refs for synchronization
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Calculate multi-month date range from tasks
  const dateRange = useMemo(() => getMultiMonthDays(tasks), [tasks]);


  // Calculate grid width
  const gridWidth = useMemo(
    () => Math.round(dateRange.length * dayWidth),
    [dateRange.length, dayWidth]
  );

  // Calculate total grid height
  const totalGridHeight = useMemo(
    () => tasks.length * rowHeight,
    [tasks.length, rowHeight]
  );

  // Get month start for calculations (first day of date range)
  const monthStart = useMemo(() => {
    if (dateRange.length === 0) {
      return new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
    }
    const firstDay = dateRange[0];
    return new Date(Date.UTC(firstDay.getUTCFullYear(), firstDay.getUTCMonth(), 1));
  }, [dateRange]);

  // Only render TodayIndicator if today is in the visible date range
  const todayInRange = useMemo(() => {
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    return dateRange.some(day => day.getTime() === today.getTime());
  }, [dateRange]);

  // Track drag state for guide lines
  const [dragGuideLines, setDragGuideLines] = useState<{
    isDragging: boolean;
    dragMode: 'move' | 'resize-left' | 'resize-right' | null;
    left: number;
    width: number;
  } | null>(null);

  /**
   * Stable callback for task updates
   *
   * FIXED: No longer depends on `tasks` to avoid stale closure bugs.
   * Uses functional state update pattern: the callback receives an updater function
   * that maps over the current tasks state, ensuring we always use the latest state.
   *
   * This prevents the "reverting" bug where dragging a second task causes the
   * first task to revert to its original position.
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
    // Call onChange with a functional updater that receives the current tasks
    onChange?.((currentTasks) =>
      currentTasks.map((t) =>
        t.id === updatedTask.id ? updatedTask : t
      )
    );
  }, [onChange]);

  const handleDragStateChange = useCallback((state: {
    isDragging: boolean;
    dragMode: 'move' | 'resize-left' | 'resize-right' | null;
    left: number;
    width: number;
  }) => {
    if (state.isDragging) {
      setDragGuideLines(state);
    } else {
      setDragGuideLines(null);
    }
  }, []);

  /**
   * Synchronize horizontal scrolling between header and task area
   */
  const handleHeaderScroll = useCallback(() => {
    if (headerScrollRef.current && scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = headerScrollRef.current.scrollLeft;
    }
  }, []);

  const handleTaskScroll = useCallback(() => {
    if (scrollContainerRef.current && headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = scrollContainerRef.current.scrollLeft;
    }
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.chartWrapper} style={{ height: `${containerHeight}px` }}>
        {/* Header */}
        <div
          ref={headerScrollRef}
          className={styles.headerScrollContainer}
          onScroll={handleHeaderScroll}
        >
          <div style={{ width: `${gridWidth}px` }}>
            <TimeScaleHeader
              days={dateRange}
              dayWidth={dayWidth}
              headerHeight={headerHeight}
            />
          </div>
        </div>

        {/* Task area */}
        <div
          ref={scrollContainerRef}
          className={styles.taskScrollContainer}
          onScroll={handleTaskScroll}
        >
          <div
            className={styles.taskArea}
            style={{
              position: 'relative',
              width: `${gridWidth}px`,
            }}
          >
            {/* Grid background for vertical lines and weekend highlighting */}
            <GridBackground
              dateRange={dateRange}
              dayWidth={dayWidth}
              totalHeight={totalGridHeight}
            />

            {/* Today indicator - only render if today is in range */}
            {todayInRange && <TodayIndicator monthStart={monthStart} dayWidth={dayWidth} />}

            {/* Drag guide lines - rendered during drag/resize operations */}
            {dragGuideLines && (
              <DragGuideLines
                isDragging={dragGuideLines.isDragging}
                dragMode={dragGuideLines.dragMode}
                left={dragGuideLines.left}
                width={dragGuideLines.width}
                totalHeight={totalGridHeight}
              />
            )}

            {tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                monthStart={monthStart}
                dayWidth={dayWidth}
                rowHeight={rowHeight}
                onChange={handleTaskChange}
                onDragStateChange={handleDragStateChange}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GanttChart;
