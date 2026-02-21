'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { detectEdgeZone } from '../utils/geometry';
import type { Task, TaskDependency } from '../types';
import { calculateSuccessorDate } from '../utils/dependencyUtils';

/**
 * Global drag manager that persists across HMR
 *
 * This singleton manages active drag operations at the module level,
 * ensuring that drag state survives React Fast Refresh (HMR).
 *
 * The key insight: When HMR occurs during a drag operation:
 * 1. The component unmounts and its useEffect cleanup removes window listeners
 * 2. The component remounts with fresh refs (isDraggingRef = false)
 * 3. But the user is still holding the mouse button!
 * 4. Without module-level state, the drag operation is orphaned
 *
 * Solution: Store active drag state in module-level singleton and
 * use a global cleanup effect to always handle mouseup/mousemove.
 */
interface ActiveDragState {
  taskId: string;
  mode: 'move' | 'resize-left' | 'resize-right';
  startX: number;
  initialLeft: number;
  initialWidth: number;
  currentLeft: number;
  currentWidth: number;
  dayWidth: number;
  monthStart: Date;
  onProgress: (left: number, width: number) => void;
  onComplete: (finalLeft: number, finalWidth: number) => void;
  onCancel: () => void;
  allTasks: Task[];
  disableConstraints?: boolean;
}

let globalActiveDrag: ActiveDragState | null = null;
let globalRafId: number | null = null;

/**
 * Complete the active drag operation
 */
function completeDrag() {
  if (globalRafId !== null) {
    cancelAnimationFrame(globalRafId);
    globalRafId = null;
  }

  if (globalActiveDrag) {
    const { onComplete, currentLeft, currentWidth } = globalActiveDrag;
    const drag = globalActiveDrag;
    globalActiveDrag = null;
    onComplete(currentLeft, currentWidth);
  }
}

/**
 * Cancel the active drag operation
 */
function cancelDrag() {
  if (globalRafId !== null) {
    cancelAnimationFrame(globalRafId);
    globalRafId = null;
  }

  if (globalActiveDrag) {
    const { onCancel } = globalActiveDrag;
    globalActiveDrag = null;
    onCancel();
  }
}

/**
 * Snap pixel value to grid (day boundaries)
 */
function snapToGrid(pixels: number, dayWidth: number): number {
  return Math.round(pixels / dayWidth) * dayWidth;
}

/**
 * Check if a task move would violate dependency constraints
 * Only blocks move operations, not resize (per requirements)
 */
function canMoveTask(
  task: Task,
  newStartDate: Date,
  newEndDate: Date,
  allTasks: Task[]
): { allowed: boolean; reason?: string } {
  if (!task.dependencies || task.dependencies.length === 0) {
    return { allowed: true };
  }

  // For each predecessor, check if the new position respects the constraint
  for (const dep of task.dependencies) {
    const predecessor = allTasks.find(t => t.id === dep.taskId);
    if (!predecessor) continue;

    const predecessorStart = new Date(predecessor.startDate);
    const predecessorEnd = new Date(predecessor.endDate);

    // Calculate expected date based on link type
    const expectedDate = calculateSuccessorDate(
      predecessorStart,
      predecessorEnd,
      dep.type,
      dep.lag ?? 0
    );

    // Check constraint based on link type
    const targetIsStart = dep.type.endsWith('S');
    const targetDate = targetIsStart ? newStartDate : newEndDate;

    // Allow move if target date is on or after expected date
    // (give 1-day tolerance for rounding)
    const dayDiff = (targetDate.getTime() - expectedDate.getTime()) / (24 * 60 * 60 * 1000);

    if (dayDiff < -1) {
      return {
        allowed: false,
        reason: `Would violate ${dep.type} dependency from "${predecessor.name}"`
      };
    }
  }

  return { allowed: true };
}

/**
 * Global mouse move handler - attached once and persists across HMR
 */
