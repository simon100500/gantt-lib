'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { parseUTCDate, formatDateLabel } from '../../utils/dateUtils';
import { calculateTaskBar, pixelsToDate } from '../../utils/geometry';
import { useTaskDrag } from '../../hooks/useTaskDrag';
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
      edgeZoneWidth: 20,
    });

    // Use dynamic position during drag
    const displayLeft = isDragging ? currentLeft : left;
    const displayWidth = isDragging ? currentWidth : width;

    // Format date labels for display - update in real-time during drag
    const currentStartDate = isDragging
      ? pixelsToDate(displayLeft, monthStart, dayWidth)
      : taskStartDate;
    const currentEndDate = isDragging
      ? pixelsToDate(displayLeft + displayWidth - dayWidth, monthStart, dayWidth)
      : taskEndDate;

    const startDateLabel = formatDateLabel(currentStartDate);
    const endDateLabel = formatDateLabel(currentEndDate);

    // Detect if task name overflows the bar
    const [isNameOverflow, setIsNameOverflow] = useState(false);
    const taskNameRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
      const nameEl = taskNameRef.current;
      if (nameEl) {
        // Check if text is wider than available space
        // Reserved space for dates and handles
        const reservedWidth = 20;
        const availableWidth = displayWidth - reservedWidth;
        setIsNameOverflow(nameEl.scrollWidth > availableWidth);
      }
    }, [displayWidth, task.name]);

    return (
      <div
        className={styles.row}
        style={{ height: `${rowHeight}px` }}
      >
        <div className={styles.taskContainer}>
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
            <span className={`${styles.dateLabel} ${styles.dateLabelLeft}`}>
              {startDateLabel}
            </span>
            <div className={`${styles.resizeHandle} ${styles.resizeHandleLeft}`} />
            <span
              ref={taskNameRef}
              className={`${styles.taskName} ${isNameOverflow ? styles.taskNameHidden : ''}`}
            >
              {task.name}
            </span>
            <div className={`${styles.resizeHandle} ${styles.resizeHandleRight}`} />
          </div>
          <div
            className={styles.rightLabels}
            style={{
              left: `${displayLeft + displayWidth}px`,
            }}
          >
            <span className={`${styles.dateLabel} ${styles.dateLabelRight}`}>
              {endDateLabel}
            </span>
            {isNameOverflow && (
              <span className={styles.externalTaskName}>
                {task.name}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  },
  arePropsEqual
);

TaskRow.displayName = 'TaskRow';

export default TaskRow;
