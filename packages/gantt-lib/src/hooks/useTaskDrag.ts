'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { detectEdgeZone } from '../utils/geometry';
import type { Task, TaskDependency, LinkType } from '../types';
import { isMilestoneTask, normalizeTaskDatesForType } from '../utils/taskType';
// Domain scheduling functions
import {
  buildTaskRangeFromEnd,
  buildTaskRangeFromStart,
  calculateSuccessorDate,
  clampTaskRangeForIncomingFS,
  getDependencyLag,
  moveTaskRange,
  recalculateIncomingLags,
  isTaskParent,
  universalCascade,
  createCascadeContext,
  type CascadeContext,
} from '../core/scheduling';

// UI adapter functions (pixel-to-date conversion)
import { resolveDateRangeFromPixels, clampDateRangeForIncomingFS } from '../adapters/scheduling';

/**
 * Get transitive closure of successors for cascading.
 *
 * For proper cascading in mixed link type chains (e.g., A--FS-->B--SS-->C),
 * we need to include cascaded tasks' successors regardless of link type.
 *
 * The chain is:
 * 1. Direct successors of the dragged task, filtered by firstLevelLinkTypes
 * 2. ALL successors (any type) of those tasks, recursively
 *
 * @param draggedTaskId - ID of the task being dragged
 * @param allTasks - All tasks in the chart
 * @param firstLevelLinkTypes - Link types to use for direct successors
 * @returns Array of tasks in the cascade chain (transitive closure)
 */
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
  onComplete: (
    finalLeft: number,
    finalWidth: number,
    finalMode: 'move' | 'resize-left' | 'resize-right',
    cascadeContext?: CascadeContext
  ) => void;
  onCancel: () => void;
  allTasks: Task[];
  disableConstraints?: boolean;
  onCascadeProgress?: (
    overrides: Map<string, { left: number; width: number }>,
    previewTasks?: Task[]
  ) => void;
  businessDays?: boolean;
  weekendPredicate?: (date: Date) => boolean;
  cascadeContext?: CascadeContext;
  draggedTask?: Task;
  skipLiveCascadePreview?: boolean;
}

let globalActiveDrag: ActiveDragState | null = null;
let globalRafId: number | null = null;
let globalLockedCursor: string | null = null;
const GLOBAL_CURSOR_STYLE_ID = 'gantt-global-drag-cursor-style';
const MAX_LIVE_CASCADE_PREVIEW_TASKS = 200;

function ensureGlobalCursorStyle() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(GLOBAL_CURSOR_STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = GLOBAL_CURSOR_STYLE_ID;
  style.textContent = `
    html.gantt-global-cursor-grabbing,
    html.gantt-global-cursor-grabbing *,
    html.gantt-global-cursor-grabbing *::before,
    html.gantt-global-cursor-grabbing *::after {
      cursor: grabbing !important;
    }

    html.gantt-global-cursor-resize,
    html.gantt-global-cursor-resize *,
    html.gantt-global-cursor-resize *::before,
    html.gantt-global-cursor-resize *::after {
      cursor: ew-resize !important;
    }
  `;
  document.head.appendChild(style);
}

function applyGlobalCursor(cursor: string) {
  if (typeof document === 'undefined') return;
  ensureGlobalCursorStyle();
  globalLockedCursor = cursor;
  document.documentElement.classList.remove('gantt-global-cursor-grabbing', 'gantt-global-cursor-resize');
  document.documentElement.classList.add(cursor === 'grabbing' ? 'gantt-global-cursor-grabbing' : 'gantt-global-cursor-resize');
  document.body.style.cursor = cursor;
  document.documentElement.style.cursor = cursor;
}

function clearGlobalCursor() {
  if (typeof document === 'undefined') return;
  globalLockedCursor = null;
  document.documentElement.classList.remove('gantt-global-cursor-grabbing', 'gantt-global-cursor-resize');
  document.body.style.cursor = '';
  document.documentElement.style.cursor = '';
}