function handleGlobalMouseMove(e: MouseEvent) {
  if (!globalActiveDrag || globalRafId !== null) {
    return;
  }

  globalRafId = requestAnimationFrame(() => {
    if (!globalActiveDrag) {
      globalRafId = null;
      return;
    }

    const { startX, initialLeft, initialWidth, mode, dayWidth, onProgress, allTasks } = globalActiveDrag;
    const deltaX = e.clientX - startX;

    let newLeft = initialLeft;
    let newWidth = initialWidth;

    switch (mode) {
      case 'move':
        newLeft = snapToGrid(initialLeft + deltaX, dayWidth);
        break;
      case 'resize-left':
        const snappedLeft = snapToGrid(initialLeft + deltaX, dayWidth);
        newLeft = snappedLeft;
        const rightEdge = initialLeft + initialWidth;
        newWidth = Math.max(dayWidth, rightEdge - snappedLeft);
        break;
      case 'resize-right':
        const snappedWidth = snapToGrid(initialWidth + deltaX, dayWidth);
        newWidth = Math.max(dayWidth, snappedWidth);
        break;
    }

    // For move operations, check dependency constraints
    if (mode === 'move' && allTasks.length > 0 && !globalActiveDrag.disableConstraints) {
      const currentTask = allTasks.find(t => t.id === globalActiveDrag?.taskId);
      if (currentTask) {
        // Calculate new dates
        const dayOffset = Math.round(newLeft / globalActiveDrag.dayWidth);
        const durationDays = Math.round(newWidth / globalActiveDrag.dayWidth) - 1;
        const monthStart = globalActiveDrag.monthStart;

        const newStartDate = new Date(Date.UTC(
          monthStart.getUTCFullYear(),
          monthStart.getUTCMonth(),
          monthStart.getUTCDate() + dayOffset
        ));

        const newEndDate = new Date(Date.UTC(
          monthStart.getUTCFullYear(),
          monthStart.getUTCMonth(),
          monthStart.getUTCDate() + dayOffset + durationDays
        ));

        // Check constraints
        const validation = canMoveTask(currentTask, newStartDate, newEndDate, allTasks);
        if (!validation.allowed) {
          // Clamp to the constraint boundary instead of reverting to initialLeft
          let minAllowedLeft = 0;
          for (const dep of currentTask.dependencies ?? []) {
            const predecessor = globalActiveDrag.allTasks.find(t => t.id === dep.taskId);
            if (!predecessor) continue;
            const predecessorStart = new Date(predecessor.startDate);
            const predecessorEnd = new Date(predecessor.endDate);
            const expectedDate = calculateSuccessorDate(
              predecessorStart,
              predecessorEnd,
              dep.type,
              dep.lag ?? 0
            );
            const targetIsStart = dep.type.endsWith('S');
            // Convert expectedDate to pixel offset from monthStart
            const expectedOffset = Math.round(
              (expectedDate.getTime() -
                Date.UTC(
                  globalActiveDrag.monthStart.getUTCFullYear(),
                  globalActiveDrag.monthStart.getUTCMonth(),
                  globalActiveDrag.monthStart.getUTCDate()
                )) /
                (24 * 60 * 60 * 1000)
            );
            const expectedLeft = expectedOffset * globalActiveDrag.dayWidth;
            if (targetIsStart) {
              minAllowedLeft = Math.max(minAllowedLeft, expectedLeft);
            } else {
              // FF/SF: the end must be at expectedLeft, so left = expectedLeft - width
              minAllowedLeft = Math.max(minAllowedLeft, expectedLeft - newWidth);
            }
          }
          // Clamp: don't let bar go left of the constraint boundary
          newLeft = Math.max(minAllowedLeft, newLeft);
        }
      }
    }

    // Update current values in global state for completion
    globalActiveDrag.currentLeft = newLeft;
    globalActiveDrag.currentWidth = newWidth;

    onProgress(newLeft, newWidth);
    globalRafId = null;
  });
}

/**
 * Global mouse up handler - attached once and persists across HMR
 */
function handleGlobalMouseUp() {
  if (globalActiveDrag) {
    completeDrag();
  }
}

/**
 * Track whether global listeners are attached
 */
let globalListenersAttached = false;

/**
 * Ensure global listeners are attached (idempotent)
 */
function ensureGlobalListeners() {
  if (!globalListenersAttached) {
    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    globalListenersAttached = true;
  }
}

/**
 * Cleanup global listeners - called when no components are using drag
 * Note: In practice with HMR, we keep these attached for safety
 */
function cleanupGlobalListeners() {
  // We keep global listeners attached to handle orphaned drags after HMR
  // They will be cleaned up when the page is refreshed
}

/**
 * Options for useTaskDrag hook
 */
