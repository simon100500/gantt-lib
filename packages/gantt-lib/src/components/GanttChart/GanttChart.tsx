'use client';

import React, { useMemo, useCallback, useRef, useState, useEffect } from 'react';
import { getMultiMonthDays } from '../../utils/dateUtils';
import { calculateGridWidth } from '../../utils/geometry';
import { validateDependencies, cascadeByLinks } from '../../utils/dependencyUtils';
import type { ValidationResult } from '../../types';
import TimeScaleHeader from '../TimeScaleHeader';
import TaskRow from '../TaskRow';
import TodayIndicator from '../TodayIndicator';
import GridBackground from '../GridBackground';
import DragGuideLines from '../DragGuideLines/DragGuideLines';
import { DependencyLines } from '../DependencyLines';
import { TaskList } from '../TaskList';
import './GanttChart.css';
import '../TaskList/TaskList.css';

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
  /**
   * Optional progress value from 0-100
   * - Decimal values are allowed and rounded to nearest integer for display
   * - Values are clamped to 0-100 range
   * - Undefined or 0 means no progress is displayed
   * - Progress is visual-only, no user interaction
   */
  progress?: number;
  /**
   * Optional flag indicating if task is accepted
   * - Only meaningful when progress is 100%
   * - Affects the color of the progress bar (green for accepted, yellow for completed)
   */
  accepted?: boolean;
  /**
   * Optional array of task dependencies
   * - Each dependency references a predecessor task by ID
   * - Supports 4 link types: FS (finish-to-start), SS (start-to-start), FF (finish-to-finish), SF (start-to-finish)
   * - Lag is optional and defaults to 0 (positive = delay, negative = overlap)
   */
  dependencies?: TaskDependency[];
  /**
   * Optional flag to prevent drag and resize interactions.
   * When true, the task bar cannot be moved or resized.
   * Independent of accepted/progress — consumer controls both separately.
   */
  locked?: boolean;
  /**
   * Optional horizontal divider line for visual grouping.
   * - 'top' renders a bold line above the task row
   * - 'bottom' renders a bold line below the task row
   * The line spans the full grid width.
   */
  divider?: 'top' | 'bottom';
}

/**
 * Task dependency definition
 */
export interface TaskDependency {
  /** ID of the predecessor task */
  taskId: string;
  /** Link type: FS, SS, FF, or SF */
  type: 'FS' | 'SS' | 'FF' | 'SF';
  /** Optional lag in days (default: 0) */
  lag?: number;
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
  /** Optional callback for dependency validation results */
  onValidateDependencies?: (result: ValidationResult) => void;
  /** Enable automatic shifting of dependent tasks when predecessor moves (default: false) */
  enableAutoSchedule?: boolean;
  /** Disable dependency constraint checking during drag (default: false) */
  disableConstraints?: boolean;
  /** Called when a cascade drag completes; receives all shifted tasks (including dragged task) in hard mode */
  onCascade?: (tasks: Task[]) => void;
  /** Show task list overlay on the left side of the chart (default: false) */
  showTaskList?: boolean;
  /** Width of the task list overlay in pixels (default: 300) */
  taskListWidth?: number;
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
  onValidateDependencies,
  enableAutoSchedule,
  disableConstraints,
  onCascade,
  showTaskList = false,
  taskListWidth = 400,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Track selected task ID for highlighting in both TaskList and TaskRow
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Calculate multi-month date range from tasks
  const dateRange = useMemo(() => getMultiMonthDays(tasks), [tasks]);

  // Track dependency validation results
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  // Cascade override positions for non-dragged chain members
  const [cascadeOverrides, setCascadeOverrides] = useState<Map<string, { left: number; width: number }>>(new Map());

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

  // Track currently-dragged task's pixel position for real-time dependency line updates
  const [draggedTaskOverride, setDraggedTaskOverride] = useState<{ taskId: string; left: number; width: number } | null>(null);