function exceedsLiveCascadePreviewLimit(
  context: CascadeContext | undefined,
  taskId: string,
  limit: number
): boolean {
  if (!context) return false;

  const visited = new Set<string>([taskId]);
  const queue = [taskId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const relatedTasks = [
      ...(context.childrenByParentId.get(currentId) ?? []),
      ...(context.dependentsByPredecessorId.get(currentId) ?? []).map(({ task }) => task),
    ];

    for (const task of relatedTasks) {
      if (visited.has(task.id)) continue;
      visited.add(task.id);
      if (visited.size > limit) {
        return true;
      }
      queue.push(task.id);
    }
  }

  return false;
}

function getDayOffsetFromMonthStart(date: Date, monthStart: Date): number {
  return Math.round(
    (Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) -
      Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), monthStart.getUTCDate())) /
      (24 * 60 * 60 * 1000)
  );
}

/**
 * Complete the active drag operation
 */
function completeDrag() {
  if (globalRafId !== null) {
    cancelAnimationFrame(globalRafId);
    globalRafId = null;
  }

  clearGlobalCursor();

  if (globalActiveDrag) {
    // Clear cascade overrides before completing (avoids stale preview positions)
    globalActiveDrag.onCascadeProgress?.(new Map(), []);
    const { onComplete, currentLeft, currentWidth, mode, cascadeContext } = globalActiveDrag;
    globalActiveDrag = null;
    onComplete(currentLeft, currentWidth, mode, cascadeContext);
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

  clearGlobalCursor();

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

    // Calculate expected date based on link type (lag ignored, always 0)
    const expectedDate = calculateSuccessorDate(
      predecessorStart,
      predecessorEnd,
      dep.type,
      0  // lag not used in calculations
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
 * Recalculate lag values for incoming dependencies after drag completion.
 *
 * Lag formulas:
 * - FS: lag = startB - endA (can be negative)
 * - SS: lag = startB - startA (floor at 0)
 * - FF: lag = endB - endA (can be negative)
 * - SF: lag = endB - startA (ceiling at 0)
 */
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

    const activeDrag = globalActiveDrag;

    const { startX, initialLeft, initialWidth, mode, dayWidth, onProgress, allTasks } = activeDrag;
    const deltaX = e.clientX - startX;

    // For milestones, force width to single day regardless of stored dates
    const draggedTask = activeDrag.draggedTask ?? activeDrag.cascadeContext?.taskById.get(activeDrag.taskId);
    const effectiveWidth = draggedTask && isMilestoneTask(draggedTask) ? dayWidth : initialWidth;

    let newLeft = initialLeft;
    let newWidth = effectiveWidth;

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

    // Incoming dependency lag is editable by dragging the successor itself.
    // Do not clamp successor movement/resize by its current dependency dates;
    // the new lag will be recomputed from the final dates on drop.

    if (activeDrag.businessDays && activeDrag.weekendPredicate && draggedTask) {
      const previewRange = clampDateRangeForIncomingFS(
        draggedTask,
        resolveDateRangeFromPixels(
          mode,
          newLeft,
          newWidth,
          activeDrag.monthStart,
          dayWidth,
          draggedTask,
          true,
          activeDrag.weekendPredicate
        ),
        allTasks,
        mode,
        true,
        activeDrag.weekendPredicate,
        activeDrag.cascadeContext?.taskById
      );
      const alignedStartDay = getDayOffsetFromMonthStart(previewRange.start, activeDrag.monthStart);
      const alignedEndDay = getDayOffsetFromMonthStart(previewRange.end, activeDrag.monthStart);
      newLeft = Math.round(alignedStartDay * dayWidth);
      newWidth = Math.round((alignedEndDay - alignedStartDay + 1) * dayWidth);
    } else if (draggedTask) {
      const previewRange = clampDateRangeForIncomingFS(
        draggedTask,
        resolveDateRangeFromPixels(
          mode,
          newLeft,
          newWidth,
          activeDrag.monthStart,
          dayWidth,
          draggedTask
        ),
        allTasks,
        mode,
        activeDrag.businessDays,
        activeDrag.weekendPredicate,
        activeDrag.cascadeContext?.taskById
      );
      const alignedStartDay = getDayOffsetFromMonthStart(previewRange.start, activeDrag.monthStart);
      const alignedEndDay = getDayOffsetFromMonthStart(previewRange.end, activeDrag.monthStart);
      newLeft = Math.round(alignedStartDay * dayWidth);
      newWidth = Math.round((alignedEndDay - alignedStartDay + 1) * dayWidth);
    }

    // Milestone: force single-day width after all date recalculations
    if (draggedTask && isMilestoneTask(draggedTask)) {
      newWidth = dayWidth;
    }

    if (newLeft === activeDrag.currentLeft && newWidth === activeDrag.currentWidth) {
      globalRafId = null;
      return;
    }

    // ── Universal preview cascade ──────────────────────────────────────────
    // Same algorithm as handleComplete — converts pixels→dates, runs
    // universalCascade, converts dates→pixels for overrides.

    // Universal preview: convert pixels → dates → universalCascade → pixels
    if (!activeDrag.disableConstraints && activeDrag.onCascadeProgress && !activeDrag.skipLiveCascadePreview) {
      const { dayWidth, monthStart: mStart, taskId: dragId } = activeDrag;
      const originalDraggedTask = draggedTask ?? allTasks.find(t => t.id === dragId);
      const previewRange = originalDraggedTask
        ? clampDateRangeForIncomingFS(
          originalDraggedTask,
          resolveDateRangeFromPixels(
            mode,
            newLeft,
            newWidth,
            mStart,
            dayWidth,
            originalDraggedTask,
            activeDrag.businessDays,
            activeDrag.weekendPredicate
          ),
          allTasks,
          mode,
          activeDrag.businessDays,
          activeDrag.weekendPredicate,
          activeDrag.cascadeContext?.taskById
        )
        : (() => {
          const previewStartDay = Math.round(newLeft / dayWidth);
          const previewEndDay = previewStartDay + Math.round(newWidth / dayWidth) - 1;
          return {
            start: new Date(Date.UTC(
              mStart.getUTCFullYear(), mStart.getUTCMonth(), mStart.getUTCDate() + previewStartDay
            )),
            end: new Date(Date.UTC(
              mStart.getUTCFullYear(), mStart.getUTCMonth(), mStart.getUTCDate() + previewEndDay
            )),
          };
        })();
      const previewStartDate = previewRange.start;
      const isMilestone = originalDraggedTask ? isMilestoneTask(originalDraggedTask) : false;
      const previewEndDate = isMilestone ? previewRange.start : previewRange.end;

      const movedTaskData = originalDraggedTask ?? { id: dragId, name: '', startDate: '', endDate: '' };
      const cascadeResult = universalCascade(
        { ...movedTaskData, startDate: previewStartDate.toISOString(), endDate: previewEndDate.toISOString() },
        previewStartDate,
        previewEndDate,
        allTasks,
        activeDrag.businessDays,
        activeDrag.weekendPredicate,
        activeDrag.cascadeContext
      );

      const hasTasksWithIncomingDependencies = cascadeResult.some(task => task.dependencies?.length);
      const previewTasks = hasTasksWithIncomingDependencies
        ? (() => {
          const mergedPreviewTaskById = new Map(activeDrag.cascadeContext?.taskById);
          for (const task of cascadeResult) {
            mergedPreviewTaskById.set(task.id, task);
          }

          return cascadeResult.map(task => {
            const previewStart = new Date(task.startDate as string);
            const previewEnd = new Date(task.endDate as string);
            return {
              ...task,
              dependencies: task.dependencies
                ? recalculateIncomingLags(
                  task,
                  previewStart,
                  previewEnd,
                  allTasks,
                  activeDrag.businessDays,
                  activeDrag.weekendPredicate,
                  mergedPreviewTaskById
                )
                : task.dependencies,
            };
          });
        })()
        : [];

      // Convert cascaded tasks → pixel overrides
      const overrides = new Map<string, { left: number; width: number }>();
      // Always include the dragged task itself
      overrides.set(dragId, { left: newLeft, width: newWidth });

      for (const task of cascadeResult) {
        if (task.id === dragId) continue;
        const taskStart = new Date(task.startDate as string);
        const taskEnd = new Date(task.endDate as string);
        const startOff = Math.round(
          (Date.UTC(taskStart.getUTCFullYear(), taskStart.getUTCMonth(), taskStart.getUTCDate()) -
            Date.UTC(mStart.getUTCFullYear(), mStart.getUTCMonth(), mStart.getUTCDate()))
          / (24 * 60 * 60 * 1000)
        );
        const endOff = Math.round(
          (Date.UTC(taskEnd.getUTCFullYear(), taskEnd.getUTCMonth(), taskEnd.getUTCDate()) -
            Date.UTC(mStart.getUTCFullYear(), mStart.getUTCMonth(), mStart.getUTCDate()))
          / (24 * 60 * 60 * 1000)
        );
        overrides.set(task.id, {
          left: Math.round(startOff * dayWidth),
          width: Math.round((endOff - startOff + 1) * dayWidth),
        });
      }

      activeDrag.onCascadeProgress(overrides, previewTasks);
    }

    // Update current values in global state for completion
    activeDrag.currentLeft = newLeft;
    activeDrag.currentWidth = newWidth;

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
  /** Current task object, when the caller already has it */
  task?: Task;
  /** Initial start date of the task */
  initialStartDate: Date;
  /** Initial end date of the task */
  initialEndDate: Date;
  /** Start of the visible range (e.g., month start) */
  monthStart: Date;
  /** Width of each day in pixels */
  dayWidth: number;
  /** Callback when drag operation completes */
  onDragEnd?: (result: { id: string; startDate: Date; endDate: Date; updatedDependencies?: Task['dependencies'] }) => void;
  /** Callback for drag state changes (for parent components to render guide lines) */
  onDragStateChange?: (state: {
    isDragging: boolean;
    dragMode: 'move' | 'resize-left' | 'resize-right' | null;
    left: number;
    width: number;
    liveDependencyUpdate?: boolean;
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
  /** Callback for real-time cascade preview — called each RAF with non-dragged chain member positions */
  onCascadeProgress?: (
    overrides: Map<string, { left: number; width: number }>,
    previewTasks?: Task[]
  ) => void;
  /** Callback when cascade completes — receives all shifted tasks including dragged task */
  onCascade?: (tasks: Task[]) => void;
  /** When true, all drag and resize interactions are disabled for this task */
  locked?: boolean;
  /** When true, drag is disabled globally for all tasks (shows grab cursor instead of not-allowed) */
  disableTaskDrag?: boolean;
  /** If true, dependency cascade calculations skip weekends */
  businessDays?: boolean;
  /** Function that returns true for weekends (for businessDays mode) */
  weekendPredicate?: (date: Date) => boolean;
  /** Active chart view mode */
  viewMode?: 'day' | 'week' | 'month';
  /** Whether this task has direct children, precomputed by the row when available */
  isParent?: boolean;
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
    onMouseMove: (e: React.MouseEvent) => void;
    onMouseLeave: () => void;
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
    task,
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
    onCascadeProgress,
    onCascade,
    locked = false,
    disableTaskDrag = false,
    businessDays = true,
    weekendPredicate,
    viewMode = 'day',
    isParent,
  } = options;
  const rawHookTask = task ?? allTasks.find(t => t.id === taskId);
  const hookTask = rawHookTask ? normalizeTaskDatesForType(rawHookTask) : undefined;
  const hookTaskIsMilestone = hookTask ? isMilestoneTask(hookTask) : false;
  const hookTaskIsParent = isParent ?? isTaskParent(taskId, allTasks);

  // Track if this hook instance owns the current global drag
  const isOwnerRef = useRef<boolean>(false);
  const effectiveLocked = locked || disableTaskDrag;

  // Display state (triggers re-renders only when needed)
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragMode, setDragMode] = useState<'move' | 'resize-left' | 'resize-right' | null>(null);
  const [currentLeft, setCurrentLeft] = useState<number>(0);
  const [currentWidth, setCurrentWidth] = useState<number>(0);
  const [hoverCursor, setHoverCursor] = useState<string>('grab');

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
    const duration = hookTaskIsMilestone
      ? 0
      : getUTCDayDifference(initialEndDate, initialStartDate);

    const left = Math.round(startOffset * dayWidth);
    const width = Math.round((duration + 1) * dayWidth); // +1 to include end date

    return { left, width };
  }, [initialStartDate, initialEndDate, monthStart, dayWidth, hookTaskIsMilestone]);

  /**
   * Initialize position when dates or dayWidth changes.
   * Skipped when this instance owns an active drag to avoid overriding drag state.
   */
  useEffect(() => {
    if (isOwnerRef.current && globalActiveDrag) return;
    const { left, width } = getInitialPosition();
    setCurrentLeft(left);
    setCurrentWidth(width);
  }, [getInitialPosition]);

  /**
   * When monthStart changes during an active drag (e.g. a month is prepended),
   * the pixel coordinate origin shifts. Adjust globalActiveDrag so that
   * subsequent move calculations stay in the new coordinate space.
   */
  useEffect(() => {
    if (!isOwnerRef.current || !globalActiveDrag) return;
    const oldMonthStart = globalActiveDrag.monthStart;
    if (oldMonthStart === monthStart) return;
    const daysShift = Math.round(
      (Date.UTC(oldMonthStart.getUTCFullYear(), oldMonthStart.getUTCMonth(), oldMonthStart.getUTCDate()) -
        Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), monthStart.getUTCDate())) /
        (1000 * 60 * 60 * 24)
    );
    const pixelShift = daysShift * dayWidth;
    globalActiveDrag.initialLeft += pixelShift;
    globalActiveDrag.currentLeft += pixelShift;
    globalActiveDrag.monthStart = monthStart;
  }, [monthStart, dayWidth]);

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
        liveDependencyUpdate: !globalActiveDrag?.skipLiveCascadePreview,
      });
    }
  }, [onDragStateChange]);

  /**
   * Handle drag completion from global manager
   */
  const handleComplete = useCallback((
    finalLeft: number,
    finalWidth: number,
    finalMode: 'move' | 'resize-left' | 'resize-right',
    cascadeContext?: CascadeContext
  ) => {
    const wasOwner = isOwnerRef.current;
    isOwnerRef.current = false;

    const currentTaskRaw = allTasks.find(t => t.id === taskId);
    const currentTask = currentTaskRaw ? normalizeTaskDatesForType(currentTaskRaw) : undefined;
    const finalRange = currentTask
      ? clampDateRangeForIncomingFS(
        currentTask,
        resolveDateRangeFromPixels(
          finalMode,
          finalLeft,
          finalWidth,
          monthStart,
          dayWidth,
          currentTask,
          businessDays,
          weekendPredicate
        ),
        allTasks,
        finalMode,
        businessDays,
        weekendPredicate,
        cascadeContext?.taskById
      )
      : (() => {
        const dayOffset = Math.round(finalLeft / dayWidth);
        const durationDays = Math.round(finalWidth / dayWidth) - 1;
        return {
          start: new Date(Date.UTC(
            monthStart.getUTCFullYear(),
            monthStart.getUTCMonth(),
            monthStart.getUTCDate() + dayOffset
          )),
          end: new Date(Date.UTC(
            monthStart.getUTCFullYear(),
            monthStart.getUTCMonth(),
            monthStart.getUTCDate() + dayOffset + durationDays
          )),
        };
      })();

    const newStartDate = finalRange.start;
    const newEndDate = currentTask && isMilestoneTask(currentTask)
      ? finalRange.start
      : finalRange.end;

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
        liveDependencyUpdate: false,
      });
    }

    if (wasOwner) {
      // Skip if position didn't actually change (e.g. click without drag)
      const startUnchanged = newStartDate.getTime() === Date.UTC(
        initialStartDate.getUTCFullYear(), initialStartDate.getUTCMonth(), initialStartDate.getUTCDate()
      );
      const baselineEndDate = hookTaskIsMilestone ? initialStartDate : initialEndDate;
      const endUnchanged = newEndDate.getTime() === Date.UTC(
        baselineEndDate.getUTCFullYear(), baselineEndDate.getUTCMonth(), baselineEndDate.getUTCDate()
      );
      if (startUnchanged && endUnchanged) {
        // Reset position from dates (in case pixel rounding drifted)
        const { left, width } = getInitialPosition();
        setCurrentLeft(left);
        setCurrentWidth(width);
        return;
      }

      if (!disableConstraints && onCascade && allTasks.length > 0) {
        // Hard mode with onCascade: use universalCascade for all cases
        // (parent drag, child drag, root task drag — all handled uniformly)
        const draggedTaskData = currentTask;

        const movedTask: Task = {
          ...(draggedTaskData ?? { id: taskId, name: '', startDate: '', endDate: '' }),
          startDate: newStartDate.toISOString(),
          endDate: newEndDate.toISOString(),
          ...(draggedTaskData?.dependencies && {
            dependencies: recalculateIncomingLags(
              draggedTaskData,
              newStartDate,
              newEndDate,
              allTasks,
              businessDays,
              weekendPredicate,
              cascadeContext?.taskById
            ),
          }),
        };

        const cascadeResult = universalCascade(
          movedTask,
          newStartDate,
          newEndDate,
          allTasks,
          businessDays,
          weekendPredicate,
          cascadeContext
        );

        if (cascadeResult.length > 0) {
          onCascade([movedTask, ...cascadeResult]);
          return; // Don't call onDragEnd — cascade covers the dragged task too
        }

        // No dependent tasks to cascade — still call onCascade with just the moved task
        // so the state update is consistent
        onCascade([movedTask]);
        return;
      }

      // Soft mode OR hard mode with no FS successors: call onDragEnd
      // Always recalculate lag so hard-mode drags (chain.length===0) also persist the new lag
      if (allTasks.length > 0 && onDragEnd) {
        const updatedDependencies = currentTask?.dependencies
          ? recalculateIncomingLags(
            currentTask,
            newStartDate,
            newEndDate,
            allTasks,
            businessDays,
            weekendPredicate,
            cascadeContext?.taskById
          )
          : undefined;
        onDragEnd({ id: taskId, startDate: newStartDate, endDate: newEndDate, updatedDependencies });
      } else if (onDragEnd) {
        onDragEnd({ id: taskId, startDate: newStartDate, endDate: newEndDate });
      }
    }
  }, [
    dayWidth,
    monthStart,
    onDragEnd,
    onDragStateChange,
    taskId,
    disableConstraints,
    onCascade,
    allTasks,
    businessDays,
    weekendPredicate,
    initialStartDate,
    initialEndDate,
    hookTaskIsMilestone,
  ]);

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
        liveDependencyUpdate: false,
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
  const startDrag = useCallback((e: React.MouseEvent) => {
    // Phase 11: locked tasks cannot be dragged or resized
    if (effectiveLocked) return;

    const target = e.currentTarget as HTMLElement;
    const currentTask = hookTask;
    const isSingleDayTask = !!currentTask
      && !isMilestoneTask(currentTask)
      && !hookTaskIsParent
      && currentWidth <= dayWidth
      && viewMode === 'day';

    let mode: 'move' | 'resize-left' | 'resize-right' | null = null;

    if (isSingleDayTask) {
      mode = 'move';
    } else {
      const edgeZone = detectEdgeZone(e.clientX, target, edgeZoneWidth);

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
    }

    // Phase 19: Parent tasks cannot be resized - their dates are computed from children
    // Force move mode for parent tasks to prevent resize operations
    if (mode === 'resize-left' || mode === 'resize-right') {
      if (currentTask && hookTaskIsParent) {
        mode = 'move';
      }
      if (currentTask && isMilestoneTask(currentTask)) {
        mode = 'move';
      }
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
    applyGlobalCursor(mode === 'move' ? 'grabbing' : 'ew-resize');

    // Ensure global listeners are attached (idempotent)
    ensureGlobalListeners();

    // Store drag state in global singleton
    const shouldBuildCascadeContext = !disableConstraints && (Boolean(onCascadeProgress) || Boolean(onCascade));
    const cascadeContext = shouldBuildCascadeContext ? createCascadeContext(allTasks) : undefined;
    const skipLiveCascadePreview = Boolean(onCascadeProgress) &&
      exceedsLiveCascadePreviewLimit(cascadeContext, taskId, MAX_LIVE_CASCADE_PREVIEW_TASKS);

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
      onCascadeProgress,
      businessDays,
      weekendPredicate,
      cascadeContext,
      draggedTask: currentTask,
      skipLiveCascadePreview,
    };

    // Notify parent of drag start after globalActiveDrag is initialized so it
    // receives the live dependency update mode for large cascade drags.
    if (onDragStateChange) {
      onDragStateChange({
        isDragging: true,
        dragMode: mode,
        left: initialLeft,
        width: initialWidth,
        liveDependencyUpdate: !skipLiveCascadePreview,
      });
    }
  }, [edgeZoneWidth, currentLeft, currentWidth, dayWidth, monthStart, taskId, onDragStateChange, handleProgress, handleComplete, handleCancel, allTasks, disableConstraints, onCascadeProgress, onCascade, effectiveLocked, viewMode, hookTask, hookTaskIsParent]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    startDrag(e);
  }, [startDrag]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (disableTaskDrag) {
      setHoverCursor('grab');
      return;
    }

    if (locked) {
      setHoverCursor('not-allowed');
      return;
    }

    if (isDragging) {
      setHoverCursor('grabbing');
      return;
    }

    const target = e.currentTarget as HTMLElement;
    const currentTask = hookTask;
    const isSingleDayTask = !!currentTask
      && !isMilestoneTask(currentTask)
      && !hookTaskIsParent
      && currentWidth <= dayWidth
      && viewMode === 'day';

    if (isSingleDayTask || (currentTask && (hookTaskIsParent || isMilestoneTask(currentTask)))) {
      setHoverCursor('grab');
      return;
    }

    const edgeZone = detectEdgeZone(e.clientX, target, edgeZoneWidth);
    setHoverCursor(edgeZone === 'move' ? 'grab' : 'ew-resize');
  }, [disableTaskDrag, locked, isDragging, hookTask, hookTaskIsParent, currentWidth, dayWidth, viewMode, edgeZoneWidth]);

  const handleMouseLeave = useCallback(() => {
    setHoverCursor(disableTaskDrag ? 'grab' : locked ? 'not-allowed' : isDragging ? 'grabbing' : 'grab');
  }, [disableTaskDrag, locked, isDragging]);

  /**
   * Get cursor style based on current position
   */
  const getCursorStyle = useCallback((): string => {
    if (disableTaskDrag) return 'grab'; // Global disable - allow pan
    if (locked) return 'not-allowed';   // Task-specific locked
    if (isDragging) {
      return dragMode === 'move' ? 'grabbing' : 'ew-resize';
    }
    return hoverCursor;
  }, [disableTaskDrag, locked, isDragging, dragMode, hoverCursor]);

  return {
    isDragging,
    dragMode,
    currentLeft,
    currentWidth,
    dragHandleProps: {
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseLeave: handleMouseLeave,
      style: {
        cursor: getCursorStyle(),
        userSelect: 'none',
      } as React.CSSProperties,
    },
  };
};