export interface UseTaskDragOptions {
  /** Unique identifier for the task */
  taskId: string;
  /** Initial start date of the task */
  initialStartDate: Date;
  /** Initial end date of the task */
  initialEndDate: Date;
  /** Start of the visible range (e.g., month start) */
  monthStart: Date;
  /** Width of each day in pixels */
  dayWidth: number;
  /** Callback when drag operation completes */
  onDragEnd?: (result: { id: string; startDate: Date; endDate: Date }) => void;
  /** Callback for drag state changes (for parent components to render guide lines) */
  onDragStateChange?: (state: {
    isDragging: boolean;
    dragMode: 'move' | 'resize-left' | 'resize-right' | null;
    left: number;
    width: number;
  }) => void;
  /** Width of edge zones for resize detection (default: 12px) */
  edgeZoneWidth?: number;
  /** Array of all tasks for dependency validation */
  allTasks?: Task[];
  /** Row index of this task (for task lookup) */
  rowIndex?: number;
  /** Enable automatic scheduling of dependent tasks */
  enableAutoSchedule?: boolean;
  /** When true, dependency constraint checking is skipped during drag (default: false) */
  disableConstraints?: boolean;
}

/**
 * Return value from useTaskDrag hook
 */
export interface UseTaskDragReturn {
  /** Whether a drag operation is in progress */
  isDragging: boolean;
  /** Current drag mode (null when not dragging) */
  dragMode: 'move' | 'resize-left' | 'resize-right' | null;
  /** Current left position in pixels (updated during drag) */
  currentLeft: number;
  /** Current width in pixels (updated during drag) */
  currentWidth: number;
  /** Props to spread on the drag handle element */
  dragHandleProps: {
    onMouseDown: (e: React.MouseEvent) => void;
    style: React.CSSProperties;
  };
}

/**
 * Custom hook for managing task drag interactions
 *
 * HMR-SAFE: Uses module-level singleton to ensure drag state survives
 * React Fast Refresh. Window event listeners are attached once at module
 * level rather than per component instance.
 */
