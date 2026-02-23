'use client';

import React, { useMemo } from 'react';
import { parseUTCDate, formatDateLabel } from '../../utils/dateUtils';
import { calculateTaskBar, pixelsToDate } from '../../utils/geometry';
import { useTaskDrag } from '../../hooks/useTaskDrag';
import type { Task } from '../GanttChart';
import './TaskRow.css';

export interface TaskRowProps {
  /** Task data to render */
  task: Task;
  /** Start of the month for positioning calculations */
  monthStart: Date;
  /** Width of each day column in pixels */
  dayWidth: number;
  /** Height of the task row in pixels */
  rowHeight: number;
  /** Callback when task is modified via drag/resize */
  onChange?: (updatedTask: Task) => void;
  /** Callback when task drag state changes (for rendering guide lines) */
  onDragStateChange?: (state: {
    isDragging: boolean;
    dragMode: 'move' | 'resize-left' | 'resize-right' | null;
    left: number;
    width: number;
  }) => void;
  /** Index of the task row (used for dependency rendering) */
  rowIndex?: number;
  /** All tasks in the chart (used for dependency validation) */
  allTasks?: Task[];
  /** Whether auto-scheduling is enabled */
  enableAutoSchedule?: boolean;
  /** Whether to disable constraint checking during drag */
  disableConstraints?: boolean;
  /** Position override for cascade preview — when set, overrides both static and drag position */
  overridePosition?: { left: number; width: number };
  /** Called each RAF during cascade drag with override positions for non-dragged chain tasks */
  onCascadeProgress?: (overrides: Map<string, { left: number; width: number }>) => void;
  /** Called when cascade drag completes; receives all shifted tasks including dragged task */
  onCascade?: (tasks: Task[]) => void;
  /** Optional horizontal divider line - renders above or below the task row */
  divider?: 'top' | 'bottom';
}

/**
 * Custom comparison function for React.memo
 *
 * Performance optimization: Only re-renders if task properties that affect rendering change.
 *
 * NOTE: onChange is intentionally excluded from this comparison because:
 * 1. The parent (GanttChart) wraps onChange in useCallback for referential stability
 * 2. onChange is only called AFTER drag completes (not during drag)
 * 3. During drag, only the dragged TaskRow re-renders due to its internal drag state
 * 4. Other TaskRows don't need to re-render when one task is dragged
 *
 * NOTE: monthStart MUST be included because task positions are calculated relative to it.
 * When the grid expands (e.g., dragging a task left beyond the boundary), monthStart changes
 * and all tasks need to re-render to update their positions.
 *
 * NOTE: onCascadeProgress and onCascade are excluded from comparison (same pattern as onChange —
 * callbacks excluded from comparison because GanttChart wraps them in useCallback).
 *
 * Excluding onChange prevents re-render storms when dragging tasks with ~100 tasks.
 */
const arePropsEqual = (prevProps: TaskRowProps, nextProps: TaskRowProps) => {
  return (
    prevProps.task.id === nextProps.task.id &&
    prevProps.task.name === nextProps.task.name &&
    prevProps.task.startDate === nextProps.task.startDate &&
    prevProps.task.endDate === nextProps.task.endDate &&
    prevProps.task.color === nextProps.task.color &&
    prevProps.task.progress === nextProps.task.progress &&
    prevProps.task.accepted === nextProps.task.accepted &&
    prevProps.monthStart.getTime() === nextProps.monthStart.getTime() &&
    prevProps.dayWidth === nextProps.dayWidth &&
    prevProps.rowHeight === nextProps.rowHeight &&
    prevProps.overridePosition?.left === nextProps.overridePosition?.left &&
    prevProps.overridePosition?.width === nextProps.overridePosition?.width &&
    prevProps.allTasks === nextProps.allTasks &&
    prevProps.disableConstraints === nextProps.disableConstraints &&
    prevProps.task.locked === nextProps.task.locked &&
    prevProps.task.divider === nextProps.task.divider
    // onChange, onCascadeProgress, onCascade excluded - see note above
  );
};

/**
 * TaskRow component - renders a single task row with a task bar
 *
 * Uses React.memo for performance optimization (QL-01).
 * The task bar is positioned absolutely based on start/end dates.
 */
