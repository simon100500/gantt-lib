'use client';

import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import type { Task, TaskDependency } from '../GanttChart';
import type { LinkType } from '../../types';
import { validateDependencies, calculateSuccessorDate, isTaskParent } from '../../utils/dependencyUtils';
import { normalizeHierarchyTasks } from '../../utils/hierarchyOrder';
import { getVisibleReorderPosition } from '../../utils/taskListReorder';
import { getChildren } from '../../utils/dependencyUtils';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/Popover';
import { TaskListRow } from './TaskListRow';
import { NewTaskRow } from './NewTaskRow';
import { LINK_TYPE_ICONS, LINK_TYPE_LABELS } from './DepIcons';
import './TaskList.css';

export { LINK_TYPE_ICONS };

const LINK_TYPE_ORDER: LinkType[] = ['FS', 'SS', 'FF', 'SF'];
const MIN_TASK_LIST_WIDTH = 640;

/**
 * Get all descendant tasks of a parent task (recursively).
 * Returns an array of all tasks where task.parentId is in the parent chain.
 *
 * @param parentId - ID of the parent task
 * @param tasks - All tasks array
 * @returns Array of descendant tasks (not including the parent itself)
 */
function getAllDescendants(parentId: string, tasks: Task[]): Task[] {
  const descendants: Task[] = [];
  const visited = new Set<string>();

  function collectChildren(taskId: string) {
    if (visited.has(taskId)) return;
    visited.add(taskId);

    const children = getChildren(taskId, tasks);
    for (const child of children) {
      descendants.push(child);
      collectChildren(child.id);
    }
  }

  collectChildren(parentId);
  return descendants;
}

export interface TaskListProps {
  /** Array of tasks to display */
  tasks: Task[];
  /** Height of each row in pixels (must match Gantt chart's rowHeight) */
  rowHeight: number;
  /** Height of the header row in pixels (must match Gantt chart's headerHeight) */
  headerHeight: number;
  /** Width of the task list overlay in pixels (default: 400) */
  taskListWidth?: number;
  /** Callback when tasks are modified via inline edit. Receives array of changed tasks. */
  onTasksChange?: (tasks: Task[]) => void;
  /** ID of currently selected task */
  selectedTaskId?: string;
  /** Callback when task row is clicked */
  onTaskSelect?: (taskId: string | null) => void;
  /** Show or hide the task list (default: true) */
  show?: boolean;
  /** Show right-side shadow when chart content is horizontally scrolled */
  hasRightShadow?: boolean;
  /** Disable task name editing in the task list (default: false) */
  disableTaskNameEditing?: boolean;
  /** Disable dependency editing (hides +, ×, and type menu; read-only column) (default: false) */
  disableDependencyEditing?: boolean;
  /** Callback to scroll the chart grid to a task (wired to № cell click) */
  onScrollToTask?: (taskId: string) => void;
  /** Callback when selected chip changes (used by GanttChart to highlight the corresponding arrow) */
  onSelectedChipChange?: (chip: { successorId: string; predecessorId: string; linkType: string } | null) => void;
  /** Callback when a new task is added (called with full Task object including generated id) */
  onAdd?: (task: Task) => void;
  /** Callback when a task is deleted (called with taskId) */
  onDelete?: (taskId: string) => void;
  /** Callback when a new task is inserted after a specific task */
  onInsertAfter?: (taskId: string, newTask: Task) => void;
  /** Callback when tasks are reordered via drag in the task list */
  onReorder?: (tasks: Task[], movedTaskId?: string, inferredParentId?: string) => void;
  /** ID of task that should enter edit mode on mount (for auto-edit after insert) */
  editingTaskId?: string | null;
  /** Enable add task button at bottom of task list (default: true) */
  enableAddTask?: boolean;
  /** Set of collapsed parent task IDs */
  collapsedParentIds?: Set<string>;
  /** Callback when collapse/expand button is clicked */
  onToggleCollapse?: (parentId: string) => void;
  /** Callback when task is promoted (parentId removed) */
  onPromoteTask?: (taskId: string) => void;
  /** Callback when task is demoted (parentId set to previous task) */
  onDemoteTask?: (taskId: string, newParentId: string) => void;
}

/**
 * TaskList component - displays tasks in a table format as an overlay
 *
 * Renders a table with columns: № (number), Name, Start Date, End Date, Duration, Progress, Dependencies
 * Uses position: sticky for synchronized vertical scrolling with the chart.
 */