export const useTaskDrag = (options: UseTaskDragOptions): UseTaskDragReturn => {
  const {
    taskId,
    initialStartDate,
    initialEndDate,
    monthStart,
    dayWidth,
    onDragEnd,
    onDragStateChange,
    edgeZoneWidth = 12,
    allTasks = [],
    rowIndex,
    enableAutoSchedule = false,
    disableConstraints = false,
  } = options;

  // Track if this hook instance owns the current global drag
  const isOwnerRef = useRef<boolean>(false);

  // Display state (triggers re-renders only when needed)
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragMode, setDragMode] = useState<'move' | 'resize-left' | 'resize-right' | null>(null);
  const [currentLeft, setCurrentLeft] = useState<number>(0);
  const [currentWidth, setCurrentWidth] = useState<number>(0);

  /**
   * Calculate initial pixel position from dates
   */
  const getInitialPosition = useCallback((): { left: number; width: number } => {
    const getUTCDayDifference = (date1: Date, date2: Date): number => {
      const ms1 = Date.UTC(
        date1.getUTCFullYear(),
        date1.getUTCMonth(),
        date1.getUTCDate()
      );
      const ms2 = Date.UTC(
        date2.getUTCFullYear(),
        date2.getUTCMonth(),
        date2.getUTCDate()
      );
      return Math.round((ms1 - ms2) / (1000 * 60 * 60 * 24));
    };

    const startOffset = getUTCDayDifference(initialStartDate, monthStart);
    const duration = getUTCDayDifference(initialEndDate, initialStartDate);

    const left = Math.round(startOffset * dayWidth);
    const width = Math.round((duration + 1) * dayWidth); // +1 to include end date

    return { left, width };
  }, [initialStartDate, initialEndDate, monthStart, dayWidth]);

  /**
   * Initialize position when dates or dayWidth changes
   */
  useEffect(() => {
    const { left, width } = getInitialPosition();
    setCurrentLeft(left);
    setCurrentWidth(width);
  }, [getInitialPosition]);

  /**
   * Handle drag progress callback from global manager
   */
  const handleProgress = useCallback((left: number, width: number) => {
    setCurrentLeft(left);
    setCurrentWidth(width);

    if (onDragStateChange && isOwnerRef.current) {
      const mode = globalActiveDrag?.mode || null;
      onDragStateChange({
        isDragging: true,
        dragMode: mode,
        left,
        width,
      });
    }
  }, [onDragStateChange]);

  /**
   * Handle drag completion from global manager
   */
  const handleComplete = useCallback((finalLeft: number, finalWidth: number) => {
    const wasOwner = isOwnerRef.current;
    isOwnerRef.current = false;

    // Calculate new dates from final pixel values
    const dayOffset = Math.round(finalLeft / dayWidth);
    const durationDays = Math.round(finalWidth / dayWidth) - 1; // -1 because width includes end date

    const newStartDate = new Date(Date.UTC(
      monthStart.getUTCFullYear(),
      monthStart.getUTCMonth(),
      monthStart.getUTCDate() + dayOffset
    ));

    const newEndDate = new Date(Date.UTC(
      monthStart.getUTCFullYear(),
      monthStart.getUTCMonth(),
      monthStart.getUTCDate() + dayOffset + durationDays
    ));

    // Reset local state
    setIsDragging(false);
    setDragMode(null);

    // Notify parent of drag end
    if (onDragStateChange) {
      onDragStateChange({
        isDragging: false,
        dragMode: null,
        left: finalLeft,
        width: finalWidth,
      });
    }

    // Notify parent of drag completion (only if we were the owner)
    if (onDragEnd && wasOwner) {
      onDragEnd({
        id: taskId,
        startDate: newStartDate,
        endDate: newEndDate,
      });
    }
  }, [dayWidth, monthStart, onDragEnd, onDragStateChange, taskId]);

  /**
   * Handle drag cancellation (e.g., if HMR orphaned the drag)
   */
  const handleCancel = useCallback(() => {
    isOwnerRef.current = false;
    setIsDragging(false);
    setDragMode(null);

    if (onDragStateChange) {
      onDragStateChange({
        isDragging: false,
        dragMode: null,
        left: currentLeft,
        width: currentWidth,
      });
    }
  }, [onDragStateChange, currentLeft, currentWidth]);

  /**
   * Cleanup on unmount - if this instance owns the drag, cancel it
   */
  useEffect(() => {
    return () => {
      if (isOwnerRef.current && globalActiveDrag) {
        // We're unmounting while owning the drag - cancel it
        cancelDrag();
      }
    };
  }, []);

  /**
   * Handle mouse down on drag handle
   */
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.currentTarget as HTMLElement;
    const edgeZone = detectEdgeZone(e.clientX, target, edgeZoneWidth);

    // Determine drag mode from edge zone
    let mode: 'move' | 'resize-left' | 'resize-right' | null = null;
    switch (edgeZone) {
      case 'left':
        mode = 'resize-left';
        break;
      case 'right':
        mode = 'resize-right';
        break;
      case 'move':
        mode = 'move';
        break;
    }

    if (!mode) {
      return;
    }

    // Get current position from state (this is what we see on screen)
    const initialLeft = currentLeft;
    const initialWidth = currentWidth;

    // Mark this instance as the drag owner
    isOwnerRef.current = true;

    // Update display state
    setIsDragging(true);
    setDragMode(mode);

    // Notify parent of drag start
    if (onDragStateChange) {
      onDragStateChange({
        isDragging: true,
        dragMode: mode,
        left: initialLeft,
        width: initialWidth,
      });
    }

    // Ensure global listeners are attached (idempotent)
    ensureGlobalListeners();

    // Store drag state in global singleton
    globalActiveDrag = {
      taskId,
      mode,
      startX: e.clientX,
      initialLeft,
      initialWidth,
      currentLeft: initialLeft, // Initially same as initial
      currentWidth: initialWidth, // Initially same as initial
      dayWidth,
      monthStart,
      onProgress: handleProgress,
      onComplete: handleComplete,
      onCancel: handleCancel,
      allTasks,
      disableConstraints,
    };
  }, [edgeZoneWidth, currentLeft, currentWidth, dayWidth, monthStart, taskId, onDragStateChange, handleProgress, handleComplete, handleCancel, allTasks, disableConstraints]);

  /**
   * Get cursor style based on current position
   */
  const getCursorStyle = useCallback((): string => {
    if (isDragging) {
      return 'grabbing';
    }
    return 'grab';
  }, [isDragging]);

  return {
    isDragging,
    dragMode,
    currentLeft,
    currentWidth,
    dragHandleProps: {
      onMouseDown: handleMouseDown,
      style: {
        cursor: getCursorStyle(),
        userSelect: 'none',
      } as React.CSSProperties,
    },
  };
};
