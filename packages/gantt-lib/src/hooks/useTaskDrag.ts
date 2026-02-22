'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { detectEdgeZone } from '../utils/geometry';
import type { Task, TaskDependency, LinkType } from '../types';
import { calculateSuccessorDate, getSuccessorChain } from '../utils/dependencyUtils';

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
function getTransitiveCascadeChain(
  draggedTaskId: string,
  allTasks: Task[],
  firstLevelLinkTypes: LinkType[]
): Task[] {
  // Build complete successor map (all link types: FS, SS, FF, SF)
  const allTypesSuccessorMap = new Map<string, Task[]>();
  for (const task of allTasks) {
    allTypesSuccessorMap.set(task.id, []);
  }
  for (const task of allTasks) {
    if (!task.dependencies) continue;
    for (const dep of task.dependencies) {
      const list = allTypesSuccessorMap.get(dep.taskId) ?? [];
      list.push(task);
      allTypesSuccessorMap.set(dep.taskId, list);
    }
  }

  // Get direct successors based on first level link types
  const directSuccessors = getSuccessorChain(draggedTaskId, allTasks, firstLevelLinkTypes);

  // Build transitive closure using BFS
  const chain = [...directSuccessors];
  const visited = new Set<string>([draggedTaskId, ...directSuccessors.map(t => t.id)]);
  const queue = [...directSuccessors];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const successors = allTypesSuccessorMap.get(current.id) ?? [];
    for (const successor of successors) {
      if (!visited.has(successor.id)) {
        visited.add(successor.id);
        chain.push(successor);
        queue.push(successor);
      }
    }
  }

  return chain;
}

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
  cascadeChain: Task[];        // FS+SS+FF+SF successors of dragged task (Phase 10: added SF)
  cascadeChainFS: Task[];      // FS-only successors (part of resize-right cascade with FF)
  cascadeChainStart: Task[];   // SS+SF successors (resize-left cascade) - Phase 10: renamed from cascadeChainSS
  cascadeChainEnd: Task[];     // FS+FF successors (resize-right cascade) - Phase 9
  onCascadeProgress?: (overrides: Map<string, { left: number; width: number }>) => void;
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
    // Clear cascade overrides before completing (avoids stale preview positions)
    globalActiveDrag.onCascadeProgress?.(new Map());
    const { onComplete, currentLeft, currentWidth } = globalActiveDrag;
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
function recalculateIncomingLags(
  task: Task,
  newStartDate: Date,
  newEndDate: Date,
  allTasks: Task[]
): NonNullable<Task['dependencies']> {
  if (!task.dependencies) return [];
  const taskById = new Map(allTasks.map(t => [t.id, t]));

  return task.dependencies.map(dep => {
    if (dep.type === 'FS') {
      // FS: lag = startB - endA (can be negative)
      const predecessor = taskById.get(dep.taskId);
      if (!predecessor) return dep;
      const predEnd = new Date(predecessor.endDate as string);
      const lagMs = Date.UTC(newStartDate.getUTCFullYear(), newStartDate.getUTCMonth(), newStartDate.getUTCDate())
                  - Date.UTC(predEnd.getUTCFullYear(), predEnd.getUTCMonth(), predEnd.getUTCDate());
      const lagDays = Math.round(lagMs / (24 * 60 * 60 * 1000));
      return { ...dep, lag: lagDays };
    }
    if (dep.type === 'SS') {
      // SS: lag = startB - startA (floor at 0)
      const predecessor = taskById.get(dep.taskId);
      if (!predecessor) return dep;
      const predStart = new Date(predecessor.startDate as string);
      const lagMs = Date.UTC(newStartDate.getUTCFullYear(), newStartDate.getUTCMonth(), newStartDate.getUTCDate())
                  - Date.UTC(predStart.getUTCFullYear(), predStart.getUTCMonth(), predStart.getUTCDate());
      const lagDays = Math.max(0, Math.round(lagMs / (24 * 60 * 60 * 1000))); // SS: floor at 0
      return { ...dep, lag: lagDays };
    }
    if (dep.type === 'FF') {
      // FF: lag = endB - endA (can be negative)
      const predecessor = taskById.get(dep.taskId);
      if (!predecessor) return dep;
      const predEnd = new Date(predecessor.endDate as string);
      const lagMs = Date.UTC(newEndDate.getUTCFullYear(), newEndDate.getUTCMonth(), newEndDate.getUTCDate())
                  - Date.UTC(predEnd.getUTCFullYear(), predEnd.getUTCMonth(), predEnd.getUTCDate());
      const lagDays = Math.round(lagMs / (24 * 60 * 60 * 1000));
      return { ...dep, lag: lagDays };
    }
    if (dep.type === 'SF') {
      // SF: lag = endB - startA (ceiling at 0)
      const predecessor = taskById.get(dep.taskId);
      if (!predecessor) return dep;
      const predStart = new Date(predecessor.startDate as string);
      const lagMs = Date.UTC(newEndDate.getUTCFullYear(), newEndDate.getUTCMonth(), newEndDate.getUTCDate())
                  - Date.UTC(predStart.getUTCFullYear(), predStart.getUTCMonth(), predStart.getUTCDate());
      const lagDays = Math.min(0, Math.round(lagMs / (24 * 60 * 60 * 1000))); // SF: ceiling at 0
      return { ...dep, lag: lagDays };
    }
    return dep;
  });
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

    // Hard mode: check left-move boundary against predecessor.startDate (Phase 7)
    // Child can move left until its startDate would go before predecessor.startDate
    // Also applies to resize-left: the left edge cannot cross the predecessor's start date
    if ((mode === 'move' || mode === 'resize-left') && allTasks.length > 0 && !globalActiveDrag.disableConstraints) {
      const currentTask = allTasks.find(t => t.id === globalActiveDrag?.taskId);
      if (currentTask && currentTask.dependencies && currentTask.dependencies.length > 0) {
        let minAllowedLeft = 0; // in pixels from monthStart
        for (const dep of currentTask.dependencies) {
          if (dep.type !== 'FS' && dep.type !== 'SS') continue; // Phase 8: FS and SS
          const predecessor = globalActiveDrag.allTasks.find(t => t.id === dep.taskId);
          if (!predecessor) continue;
          // Boundary: child.startDate >= predecessor.startDate (allows negative lag)
          const predStart = new Date(predecessor.startDate as string);
          const predStartOffset = Math.round(
            (Date.UTC(predStart.getUTCFullYear(), predStart.getUTCMonth(), predStart.getUTCDate()) -
              Date.UTC(
                globalActiveDrag.monthStart.getUTCFullYear(),
                globalActiveDrag.monthStart.getUTCMonth(),
                globalActiveDrag.monthStart.getUTCDate()
              )) / (24 * 60 * 60 * 1000)
          );
          const predStartLeft = Math.round(predStartOffset * globalActiveDrag.dayWidth);
          minAllowedLeft = Math.max(minAllowedLeft, predStartLeft);
        }
        // Clamp: don't let task go left of boundary
        newLeft = Math.max(minAllowedLeft, newLeft);
      }
      // For resize-left, after clamping newLeft the right edge is fixed so newWidth must be recomputed
      if (mode === 'resize-left') {
        const rightEdge = globalActiveDrag.initialLeft + globalActiveDrag.initialWidth;
        newWidth = Math.max(globalActiveDrag.dayWidth, rightEdge - newLeft);
      }
    }

    // Phase 10: SF constraint: endB <= startA (lag ceiling at 0)
    // Applies when B is moved right or resized-right
    if ((mode === 'move' || mode === 'resize-right') && allTasks.length > 0 && !globalActiveDrag.disableConstraints) {
      const currentTask = allTasks.find(t => t.id === globalActiveDrag?.taskId);
      if (currentTask && currentTask.dependencies && currentTask.dependencies.length > 0) {
        for (const dep of currentTask.dependencies) {
          if (dep.type !== 'SF') continue;
          const predecessor = globalActiveDrag.allTasks.find(t => t.id === dep.taskId);
          if (!predecessor) continue;
          const predStart = new Date(predecessor.startDate as string);
          const predStartOffset = Math.round(
            (Date.UTC(predStart.getUTCFullYear(), predStart.getUTCMonth(), predStart.getUTCDate()) -
              Date.UTC(globalActiveDrag.monthStart.getUTCFullYear(), globalActiveDrag.monthStart.getUTCDate(), globalActiveDrag.monthStart.getUTCDate()))
            / (24 * 60 * 60 * 1000)
          );
          const predStartLeft = Math.round(predStartOffset * globalActiveDrag.dayWidth);
          const currentEndRight = newLeft + newWidth;
          const maxAllowedEndRight = predStartLeft;  // endB cannot exceed startA
          if (currentEndRight > maxAllowedEndRight) {
            // Clamp width so endB = startA
            newWidth = Math.max(globalActiveDrag.dayWidth, maxAllowedEndRight - newLeft);
          }
        }
      }
    }

    // Phase 9: select chain based on drag mode
    // move: all FS+SS+FF+SF successors follow
    // resize-right: FS+FF successors (endA changes, SS/SF unaffected)
    // resize-left: SS+SF successors only (startA changes, FS/FF unaffected)
    // Phase 10: added SF
    const activeChain =
      mode === 'resize-right' ? globalActiveDrag.cascadeChainEnd :    // FS + FF
      mode === 'resize-left'  ? globalActiveDrag.cascadeChainStart :  // SS + SF
      /* move */                globalActiveDrag.cascadeChain;         // FS + SS + FF + SF

    // Hard mode cascade: emit position overrides for successor chain members
    if ((mode === 'move' || mode === 'resize-right' ||
         (mode === 'resize-left' && globalActiveDrag.cascadeChainStart.length > 0)) &&
        !globalActiveDrag.disableConstraints &&
        activeChain.length > 0 &&
        globalActiveDrag.onCascadeProgress) {
      // For move/resize-left: delta from left (startA shift)
      // For resize-right: delta from width (endA shift, startA fixed)
      const deltaDays = mode === 'resize-right'
        ? Math.round((newWidth - globalActiveDrag.initialWidth) / globalActiveDrag.dayWidth)
        : Math.round((newLeft - globalActiveDrag.initialLeft) / globalActiveDrag.dayWidth);
      const overrides = new Map<string, { left: number; width: number }>();
      const draggedTaskId = globalActiveDrag.taskId;
      const dayWidth = globalActiveDrag.dayWidth;
      const monthStart = globalActiveDrag.monthStart;

      for (const chainTask of activeChain) {
        const chainStart = new Date(chainTask.startDate as string);
        const chainEnd = new Date(chainTask.endDate as string);
        const chainStartOffset = Math.round(
          (Date.UTC(chainStart.getUTCFullYear(), chainStart.getUTCMonth(), chainStart.getUTCDate()) -
            Date.UTC(
              monthStart.getUTCFullYear(),
              monthStart.getUTCMonth(),
              monthStart.getUTCDate()
            )) / (24 * 60 * 60 * 1000)
        );
        const chainEndOffset = Math.round(
          (Date.UTC(chainEnd.getUTCFullYear(), chainEnd.getUTCMonth(), chainEnd.getUTCDate()) -
            Date.UTC(
              monthStart.getUTCFullYear(),
              monthStart.getUTCMonth(),
              monthStart.getUTCDate()
            )) / (24 * 60 * 60 * 1000)
        );
        const chainDuration = Math.round(
          (Date.UTC(chainEnd.getUTCFullYear(), chainEnd.getUTCMonth(), chainEnd.getUTCDate()) -
            Date.UTC(chainStart.getUTCFullYear(), chainStart.getUTCMonth(), chainStart.getUTCDate())
          ) / (24 * 60 * 60 * 1000)
        );

        // Phase 9: Check if this chainTask has FF dependency on dragged task
        // For FF tasks, calculate position from end offset (not start offset)
        // This fixes negative lag preview where child starts before parent
        // Phase 10: SF tasks also position from end offset (endB constrained to startA)
        const hasFFDepOnDragged = chainTask.dependencies?.some(
          dep => dep.taskId === draggedTaskId && dep.type === 'FF'
        );
        const hasSFDepOnDragged = chainTask.dependencies?.some(
          dep => dep.taskId === draggedTaskId && dep.type === 'SF'
        );

        let chainLeft;
        if (hasFFDepOnDragged || hasSFDepOnDragged) {
          // FF/SF: position based on end date shift, then back up by duration
          // This works correctly even when child starts before parent (negative lag)
          // For SF: endB shifts with startA, then back up by duration
          chainLeft = Math.round((chainEndOffset + deltaDays - chainDuration) * dayWidth);
        } else {
          // FS/SS: position based on start date shift
          chainLeft = Math.round((chainStartOffset + deltaDays) * dayWidth);
        }

        const chainWidth = Math.round((chainDuration + 1) * dayWidth); // +1 inclusive

        // SS lag floor: when A moves left, B follows but chainLeft cannot go below A's new position
        // This keeps lag >= 0 (startB >= startA) during live drag preview
        // Phase 9: Only apply floor to SS tasks, not FF (FF allows negative lag)
        // Phase 10: SF uses end-based positioning, no floor needed
        const hasSSDepOnDragged = chainTask.dependencies?.some(
          dep => dep.taskId === draggedTaskId && dep.type === 'SS'
        );
        if (hasSSDepOnDragged && (mode === 'move' || mode === 'resize-left')) {
          chainLeft = Math.max(chainLeft, newLeft);
        }

        overrides.set(chainTask.id, { left: chainLeft, width: chainWidth });
      }
      globalActiveDrag.onCascadeProgress(overrides);
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
  onDragEnd?: (result: { id: string; startDate: Date; endDate: Date; updatedDependencies?: Task['dependencies'] }) => void;
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
  /** Callback for real-time cascade preview — called each RAF with non-dragged chain member positions */
  onCascadeProgress?: (overrides: Map<string, { left: number; width: number }>) => void;
  /** Callback when cascade completes — receives all shifted tasks including dragged task */
  onCascade?: (tasks: Task[]) => void;
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
    onCascadeProgress,
    onCascade,
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

    if (wasOwner) {
      if (!disableConstraints && onCascade && allTasks.length > 0) {
        // Hard mode with onCascade: compute cascade and call onCascade

        // CHANGE C: Dual-delta logic — compute from both start and end date changes
        // Compute delta from startDate change (correct for move and resize-left)
        const origStartMs = Date.UTC(
          initialStartDate.getUTCFullYear(),
          initialStartDate.getUTCMonth(),
          initialStartDate.getUTCDate()
        );
        const newStartMs = Date.UTC(
          newStartDate.getUTCFullYear(),
          newStartDate.getUTCMonth(),
          newStartDate.getUTCDate()
        );
        const deltaFromStart = Math.round((newStartMs - origStartMs) / (24 * 60 * 60 * 1000));

        // Compute delta from endDate change (correct for resize-right)
        const origEndMs = Date.UTC(
          initialEndDate.getUTCFullYear(),
          initialEndDate.getUTCMonth(),
          initialEndDate.getUTCDate()
        );
        const newEndMs = Date.UTC(
          newEndDate.getUTCFullYear(),
          newEndDate.getUTCMonth(),
          newEndDate.getUTCDate()
        );
        const deltaFromEnd = Math.round((newEndMs - origEndMs) / (24 * 60 * 60 * 1000));

        // For resize-right: startDate unchanged, use endDate delta (FS successors follow end)
        // For move and resize-left: use startDate delta (SS and FS-move successors follow start)
        // Detect resize-right: startDate didn't change
        const deltaDays = deltaFromStart === 0 ? deltaFromEnd : deltaFromStart;

        // CHANGE D: Phase 8: get correct chain for completion based on what changed
        // - resize-right (deltaFromStart === 0): only endDate changed → FS successors follow end
        // - resize-left  (deltaFromStart !== 0, deltaFromEnd === 0): only startDate changed →
        //     SS successors follow start; FS successors are anchored to predecessor's END which
        //     is unchanged, so FS successors must NOT cascade on resize-left
        // - move (deltaFromStart !== 0, deltaFromEnd !== 0): both dates shift equally →
        //     both FS and SS successors follow
        //
        // FIX: For proper transitive closure in mixed link type chains (e.g., A--FS-->B--SS-->C),
        // we use getTransitiveCascadeChain which includes cascaded tasks' successors regardless of link type.
        // Phase 9: FF included in resize-right and move chains
        const isResizeLeft = deltaFromStart !== 0 && deltaFromEnd === 0;
        const chainForCompletion = deltaFromStart === 0
          ? getTransitiveCascadeChain(taskId, allTasks, ['FS', 'FF'])               // resize-right: FS + FF
          : isResizeLeft
            ? getTransitiveCascadeChain(taskId, allTasks, ['SS', 'SF'])             // resize-left: SS + SF
            : getTransitiveCascadeChain(taskId, allTasks, ['FS', 'SS', 'FF', 'SF']); // move: all types

        if (chainForCompletion.length > 0) {
          const draggedTaskData = allTasks.find(t => t.id === taskId);
          const cascadedTasks: Task[] = [
            {
              ...(draggedTaskData ?? { id: taskId, name: '', startDate: '', endDate: '' }),
              startDate: newStartDate.toISOString(),
              endDate: newEndDate.toISOString(),
              ...(draggedTaskData?.dependencies && {
                dependencies: recalculateIncomingLags(draggedTaskData, newStartDate, newEndDate, allTasks),
              }),
            },
            ...chainForCompletion.map(chainTask => {
              const origStart = new Date(chainTask.startDate as string);
              const origEnd = new Date(chainTask.endDate as string);
              const newStart = new Date(Date.UTC(
                origStart.getUTCFullYear(), origStart.getUTCMonth(), origStart.getUTCDate() + deltaDays
              ));
              const newEnd = new Date(Date.UTC(
                origEnd.getUTCFullYear(), origEnd.getUTCMonth(), origEnd.getUTCDate() + deltaDays
              ));
              return { ...chainTask, startDate: newStart.toISOString(), endDate: newEnd.toISOString() };
            }),
          ];
          onCascade(cascadedTasks);
          return; // Don't call onDragEnd — cascade covers the dragged task too
        }
      }

      // Soft mode OR hard mode with no FS successors: call onDragEnd
      // Always recalculate lag so hard-mode drags (chain.length===0) also persist the new lag
      if (allTasks.length > 0 && onDragEnd) {
        const currentTaskData = allTasks.find(t => t.id === taskId);
        const updatedDependencies = currentTaskData?.dependencies
          ? recalculateIncomingLags(currentTaskData, newStartDate, newEndDate, allTasks)
          : undefined;
        onDragEnd({ id: taskId, startDate: newStartDate, endDate: newEndDate, updatedDependencies });
      } else if (onDragEnd) {
        onDragEnd({ id: taskId, startDate: newStartDate, endDate: newEndDate });
      }
    }
  }, [dayWidth, monthStart, onDragEnd, onDragStateChange, taskId, disableConstraints, onCascade, allTasks, initialStartDate, initialEndDate]);

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
      cascadeChain: !disableConstraints
        ? getTransitiveCascadeChain(taskId, allTasks, ['FS', 'SS', 'FF', 'SF'])   // all successors, used for move (Phase 10: added SF)
        : [],
      cascadeChainFS: !disableConstraints
        ? getTransitiveCascadeChain(taskId, allTasks, ['FS'])          // FS + transitive, used for resize-right
        : [],
      cascadeChainStart: !disableConstraints
        ? getTransitiveCascadeChain(taskId, allTasks, ['SS', 'SF'])    // SS + SF for resize-left cascade (Phase 10: renamed from cascadeChainSS)
        : [],
      cascadeChainEnd: !disableConstraints
        ? getTransitiveCascadeChain(taskId, allTasks, ['FS', 'FF'])    // FS + FF for resize-right cascade (Phase 9)
        : [],
      onCascadeProgress,
    };
  }, [edgeZoneWidth, currentLeft, currentWidth, dayWidth, monthStart, taskId, onDragStateChange, handleProgress, handleComplete, handleCancel, allTasks, disableConstraints, onCascadeProgress, onCascade]);

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
