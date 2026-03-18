'use client';

import React, { useMemo } from 'react';
import { parseUTCDate, formatDateLabel } from '../../utils/dateUtils';
import { calculateTaskBar, pixelsToDate } from '../../utils/geometry';
import { isTaskExpired } from '../../utils/expired';
import { useTaskDrag } from '../../hooks/useTaskDrag';
import { isTaskParent, getChildren } from '../../utils/dependencyUtils';
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
  /** Callback when task is modified via drag/resize. Receives array of changed tasks. */
  onTasksChange?: (tasks: Task[]) => void;
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
  /** Highlight expired/overdue tasks with red background */
  highlightExpiredTasks?: boolean;
}

/**
 * Custom comparison function for React.memo
 *
 * Performance optimization: Only re-renders if task properties that affect rendering change.
 *
 * NOTE: onTasksChange is intentionally excluded from this comparison because:
 * 1. The parent (GanttChart) wraps onTasksChange in useCallback for referential stability
 * 2. onTasksChange is only called AFTER drag completes (not during drag)
 * 3. During drag, only the dragged TaskRow re-renders due to its internal drag state
 * 4. Other TaskRows don't need to re-render when one task is dragged
 *
 * NOTE: monthStart MUST be included because task positions are calculated relative to it.
 * When the grid expands (e.g., dragging a task left beyond the boundary), monthStart changes
 * and all tasks need to re-render to update their positions.
 *
 * NOTE: onCascadeProgress and onCascade are excluded from comparison (same pattern as onTasksChange —
 * callbacks excluded from comparison because GanttChart wraps them in useCallback).
 *
 * Excluding onTasksChange prevents re-render storms when dragging tasks with ~100 tasks.
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
    prevProps.task.divider === nextProps.task.divider &&
    prevProps.highlightExpiredTasks === nextProps.highlightExpiredTasks
    // onTasksChange, onCascadeProgress, onCascade excluded - see note above
  );
};

/**
 * TaskRow component - renders a single task row with a task bar
 *
 * Uses React.memo for performance optimization (QL-01).
 * The task bar is positioned absolutely based on start/end dates.
 */