const TaskRow: React.FC<TaskRowProps> = React.memo(
  ({ task, monthStart, dayWidth, rowHeight, onChange, onDragStateChange, rowIndex, allTasks, enableAutoSchedule, disableConstraints, overridePosition, onCascadeProgress, onCascade, divider }) => {
    // Extract divider from task prop
    const { divider: taskDivider } = task;

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

    // Calculate clamped and rounded progress width
    const progressWidth = useMemo(() => {
      if (task.progress === undefined || task.progress <= 0) return 0;
      return Math.min(100, Math.max(0, Math.round(task.progress)));
    }, [task.progress]);

    // Determine progress color based on completion status
    const progressColor = useMemo(() => {
      if (progressWidth === 100) {
        return task.accepted
          ? 'var(--gantt-progress-accepted, #22c55e)'    // Green for accepted
          : 'var(--gantt-progress-completed, #fbbf24)';   // Yellow for completed
      }
      // Darker semi-transparent shade using color-mix() or fallback
      return task.color
        ? `color-mix(in srgb, ${task.color} 40%, black)`
        : 'var(--gantt-progress-color, rgba(0, 0, 0, 0.2))';
    }, [progressWidth, task.accepted, task.color]);

    // Handle drag end - call onChange with updated task
    const handleDragEnd = (result: { id: string; startDate: Date; endDate: Date; updatedDependencies?: Task['dependencies'] }) => {
      const updatedTask: Task = {
        ...task,
        startDate: result.startDate.toISOString(),
        endDate: result.endDate.toISOString(),
        ...(result.updatedDependencies !== undefined && { dependencies: result.updatedDependencies }),
      };
      onChange?.(updatedTask);
    };

    // Use drag hook for interactive drag/resize
    const {
      isDragging,
      dragMode,
      currentLeft,
      currentWidth,
      dragHandleProps,
    } = useTaskDrag({
      taskId: task.id,
      initialStartDate: taskStartDate,
      initialEndDate: taskEndDate,
      monthStart,
      dayWidth,
      onDragEnd: handleDragEnd,
      onDragStateChange,
      edgeZoneWidth: 20,
      allTasks,
      rowIndex,
      enableAutoSchedule,
      disableConstraints,
      locked: task.locked,
      onCascadeProgress,
      onCascade,
    });

    // Use override position (for cascade preview) with fallback to drag or static position
    const displayLeft = overridePosition?.left ?? (isDragging ? currentLeft : left);
    const displayWidth = overridePosition?.width ?? (isDragging ? currentWidth : width);

    // Format date labels for display - update in real-time during drag
    const currentStartDate = isDragging
      ? pixelsToDate(displayLeft, monthStart, dayWidth)
      : taskStartDate;
    const currentEndDate = isDragging
      ? pixelsToDate(displayLeft + displayWidth - dayWidth, monthStart, dayWidth)
      : taskEndDate;

    const startDateLabel = formatDateLabel(currentStartDate);
    const endDateLabel = formatDateLabel(currentEndDate);

    // Calculate duration in days
    const durationDays = Math.round(
      (currentEndDate.getTime() - currentStartDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

    // Determine if progress text fits inside the bar
    // Estimate: duration text (~"15 д" = ~30px) + progress text (~"100%" = ~30px) + padding (~16px)
    const estimatedTextWidth = durationDays >= 10 ? 76 : 62; // "15 д 100%" = ~76px, "1 д 100%" = ~62px
    const showProgressInside = progressWidth > 0 && displayWidth > estimatedTextWidth;

    return (
      <div
        className="gantt-tr-row"
        style={{ height: `${rowHeight}px` }}
      >
        {taskDivider === 'top' && <div className="gantt-tr-divider gantt-tr-divider-top" />}
        <div className="gantt-tr-taskContainer">
          <div
            data-taskbar
            className={`gantt-tr-taskBar ${isDragging ? 'gantt-tr-dragging' : ''} ${task.locked ? 'gantt-tr-locked' : ''}`}
            style={{
              left: `${displayLeft}px`,
              width: `${displayWidth}px`,
              backgroundColor: barColor,
              height: 'var(--gantt-task-bar-height)',
              cursor: dragHandleProps.style.cursor,
              userSelect: dragHandleProps.style.userSelect,
            }}
            onMouseDown={dragHandleProps.onMouseDown}
          >
            {progressWidth > 0 && (
              <div
                className="gantt-tr-progressBar"
                style={{
                  width: `${progressWidth}%`,
                  backgroundColor: progressColor,
                }}
              />
            )}
            <div className="gantt-tr-resizeHandle gantt-tr-resizeHandleLeft" />
            <span className="gantt-tr-taskDuration">
              {durationDays} д
            </span>
            {progressWidth > 0 && showProgressInside && (
              <span className="gantt-tr-progressText">
                {progressWidth}%
              </span>
            )}
            <div className="gantt-tr-resizeHandle gantt-tr-resizeHandleRight" />
          </div>
          <div
            className={`gantt-tr-leftLabels ${task.locked ? 'gantt-tr-leftLabels-locked' : ''}`}
            style={{
              left: `${displayLeft}px`
            }}
          >
            <span className="gantt-tr-dateLabel gantt-tr-dateLabelLeft">
              {startDateLabel}–{endDateLabel}
            </span>
          </div>
          {task.locked && (
            <svg
              className="gantt-tr-lockIcon"
              style={{
                position: 'absolute',
                left: `${displayLeft - 16}px`,
                top: '50%',
                transform: 'translateY(-50%)',
                width: '12px',
                height: '12px',
                color: '#444',
                pointerEvents: 'none',
              }}
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-label="Locked"
              aria-hidden="false"
            >
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
            </svg>
          )}
          <div
            className="gantt-tr-rightLabels"
            style={{
              left: `${displayLeft + displayWidth}px`,
            }}
          >
            {progressWidth > 0 && !showProgressInside && (
              <span className="gantt-tr-externalProgress">
                {progressWidth}%
              </span>
            )}
            <span className="gantt-tr-externalTaskName">
              {task.name}
            </span>
          </div>
        </div>
        {taskDivider === 'bottom' && <div className="gantt-tr-divider gantt-tr-divider-bottom" />}
      </div>
    );
  },
  arePropsEqual
);

TaskRow.displayName = 'TaskRow';

export default TaskRow;
