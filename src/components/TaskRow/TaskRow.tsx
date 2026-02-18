'use client';

import React, { useMemo } from 'react';
import { parseUTCDate } from '../../utils/dateUtils';
import { calculateTaskBar } from '../../utils/geometry';
import { useTaskDrag } from '../../hooks/useTaskDrag';
import { DragTooltip } from '../DragTooltip';
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
  /** Callback when task is modified via drag/resize */
  onChange?: (updatedTask: Task) => void;
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
 * Excluding onChange prevents re-render storms when dragging tasks with ~100 tasks.
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
    // onChange excluded - see note above
  );
};

/**
 * TaskRow component - renders a single task row with a task bar
 *
 * Uses React.memo for performance optimization (QL-01).
 * The task bar is positioned absolutely based on start/end dates.
 */
const TaskRow: React.FC<TaskRowProps> = React.memo(
  ({ task, monthStart, dayWidth, rowHeight, onChange }) => {
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

    // Handle drag end - call onChange with updated task
    const handleDragEnd = (result: { id: string; startDate: Date; endDate: Date }) => {
      const updatedTask: Task = {
        ...task,
        startDate: result.startDate.toISOString(),
        endDate: result.endDate.toISOString(),
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
      edgeZoneWidth: 12,
    });

    // Use dynamic position during drag
    const displayLeft = isDragging ? currentLeft : left;
    const displayWidth = isDragging ? currentWidth : width;

    // Calculate dates for tooltip during drag
    const tooltipStartDate = useMemo(() => {
      if (!isDragging) return taskStartDate;
      const dayOffset = Math.round(displayLeft / dayWidth);
      return new Date(Date.UTC(
        monthStart.getUTCFullYear(),
        monthStart.getUTCMonth(),
        monthStart.getUTCDate() + dayOffset
      ));
    }, [isDragging, displayLeft, dayWidth, monthStart, taskStartDate]);

    const tooltipEndDate = useMemo(() => {
      if (!isDragging) return taskEndDate;
      const dayOffset = Math.round(displayLeft / dayWidth);
      const durationDays = Math.round(displayWidth / dayWidth) - 1;
      return new Date(Date.UTC(
        monthStart.getUTCFullYear(),
        monthStart.getUTCMonth(),
        monthStart.getUTCDate() + dayOffset + durationDays
      ));
    }, [isDragging, displayLeft, displayWidth, dayWidth, monthStart, taskEndDate]);

    // Get cursor position for tooltip (follow mouse)
    const [cursorPosition, setCursorPosition] = React.useState({ x: 0, y: 0 });

    const handleMouseMove = React.useCallback((e: React.MouseEvent) => {
      if (isDragging) {
        setCursorPosition({ x: e.clientX, y: e.clientY });
      }
    }, [isDragging]);

    return (
      <div
        className={styles.row}
        style={{ height: `${rowHeight}px` }}
        onMouseMove={handleMouseMove}
      >
        <div
          className={`${styles.taskBar} ${isDragging ? styles.dragging : ''}`}
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
          <div className={`${styles.resizeHandle} ${styles.resizeHandleLeft}`} />
          <span className={styles.taskName}>{task.name}</span>
          <div className={`${styles.resizeHandle} ${styles.resizeHandleRight}`} />
        </div>
        {isDragging && (
          <DragTooltip
            x={cursorPosition.x}
            y={cursorPosition.y}
            startDate={tooltipStartDate}
            endDate={tooltipEndDate}
          />
        )}
      </div>
    );
  },
  arePropsEqual
);

TaskRow.displayName = 'TaskRow';

export default TaskRow;