const TaskRow: React.FC<TaskRowProps> = React.memo(
  ({ task, monthStart, dayWidth, rowHeight, onTasksChange, onDragStateChange, rowIndex, allTasks, enableAutoSchedule, disableConstraints, overridePosition, onCascadeProgress, onCascade, divider, highlightExpiredTasks }) => {
    // Extract divider from task prop
    const { divider: taskDivider } = task;

    // Parse dates as UTC
    const taskStartDate = useMemo(() => parseUTCDate(task.startDate), [task.startDate]);
    const taskEndDate = useMemo(() => parseUTCDate(task.endDate), [task.endDate]);

    // Hierarchy: compute isParent and childCount
    const isParent = useMemo(() => {
      return allTasks ? isTaskParent(task.id, allTasks) : false;
    }, [allTasks, task.id]);

    const childCount = useMemo(() => {
      return allTasks ? getChildren(task.id, allTasks).length : 0;
    }, [allTasks, task.id]);

    // Calculate expiration status for overdue tasks
    const isExpired = useMemo(() => {
      if (!highlightExpiredTasks) return false;
      return isTaskExpired(task);
    }, [task.startDate, task.endDate, task.progress, highlightExpiredTasks]);

    // Calculate task bar position and dimensions
    const { left, width } = useMemo(
      () => calculateTaskBar(taskStartDate, taskEndDate, monthStart, dayWidth),
      [taskStartDate, taskEndDate, monthStart, dayWidth]
    );

    // Determine task bar color
    const barColor = isExpired
      ? 'var(--gantt-expired-color)'
      : (task.color || 'var(--gantt-task-bar-default-color)');

    // Color for the external task name label — parent tasks match their bar color
    const nameColor = isParent
      ? (task.color || 'var(--gantt-parent-bar-color, #333333)')
      : undefined; // regular tasks use CSS class color (#2563eb)

    // Calculate clamped and rounded progress width
    const progressWidth = useMemo(() => {
      if (task.progress === undefined || task.progress <= 0) return 0;
      return Math.min(100, Math.max(0, Math.round(task.progress)));
    }, [task.progress]);

    // Determine progress color based on completion status
    const progressColor = useMemo(() => {
      if (isExpired) {
        // Dark red for expired tasks
        return 'color-mix(in srgb, var(--gantt-expired-color) 40%, black)';
      }
      if (progressWidth === 100) {
        return task.accepted
          ? 'var(--gantt-progress-accepted, #22c55e)'    // Green for accepted
          : 'var(--gantt-progress-completed, #fbbf24)';   // Yellow for completed (not accepted)
      }
      // Darker shade using color-mix() with task color or default
      const baseColor = task.color || 'var(--gantt-task-bar-default-color)';
      return `color-mix(in srgb, ${baseColor} 40%, black)`;
    }, [isExpired, progressWidth, task.accepted, task.color]);

    // At 100% progress, tint the bar itself instead of rendering a fill overlay.
    const barStyle = useMemo(() => {
      if (isParent) {
        if (progressWidth >= 100) {
          const c = 'color-mix(in srgb, var(--gantt-task-bar-default-color) 40%, black)';
          return { backgroundColor: c, '--gantt-parent-bar-color': c } as React.CSSProperties;
        }
        return {};
      }
      if (progressWidth >= 100) {
        return { backgroundColor: progressColor };
      }
      return { backgroundColor: barColor };
    }, [isParent, progressWidth, barColor, progressColor]);

    // Handle drag end - call onTasksChange with updated task
    const handleDragEnd = (result: { id: string; startDate: Date; endDate: Date; updatedDependencies?: Task['dependencies'] }) => {
      const updatedTask: Task = {
        ...task,
        startDate: result.startDate.toISOString(),
        endDate: result.endDate.toISOString(),
        ...(result.updatedDependencies !== undefined && { dependencies: result.updatedDependencies }),
      };
      onTasksChange?.([updatedTask]);
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

    // Format child count label for parent tasks (Russian plural)
    const getChildCountLabel = (count: number): string => {
      if (count === 1) return '1 задача';
      // For 2, 3, 4 tasks use "задачи" (genitive singular)
      // For 5+ tasks use "задач" (genitive plural)
      const lastTwoDigits = count % 100;
      const lastDigit = count % 10;
      if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return `${count} задач`;
      if (lastDigit === 1) return `${count} задача`;
      if (lastDigit >= 2 && lastDigit <= 4) return `${count} задачи`;
      return `${count} задач`;
    };

    // Determine if progress text fits inside the bar
    // Parent bars have overflow: visible (for bracket ears), so threshold must be stricter:
    // "X задач 100%" ≈ 60–70px text + 16px padding = ~110px
    // Regular: "15 д 100%" ≈ 76px, "1 д 100%" ≈ 62px
    const estimatedTextWidth = isParent ? 120 : (durationDays >= 10 ? 76 : 62);
    const showProgressInside = progressWidth > 0 && displayWidth > estimatedTextWidth;

    // Determine if duration fits inside the bar
    // For 1-day tasks: always show duration outside (too narrow)
    // Parent bars: child count label is longer — need more space
    const MIN_DURATION_WIDTH = isParent ? 80 : 50;
    const showDurationInside = durationDays >= 2 && displayWidth > MIN_DURATION_WIDTH;

    return (
      <div
        className="gantt-tr-row"
        style={{ height: `${rowHeight}px` }}
      >
        {taskDivider === 'top' && <div className="gantt-tr-divider gantt-tr-divider-top" />}
        <div className="gantt-tr-taskContainer">
          <div
            data-taskbar
            className={`gantt-tr-taskBar ${isDragging ? 'gantt-tr-dragging' : ''} ${task.locked ? 'gantt-tr-locked' : ''} ${isParent ? 'gantt-tr-parentBar' : ''}`}
            style={{
              left: `${displayLeft}px`,
              width: `${displayWidth}px`,
              ...barStyle,
              height: isParent ? 'var(--gantt-parent-bar-height, 14px)' : 'var(--gantt-task-bar-height)',
              cursor: dragHandleProps.style.cursor,
              userSelect: dragHandleProps.style.userSelect,
            }}
            onMouseDown={dragHandleProps.onMouseDown}
          >
            {progressWidth > 0 && progressWidth < 100 && (
              <div
                className="gantt-tr-progressBar"
                style={{
                  width: `${progressWidth}%`,
                  backgroundColor: progressColor,
                  ...(isParent && {
                    borderRadius: 'var(--gantt-parent-bar-radius, 8px) 0 0 0',
                  }),
                }}
              />
            )}
            {!isParent && <div className="gantt-tr-resizeHandle gantt-tr-resizeHandleLeft" />}
            {showDurationInside && (
              <span className="gantt-tr-taskDuration">
                {isParent ? getChildCountLabel(childCount) : `${durationDays} д`}
              </span>
            )}
            {progressWidth > 0 && showProgressInside && (
              <span className="gantt-tr-progressText">
                {progressWidth}%
              </span>
            )}
            {!isParent && <div className="gantt-tr-resizeHandle gantt-tr-resizeHandleRight" />}
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
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
            </svg>
          )}
          <div
            className="gantt-tr-rightLabels"
            style={{
              left: `${displayLeft + Math.max(displayWidth, 20) - Math.min(6, Math.max(displayWidth, 20) / 2) + 8}px`,
            }}
          >
            {!showDurationInside && (
              <span className="gantt-tr-externalDuration">
                {isParent ? getChildCountLabel(childCount) : `${durationDays} д`}
              </span>
            )}
            {progressWidth > 0 && !showProgressInside && (
              <span className="gantt-tr-externalProgress">
                {progressWidth}%
              </span>
            )}
            <span
              className="gantt-tr-externalTaskName"
              style={nameColor ? { color: nameColor } : undefined}
            >
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