export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  rowHeight,
  headerHeight,
  taskListWidth = 640,
  onTasksChange,
  selectedTaskId,
  onTaskSelect,
  show = true,
  hasRightShadow = false,
  disableTaskNameEditing = false,
  disableDependencyEditing = false,
  onScrollToTask,
  onSelectedChipChange,
  onAdd,
  onDelete,
  onInsertAfter,
  onReorder,
  editingTaskId: propEditingTaskId,
  enableAddTask = true,
  collapsedParentIds: externalCollapsedParentIds,
  onToggleCollapse: externalOnToggleCollapse,
  onPromoteTask,
  onDemoteTask,
}) => {
  // Hierarchy state: collapsed parent IDs (uncontrolled mode - internal state)
  const [internalCollapsedParentIds, setInternalCollapsedParentIds] = useState<Set<string>>(new Set());

  // Use external collapsedParentIds if provided (controlled mode), otherwise use internal state
  const collapsedParentIds = externalCollapsedParentIds ?? internalCollapsedParentIds;

  // Use external onToggleCollapse if provided (controlled mode), otherwise use internal handler
  const handleToggleCollapse = externalOnToggleCollapse ?? useCallback((parentId: string) => {
    setInternalCollapsedParentIds(prev => {
      const next = new Set(prev);
      if (next.has(parentId)) {
        next.delete(parentId);
      } else {
        next.add(parentId);
      }
      return next;
    });
  }, []);

  const orderedTasks = useMemo(() => {
    console.log('=== TASKLIST orderedTasks useMemo START ===');
    console.log('[INPUT TASKS]', {
      count: tasks.length,
      tasks: tasks.map((t, i) => ({ id: t.id, name: t.name, parentId: t.parentId, index: i }))
    });

    const result = normalizeHierarchyTasks(tasks);

    console.log('[OUTPUT orderedTasks]', {
      count: result.length,
      tasks: result.map((t, i) => ({ id: t.id, name: t.name, parentId: t.parentId, index: i }))
    });
    console.log('=== TASKLIST orderedTasks useMemo END ===\n');

    return result;
  }, [tasks]);

  // Filter tasks to hide children of collapsed parents
  const visibleTasks = useMemo(() => {
    return orderedTasks.filter(task => {
      // Root-level tasks (no parentId) are always visible
      if (!task.parentId) return true;
      // Child tasks are visible only if their parent is not collapsed
      const parentCollapsed = collapsedParentIds.has(task.parentId);
      return !parentCollapsed;
    });
  }, [orderedTasks, collapsedParentIds]);

  const totalHeight = useMemo(
    () => visibleTasks.length * rowHeight,
    [visibleTasks.length, rowHeight]
  );

  const handleRowClick = useCallback((taskId: string) => {
    onTaskSelect?.(taskId);
  }, [onTaskSelect]);

  // Dependency state
  const [activeLinkType, setActiveLinkType] = useState<LinkType>('FS');
  const [selectingPredecessorFor, setSelectingPredecessorFor] = useState<string | null>(null);
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const [cycleError, setCycleError] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Selected chip state: clicking a chip on a successor row selects it,
  // causing the predecessor row to show a "Удалить" button
  const [selectedChip, setSelectedChip] = useState<{
    successorId: string;
    predecessorId: string;
    linkType: LinkType;
  } | null>(null);

  const handleChipSelect = useCallback((chip: {
    successorId: string;
    predecessorId: string;
    linkType: LinkType;
  } | null) => {
    setSelectedChip(chip);
    onSelectedChipChange?.(chip);
  }, [onSelectedChipChange]);

  // Escape / outside-click cancel for picker mode and chip selection
  useEffect(() => {
    if (!selectingPredecessorFor && !selectedChip) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectingPredecessorFor(null);
        setSelectedChip(null);
        onSelectedChipChange?.(null);
      }
    };
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Element;
      if (overlayRef.current?.contains(target)) return;
      // Don't clear when clicking inside a floating portal (popover, date picker, etc.)
      if (target.closest?.('.gantt-popover')) return;
      setSelectingPredecessorFor(null);
      setSelectedChip(null);
      onSelectedChipChange?.(null);
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown, true);
    };
  }, [selectingPredecessorFor, selectedChip, onSelectedChipChange]);

  const handleAddDependency = useCallback((
    successorTaskId: string,
    predecessorTaskId: string,
    linkType: LinkType
  ) => {
    // Guard: no self-links
    if (successorTaskId === predecessorTaskId) return;

    // Guard: no duplicate (same taskId + type)
    const successor = tasks.find(t => t.id === successorTaskId);
    if (!successor) return;
    const alreadyExists = (successor.dependencies ?? []).some(
      d => d.taskId === predecessorTaskId && d.type === linkType
    );
    if (alreadyExists) {
      setSelectingPredecessorFor(null);
      return;
    }

    // Build hypothetical tasks array to validate for cycles
    const newDep: TaskDependency = { taskId: predecessorTaskId, type: linkType, lag: 0 };
    const hypothetical = tasks.map(t =>
      t.id === successorTaskId
        ? { ...t, dependencies: [...(t.dependencies ?? []), newDep] }
        : t
    );
    const validation = validateDependencies(hypothetical);
    if (!validation.isValid) {
      setCycleError(true);
      setTimeout(() => setCycleError(false), 3000);
      return;
    }

    const updatedTask = hypothetical.find(t => t.id === successorTaskId)!;

    // Snap successor dates to the predecessor position (lag=0)
    const predecessor = tasks.find(t => t.id === predecessorTaskId);
    if (predecessor) {
      const predStart = new Date(predecessor.startDate as string);
      const predEnd = new Date(predecessor.endDate as string);
      const constraintDate = calculateSuccessorDate(predStart, predEnd, linkType, 0);

      const origSuccessor = tasks.find(t => t.id === successorTaskId)!;
      const durationMs =
        new Date(origSuccessor.endDate as string).getTime() -
        new Date(origSuccessor.startDate as string).getTime();

      let newStart: Date;
      let newEnd: Date;

      if (linkType === 'FS' || linkType === 'SS') {
        newStart = constraintDate;
        newEnd = new Date(constraintDate.getTime() + durationMs);
      } else {
        newEnd = constraintDate;
        newStart = new Date(constraintDate.getTime() - durationMs);
      }

      const snappedTask: Task = {
        ...updatedTask,
        startDate: newStart.toISOString().split('T')[0],
        endDate: newEnd.toISOString().split('T')[0],
      };
      onTasksChange?.([snappedTask]);
    } else {
      // Predecessor not found — emit without snap (graceful fallback)
      onTasksChange?.([updatedTask]);
    }

    setSelectingPredecessorFor(null);
  }, [tasks, onTasksChange]);

  const handleRemoveDependency = useCallback((
    taskId: string,
    predecessorTaskId: string,
    linkType: LinkType
  ) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const updatedDeps = (task.dependencies ?? []).filter(
      d => !(d.taskId === predecessorTaskId && d.type === linkType)
    );
    onTasksChange?.([{ ...task, dependencies: updatedDeps }]);
  }, [tasks, onTasksChange]);

  // New task creation state
  const [isCreating, setIsCreating] = useState(false);

  // Drag-to-reorder state
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragOriginIndexRef = useRef<number | null>(null);
  const dragTaskIdRef = useRef<string | null>(null);

  // Helper: check if a parent task can be dropped at a specific position
  // Parent tasks cannot be dropped:
  // 1. Between their own children
  // 2. Between another parent's children (would make them a child)
  // 3. Under their own descendants (would create a cycle)
  const isValidParentDrop = useCallback((draggedTaskId: string, dropIndex: number): boolean => {
    // If not a parent, allow all drops
    if (!isTaskParent(draggedTaskId, tasks)) {
      return true;
    }

    const dropTarget = visibleTasks[dropIndex];
    if (!dropTarget) return true;

    // Scenario 1: Dropping parent between its own children
    if (dropTarget.parentId === draggedTaskId) {
      return false;
    }

    // Scenario 2: Dropping parent between another parent's children
    // (dropTarget has a parentId - dropping here would make draggedTask a child too)
    if (dropTarget.parentId) {
      return false;
    }

    // Scenario 3: Dropping parent under one of its own descendants
    // This would create a cycle (parent becomes child of its descendant)
    // Check if dropTarget is a descendant of draggedTaskId
    const draggedTask = orderedTasks.find(t => t.id === draggedTaskId);
    if (!draggedTask) return true;

    const descendants = getAllDescendants(draggedTaskId, orderedTasks);
    const descendantIds = new Set(descendants.map(d => d.id));

    if (descendantIds.has(dropTarget.id)) {
      console.log('[INVALID DROP] Parent cannot be dropped under its own descendant', {
        parentId: draggedTaskId,
        descendantId: dropTarget.id,
        descendantName: dropTarget.name
      });
      return false;
    }

    // Allow dropping on other root tasks (parents or non-parents)
    return true;
  }, [tasks, visibleTasks, orderedTasks]);

  const handleDragStart = useCallback((index: number, e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    setDraggingIndex(index);
    dragOriginIndexRef.current = index;
    dragTaskIdRef.current = visibleTasks[index]?.id ?? null;
  }, [visibleTasks]);

  const handleDragOver = useCallback((index: number, e: React.DragEvent) => {
    e.preventDefault();

    const draggedTaskId = dragTaskIdRef.current;
    if (!draggedTaskId) return;

    // Don't show drop indication if this is an invalid parent drop
    if (!isValidParentDrop(draggedTaskId, index)) {
      setDragOverIndex(null);
      e.dataTransfer.dropEffect = 'none';
      return;
    }

    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }, [isValidParentDrop]);

  const handleDrop = useCallback((dropIndex: number, e: React.DragEvent) => {
    e.preventDefault();
    const originVisibleIndex = dragOriginIndexRef.current;
    const movedTaskId = dragTaskIdRef.current;

    // No-op: same position (line is already where the row is)
    if (originVisibleIndex === null || movedTaskId === null || originVisibleIndex === dropIndex) {
      setDraggingIndex(null);
      setDragOverIndex(null);
      dragOriginIndexRef.current = null;
      dragTaskIdRef.current = null;
      return;
    }

    // Reject invalid parent drops (parent being dragged into children or another parent)
    if (!isValidParentDrop(movedTaskId, dropIndex)) {
      setDraggingIndex(null);
      setDragOverIndex(null);
      dragOriginIndexRef.current = null;
      dragTaskIdRef.current = null;
      return;
    }

    console.log('=== BEFORE getVisibleReorderPosition ===');
    console.log('[INPUT]', {
      movedTaskId,
      originVisibleIndex,
      dropIndex,
      orderedTasksCount: orderedTasks.length,
      visibleTasksCount: visibleTasks.length
    });

    const reorderPosition = getVisibleReorderPosition(
      orderedTasks,
      visibleTasks,
      movedTaskId,
      originVisibleIndex,
      dropIndex,
    );

    if (!reorderPosition) {
      setDraggingIndex(null);
      setDragOverIndex(null);
      dragOriginIndexRef.current = null;
      dragTaskIdRef.current = null;
      return;
    }

    const { originOrderedIndex, insertIndex } = reorderPosition;

    // Early exit: if insertIndex equals originOrderedIndex, the subtree would be removed
    // and re-inserted at the exact same position - a true no-op. Skip the callback.
    if (insertIndex === originOrderedIndex) {
      console.log('[NO-OP] insertIndex === originOrderedIndex, task stays at same position');
      setDraggingIndex(null);
      setDragOverIndex(null);
      dragOriginIndexRef.current = null;
      dragTaskIdRef.current = null;
      return;
    }

    const moved = orderedTasks[originOrderedIndex];

    console.log('=== AFTER getVisibleReorderPosition ===');
    console.log('[REORDER POSITION]', {
      originOrderedIndex,
      insertIndex,
      movedTask: { id: moved.id, name: moved.name, parentId: moved.parentId }
    });

    // Check if this is a parent task with children
    const hasChildren = isTaskParent(moved.id, orderedTasks);

    // Extract the subtree to move (parent + all descendants, if any)
    let subtree: Task[];
    let subtreeCount: number;

    if (hasChildren) {
      // Get all descendants of the parent
      const descendants = getAllDescendants(moved.id, orderedTasks);
      subtree = [moved, ...descendants];
      subtreeCount = subtree.length;

      console.log('[PARENT TASK DROP]', {
        parentId: moved.id,
        parentName: moved.name,
        descendantCount: descendants.length,
        descendantIds: descendants.map(d => d.id),
        subtreeSize: subtreeCount,
        originOrderedIndex
      });
    } else {
      // Single task (not a parent)
      subtree = [moved];
      subtreeCount = 1;
    }

    const reordered = [...orderedTasks];

    console.log('[BEFORE FIRST SPLICE]', {
      reorderedLength: reordered.length,
      removingAt: originOrderedIndex,
      removingCount: subtreeCount
    });

    // Remove the entire subtree from its original position
    reordered.splice(originOrderedIndex, subtreeCount);

    console.log('[AFTER FIRST SPLICE]', {
      reorderedLength: reordered.length,
      reorderedIds: reordered.map(t => t.id)
    });

    // CRITICAL: insertIndex is already relative to reorderedWithoutMoved
    // After the splice, reordered === reorderedWithoutMoved (same array, same order)
    // So we should use insertIndex directly, NOT insertIndex - subtreeCount
    // The old code was subtracting subtreeCount again, which was incorrect
    const adjustedInsertIndex = insertIndex;

    console.log('[INSERT INDEX CALCULATION]', {
      originalInsertIndex: insertIndex,
      subtreeCount,
      originOrderedIndex,
      adjustedInsertIndex,
      note: 'insertIndex is already relative to reorderedWithoutMoved, so we use it directly'
    });

    // ============================================
    // COMPREHENSIVE LOGGING - START
    // ============================================
    const isChild = !!moved.parentId;
    const isParent = hasChildren;
    const taskType = isParent ? `PARENT (${subtreeCount} tasks)` : (isChild ? 'CHILD' : 'ROOT');

    console.log('=== DRAG & DROP START ===');
    console.log('[MOVED TASK]', {
      id: moved.id,
      name: moved.name,
      type: taskType,
      parentId: moved.parentId,
      originIndex: originOrderedIndex,
      originVisibleIndex,
      dropIndex: dropIndex,
      insertIndex: adjustedInsertIndex,
      subtreeSize: subtreeCount,
      direction: originVisibleIndex < dropIndex ? 'DOWN' : 'UP'
    });
    console.log('[TASKS ARRAY LENGTH]', orderedTasks.length);
    // ============================================

    // parentId inference: determine if task should be in a group
    // IMPORTANT: Calculate this BEFORE splicing moved task back into reordered
    // because we need to find the parent's position in the array WITHOUT the moved task
    let inferredParentId: string | undefined;

    if (moved.parentId) {
      // Task is currently a child - check if it's staying in or leaving its group
      // Find parent position in the array WITHOUT the moved task (reordered after first splice)
      const parentIndex = reordered.findIndex(t => t.id === moved.parentId);

      console.log('[CHILD TASK - CHECKING GROUP POSITION]', {
        currentParentId: moved.parentId,
        parentIndex: parentIndex,
        parentFound: parentIndex !== -1
      });

      if (parentIndex === -1) {
        // Parent not found - should not happen, but handle gracefully
        console.log('[PARENT NOT FOUND] - Setting parentId to undefined');
        inferredParentId = undefined;
      } else {
        // Calculate where the moved task will end up AFTER we splice it in
        // The key question: is insertIndex outside the range [parentIndex, parentIndex + numSiblings]?
        const numSiblings = reordered.filter(t => t.parentId === moved.parentId).length;
        const groupEnd = parentIndex + numSiblings;

        console.log('[GROUP RANGE CALCULATION]', {
          parentIndex: parentIndex,
          numSiblings: numSiblings,
          groupEnd: groupEnd,
          groupRange: `[${parentIndex}, ${groupEnd}]`,
          insertIndex: adjustedInsertIndex,
          condition1_atOrAboveParent: adjustedInsertIndex <= parentIndex,
          condition2_belowAllSiblings: adjustedInsertIndex > groupEnd
        });

        // If adjustedInsertIndex is <= parent (at or above parent position) or > groupEnd (below all siblings)
        // Note: adjustedInsertIndex == parentIndex means child will be inserted at parent's position,
        // which after splicing puts child above parent (parent shifts down by 1)
        if (adjustedInsertIndex <= parentIndex || adjustedInsertIndex > groupEnd) {
          console.log('[DECISION] EXIT GROUP - insertIndex is outside group range');
          console.log('  -> Reason:', adjustedInsertIndex <= parentIndex ? 'At or above parent position' : 'Below all siblings');
          console.log('  -> Setting inferredParentId = undefined');
          inferredParentId = undefined; // Exit group - become root
        } else {
          console.log('[DECISION] STAY IN GROUP - insertIndex is within group range');
          console.log('  -> Keeping original parentId:', moved.parentId);
          // Staying within group - keep original parentId
          inferredParentId = moved.parentId;
        }
      }
    } else {
      // Task is currently root - check if it should join a group
      console.log('[ROOT TASK] - Will check if it should join a group after splicing');
      // This needs to be calculated AFTER splicing, so we do it below
    }

    // Now splice the entire subtree into its final position
    reordered.splice(adjustedInsertIndex, 0, ...subtree);

    console.log('[AFTER SPLICE]', {
      subtreeFinalPosition: adjustedInsertIndex,
      subtreeSize: subtreeCount,
      totalTasks: reordered.length,
      reorderedIds: reordered.map((t, i) => ({ index: i, id: t.id, name: t.name, parentId: t.parentId }))
    });

    // For root tasks, check if they should join a group (need reordered for this)
    if (!moved.parentId) {
      // Prefer taskAbove if it has a parent (joining that group)
      if (adjustedInsertIndex > 0) {
        const taskAbove = reordered[adjustedInsertIndex - 1];
        console.log('[ROOT TASK - CHECK TASK ABOVE]', {
          taskAboveId: taskAbove.id,
          taskAboveName: taskAbove.name,
          taskAboveParentId: taskAbove.parentId
        });
        if (taskAbove.parentId && taskAbove.parentId !== moved.id) {
          console.log('  -> Joining group from taskAbove:', taskAbove.parentId);
          inferredParentId = taskAbove.parentId;
        }
      }

      // Otherwise check taskBelow
      if (inferredParentId === undefined && adjustedInsertIndex < reordered.length - 1) {
        const taskBelow = reordered[adjustedInsertIndex + 1];
        console.log('[ROOT TASK - CHECK TASK BELOW]', {
          taskBelowId: taskBelow.id,
          taskBelowName: taskBelow.name,
          taskBelowParentId: taskBelow.parentId
        });
        if (taskBelow.parentId && taskBelow.parentId !== moved.id) {
          console.log('  -> Joining group from taskBelow:', taskBelow.parentId);
          inferredParentId = taskBelow.parentId;
        }
      }

      if (!inferredParentId) {
        console.log('[ROOT TASK] - Staying as root (no group to join)');
      }
    }

    console.log('[FINAL RESULT]', {
      inferredParentId: inferredParentId,
      willExitGroup: moved.parentId && !inferredParentId,
      willJoinGroup: !moved.parentId && !!inferredParentId,
      willStayInGroup: moved.parentId && inferredParentId === moved.parentId,
      willStayRoot: !moved.parentId && !inferredParentId
    });
    console.log('=== DRAG & DROP END ===\n');

    onReorder?.(reordered, moved.id, inferredParentId);
    onTaskSelect?.(moved.id);
    setDraggingIndex(null);
    setDragOverIndex(null);
    dragOriginIndexRef.current = null;
    dragTaskIdRef.current = null;
  }, [orderedTasks, visibleTasks, onReorder, onTaskSelect]);

  const handleDragEnd = useCallback(() => {
    // Called when drag ends without a valid drop (Escape, or dropped outside)
    // handleDrop already clears state on successful drop, so this is only the cancel path
    setDraggingIndex(null);
    setDragOverIndex(null);
    dragOriginIndexRef.current = null;
    dragTaskIdRef.current = null;
  }, []);

  const handleConfirmNewTask = useCallback((name: string) => {
    const now = new Date();
    const todayISO = new Date(Date.UTC(
      now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()
    )).toISOString().split('T')[0];
    const endISO = new Date(Date.UTC(
      now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 7
    )).toISOString().split('T')[0];
    const newTask: Task = {
      id: crypto.randomUUID(),
      name,
      startDate: todayISO,
      endDate: endISO,
    };
    onAdd?.(newTask);
    setIsCreating(false);
  }, [onAdd]);

  const handleCancelNewTask = useCallback(() => setIsCreating(false), []);
  const effectiveTaskListWidth = Math.max(taskListWidth, MIN_TASK_LIST_WIDTH);

  return (
    <div
      ref={overlayRef}
      className={`gantt-tl-overlay${show ? '' : ' gantt-tl-hidden'}${hasRightShadow ? ' gantt-tl-overlay-shadowed' : ''}`}
      style={{ width: `${effectiveTaskListWidth}px`, minWidth: `${MIN_TASK_LIST_WIDTH}px` }}
    >
      <div className="gantt-tl-table">
        {/* Header row - aligns with TimeScaleHeader, 1px taller for row alignment */}
        <div className="gantt-tl-header" style={{ height: `${headerHeight + 0.5}px` }}>
          <div className="gantt-tl-headerCell gantt-tl-cell-number">№</div>
          <div className="gantt-tl-headerCell gantt-tl-cell-name">Имя</div>
          <div className="gantt-tl-headerCell gantt-tl-cell-date">Начало</div>
          <div className="gantt-tl-headerCell gantt-tl-cell-date">Окончание</div>
          <div className="gantt-tl-headerCell gantt-tl-cell-duration">Дн.</div>
          <div className="gantt-tl-headerCell gantt-tl-cell-progress">%</div>
          {/* Dependencies column header with type switcher */}
          <div className="gantt-tl-headerCell gantt-tl-cell-deps" style={{ position: 'relative' }}>
            <Popover open={typeMenuOpen} onOpenChange={setTypeMenuOpen}>
              <PopoverTrigger asChild>
                <button
                  className="gantt-tl-dep-type-trigger"
                  disabled={disableDependencyEditing}
                  onClick={(e) => e.stopPropagation()}
                >
                  Связи {React.createElement(LINK_TYPE_ICONS[activeLinkType])} &#9662;
                </button>
              </PopoverTrigger>
              <PopoverContent portal={true} align="start">
                <div className="gantt-tl-dep-type-menu">
                  {LINK_TYPE_ORDER.map(lt => (
                    <button
                      key={lt}
                      className={`gantt-tl-dep-type-option${activeLinkType === lt ? ' active' : ''}`}
                      onClick={() => { setActiveLinkType(lt); setTypeMenuOpen(false); }}
                    >
                      {React.createElement(LINK_TYPE_ICONS[lt])}
                      <span>{LINK_TYPE_LABELS[lt]}</span>
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            {cycleError && (
              <div className="gantt-tl-dep-error">Цикл зависимостей!</div>
            )}
          </div>
        </div>

        {/* Data rows */}
        <div className="gantt-tl-body" style={{ height: `${totalHeight}px` }}>
          {visibleTasks.map((task, index) => (
            <TaskListRow
              key={task.id}
              task={task}
              rowIndex={index}
              rowHeight={rowHeight}
              onTasksChange={onTasksChange}
              selectedTaskId={selectedTaskId}
              onRowClick={handleRowClick}
              disableTaskNameEditing={disableTaskNameEditing}
              disableDependencyEditing={disableDependencyEditing}
              allTasks={tasks}
              activeLinkType={activeLinkType}
              selectingPredecessorFor={selectingPredecessorFor}
              onSetSelectingPredecessorFor={setSelectingPredecessorFor}
              onAddDependency={handleAddDependency}
              onRemoveDependency={handleRemoveDependency}
              selectedChip={selectedChip}
              onChipSelect={handleChipSelect}
              onScrollToTask={onScrollToTask}
              onDelete={onDelete}
              onAdd={onAdd}
              onInsertAfter={onInsertAfter}
              editingTaskId={propEditingTaskId}
              isDragging={draggingIndex === index}
              isDragOver={dragOverIndex === index}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              collapsedParentIds={collapsedParentIds}
              onToggleCollapse={handleToggleCollapse}
              onPromoteTask={onPromoteTask}
              onDemoteTask={onDemoteTask}
            />
          ))}
        </div>

        {/* Ghost row for new task creation — positioned OUTSIDE body div to avoid height desync */}
        {isCreating && (
          <NewTaskRow
            rowHeight={rowHeight}
            onConfirm={handleConfirmNewTask}
            onCancel={handleCancelNewTask}
          />
        )}

        {/* Add task button - also serves as drop target for moving tasks to end */}
        {enableAddTask && onAdd && !isCreating && (
          <button
            className={`gantt-tl-add-btn${dragOverIndex === visibleTasks.length ? ' gantt-tl-add-btn-drag-over' : ''}`}
            onClick={() => setIsCreating(true)}
            onDragEnter={(e) => {
              e.preventDefault();
              setDragOverIndex(visibleTasks.length);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              setDragOverIndex(visibleTasks.length);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setDragOverIndex(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              handleDrop(visibleTasks.length, e);
            }}
            type="button"
          >
            + Добавить задачу
          </button>
        )}
      </div>
    </div>
  );
};

export default TaskList;