  // Validate dependencies when tasks change
  useEffect(() => {
    const result = validateDependencies(tasks);
    setValidationResult(result);
    onValidateDependencies?.(result);
  }, [tasks, onValidateDependencies]);

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
    // Find original task to detect date changes
    const originalTask = tasks.find(t => t.id === updatedTask.id);
    if (!originalTask) {
      onChange?.((currentTasks) => currentTasks.map(t => t.id === updatedTask.id ? updatedTask : t));
      return;
    }

    const origStart = new Date(originalTask.startDate as string);
    const origEnd = new Date(originalTask.endDate as string);
    const newStart = new Date(updatedTask.startDate as string);
    const newEnd = new Date(updatedTask.endDate as string);
    const datesChanged = origStart.getTime() !== newStart.getTime() || origEnd.getTime() !== newEnd.getTime();

    // No date change (name edit) or constraints disabled: simple update
    if (!datesChanged || disableConstraints) {
      onChange?.((currentTasks) => currentTasks.map(t => t.id === updatedTask.id ? updatedTask : t));
      return;
    }

    // Lags are fixed constraints — preserve as-is, only reposition dates
    const cascadedTask: Task = updatedTask;
    const cascadedChain = cascadeByLinks(updatedTask.id, newStart, newEnd, tasks);

    const allCascaded = [cascadedTask, ...cascadedChain];
    onChange?.((currentTasks) => {
      const m = new Map(allCascaded.map(t => [t.id, t]));
      return currentTasks.map(t => m.get(t.id) ?? t);
    });
    onCascade?.(allCascaded);
  }, [tasks, onChange, disableConstraints, onCascade]);

  // Build merged pixel overrides for DependencyLines: dragged task + cascade chain members
  const dependencyOverrides = useMemo(() => {
    const map = new Map(cascadeOverrides);
    if (draggedTaskOverride) {
      map.set(draggedTaskOverride.taskId, {
        left: draggedTaskOverride.left,
        width: draggedTaskOverride.width,
      });
    }
    return map;
  }, [cascadeOverrides, draggedTaskOverride]);

  /**
   * Handle real-time cascade progress — updates cascadeOverrides state each RAF
   * so non-dragged chain members re-render with their preview positions.
   * new Map() forces React to detect the state change.
   */
  const handleCascadeProgress = useCallback((overrides: Map<string, { left: number; width: number }>) => {
    setCascadeOverrides(new Map(overrides));
  }, []);

  /**
   * Handle cascade completion — updates all shifted tasks via onChange (functional updater)
   * and notifies the external onCascade consumer.
   */
  const handleCascade = useCallback((cascadedTasks: Task[]) => {
    // Update state by merging cascaded tasks into current tasks
    onChange?.((currentTasks) => {
      const cascadeMap = new Map(cascadedTasks.map(t => [t.id, t]));
      return currentTasks.map(t => cascadeMap.get(t.id) ?? t);
    });
    // Notify external consumer
    onCascade?.(cascadedTasks);
  }, [onChange, onCascade]);

  /**
   * Handle task selection from TaskList or TaskRow
   */
  const handleTaskSelect = useCallback((taskId: string | null) => {
    setSelectedTaskId(taskId);
  }, []);

  // Pan (grab-scroll) on empty grid area
  const panStateRef = useRef<{ active: boolean; startX: number; startY: number; scrollX: number; scrollY: number } | null>(null);

  const handlePanStart = useCallback((e: React.MouseEvent) => {
    // Only pan on left click, skip if clicking on a task bar, input, or task list
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('[data-taskbar]')) return;
    if (target.closest('input, button, textarea, [contenteditable]')) return;
    if (target.closest('.gantt-tl-overlay')) return;

    const container = scrollContainerRef.current;
    if (!container) return;

    panStateRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      scrollX: container.scrollLeft,
      scrollY: container.scrollTop,
    };
    // Blur any focused input so onBlur save handlers fire before pan starts
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    container.style.cursor = 'grabbing';
    e.preventDefault();
  }, []);

  useEffect(() => {
    const handlePanMove = (e: MouseEvent) => {
      const pan = panStateRef.current;
      if (!pan?.active) return;
      const container = scrollContainerRef.current;
      if (!container) return;

      container.scrollLeft = pan.scrollX - (e.clientX - pan.startX);
      container.scrollTop = pan.scrollY - (e.clientY - pan.startY);
    };

    const handlePanEnd = () => {
      if (!panStateRef.current?.active) return;
      panStateRef.current = null;
      const container = scrollContainerRef.current;
      if (container) container.style.cursor = '';
    };

    window.addEventListener('mousemove', handlePanMove);
    window.addEventListener('mouseup', handlePanEnd);
    return () => {
      window.removeEventListener('mousemove', handlePanMove);
      window.removeEventListener('mouseup', handlePanEnd);
    };
  }, []);

  return (
    <div className="gantt-container">
      <div
        ref={scrollContainerRef}
        className="gantt-scrollContainer"
        style={{ height: `${containerHeight}px`, cursor: 'grab' }}
        onMouseDown={handlePanStart}
      >
        {/* Content wrapper - enables TaskList to scroll with chart horizontally */}
        <div className="gantt-scrollContent">
          {/* TaskList - sticky left, scrolls with content horizontally */}
          <TaskList
            tasks={tasks}
            rowHeight={rowHeight}
            headerHeight={headerHeight}
            taskListWidth={taskListWidth}
            onTaskChange={handleTaskChange}
            selectedTaskId={selectedTaskId ?? undefined}
            onTaskSelect={handleTaskSelect}
            show={showTaskList}
          />

          {/* Chart area */}
          <div style={{ minWidth: `${gridWidth}px`, flex: 1 }}>
            {/* Sticky header - stays at top during vertical scroll, scrolls with content horizontally */}
            <div className="gantt-stickyHeader" style={{ width: `${gridWidth}px` }}>
              <TimeScaleHeader
                days={dateRange}
                dayWidth={dayWidth}
                headerHeight={headerHeight}
              />
            </div>

            {/* Task area */}
            <div
              className="gantt-taskArea"
              style={{
                position: 'relative',
                width: `${gridWidth}px`,
              }}
            >
          <GridBackground
            dateRange={dateRange}
            dayWidth={dayWidth}
            totalHeight={totalGridHeight}
          />

          {todayInRange && <TodayIndicator monthStart={monthStart} dayWidth={dayWidth} />}

          {/* Dependency lines SVG overlay */}
          <DependencyLines
            tasks={tasks}
            monthStart={monthStart}
            dayWidth={dayWidth}
            rowHeight={rowHeight}
            gridWidth={gridWidth}
            dragOverrides={dependencyOverrides}
          />

          {dragGuideLines && (
            <DragGuideLines
              isDragging={dragGuideLines.isDragging}
              dragMode={dragGuideLines.dragMode}
              left={dragGuideLines.left}
              width={dragGuideLines.width}
              totalHeight={totalGridHeight}
            />
          )}

          {tasks.map((task, index) => (
            <TaskRow
              key={task.id}
              task={task}
              monthStart={monthStart}
              dayWidth={dayWidth}
              rowHeight={rowHeight}
              onChange={handleTaskChange}
              onDragStateChange={(state) => {
                if (state.isDragging) {
                  setDragGuideLines(state);
                  setDraggedTaskOverride({ taskId: task.id, left: state.left, width: state.width });
                } else {
                  setDragGuideLines(null);
                  setDraggedTaskOverride(null);
                }
              }}
              rowIndex={index}
              allTasks={tasks}
              enableAutoSchedule={enableAutoSchedule ?? false}
              disableConstraints={disableConstraints ?? false}
              overridePosition={cascadeOverrides.get(task.id)}
              onCascadeProgress={handleCascadeProgress}
              onCascade={handleCascade}
            />
          ))}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GanttChart;
