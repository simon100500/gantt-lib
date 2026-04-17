'use client';

import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import type { Task, TaskDependency, TaskListMenuCommand } from '../GanttChart';
import type { LinkType } from '../../types';
import type { CustomDayConfig } from '../../utils/dateUtils';
import { createCustomDayPredicate } from '../../utils/dateUtils';
import { validateDependencies, calculateSuccessorDate, buildTaskRangeFromEnd, buildTaskRangeFromStart, getTaskDuration, isTaskParent, areTasksHierarchicallyRelated, getChildren } from '../../core/scheduling';
import { normalizeHierarchyTasks } from '../../utils/hierarchyOrder';
import { getVisibleReorderPosition } from '../../utils/taskListReorder';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/Popover';
import { TaskListRow } from './TaskListRow';
import { NewTaskRow } from './NewTaskRow';
import { LINK_TYPE_ICONS, LINK_TYPE_LABELS } from './DepIcons';
import type { TaskListColumn } from './columns/types';
import { createBuiltInColumns, BUILT_IN_COLUMN_WIDTHS } from './columns/createBuiltInColumns';
import { resolveTaskListColumns } from './columns/resolveTaskListColumns';
import type { TaskListColumn as NewTaskListColumn } from './columns/types';
import './TaskList.css';

export { LINK_TYPE_ICONS };

const LINK_TYPE_ORDER: LinkType[] = ['FS', 'SS', 'FF', 'SF'];
type DependencyPickMode = 'predecessor' | 'successor';
const MIN_TASK_LIST_WIDTH = 530;

const BUILT_IN_CSS_CLASSES: Record<string, string> = {
  number: 'gantt-tl-cell-number',
  name: 'gantt-tl-cell-name',
  startDate: 'gantt-tl-cell-date',
  endDate: 'gantt-tl-cell-date',
  duration: 'gantt-tl-cell-duration',
  progress: 'gantt-tl-cell-progress',
};

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

function duplicateTaskSubtree(anchorTaskId: string, orderedTasks: Task[]): Task[] {
  const anchorTask = orderedTasks.find(task => task.id === anchorTaskId);
  if (!anchorTask) return orderedTasks;

  const descendants = getAllDescendants(anchorTaskId, orderedTasks);
  const sourceIds = new Set([anchorTaskId, ...descendants.map(task => task.id)]);
  const sourceSubtree = orderedTasks.filter(task => sourceIds.has(task.id));
  const cloneIdMap = new Map(sourceSubtree.map(task => [task.id, crypto.randomUUID()]));

  const clonedSubtree = sourceSubtree.map(task => {
    const clonedDependencies = task.dependencies
      ?.map(dep => ({
        ...dep,
        taskId: cloneIdMap.get(dep.taskId) ?? dep.taskId,
      }));

    return {
      ...task,
      id: cloneIdMap.get(task.id)!,
      name: task.id === anchorTaskId ? `${task.name} (копия)` : task.name,
      parentId: task.parentId ? (cloneIdMap.get(task.parentId) ?? task.parentId) : undefined,
      dependencies: clonedDependencies,
    };
  });

  const anchorIndex = orderedTasks.findIndex(task => task.id === anchorTaskId);
  const insertIndex = anchorIndex + sourceSubtree.length;
  return [
    ...orderedTasks.slice(0, insertIndex),
    ...clonedSubtree,
    ...orderedTasks.slice(insertIndex),
  ];
}

/**
 * Вычисляет иерархический номер задачи на основе позиции в списке visibleTasks.
 * Корневые задачи: 1, 2, 3...
 * Дочерние задачи: 1.1, 1.2, 2.1, 2.1.1 и т.д.
 *
 * @param tasks - Массив видимых задач (уже отсортированных в иерархическом порядке)
 * @param taskIndex - Индекс задачи в массиве visibleTasks
 * @returns Иерархический номер в виде строки
 */
function getTaskNumber(tasks: Task[], taskIndex: number): string {
  const task = tasks[taskIndex];
  if (!task) return '';

  // Если это корневая задача (нет parentId)
  if (!task.parentId) {
    // Найти порядковый номер среди корневых задач
    let rootIndex = 0;
    for (let i = 0; i < taskIndex; i++) {
      if (!tasks[i].parentId) {
        rootIndex++;
      }
    }
    return String(rootIndex + 1);
  }

  // Для дочерней задачи - найти родительский номер
  const parentIndex = tasks.findIndex(t => t.id === task.parentId);
  if (parentIndex === -1) {
    // Родитель не найден - fallback на плоский номер
    return String(taskIndex + 1);
  }

  const parentNumber = getTaskNumber(tasks, parentIndex);

  // Найти порядковый номер среди детей этого родителя
  let siblingIndex = 0;
  for (let i = 0; i < taskIndex; i++) {
    if (tasks[i].parentId === task.parentId) {
      siblingIndex++;
    }
  }

  return `${parentNumber}.${siblingIndex + 1}`;
}

export interface TaskListProps {
  /** Array of tasks to display */
  tasks: Task[];
  /** Height of each row in pixels (must match Gantt chart's rowHeight) */
  rowHeight: number;
  /** Height of the header row in pixels (must match Gantt chart's headerHeight) */
  headerHeight: number;
  /** Width of the task list overlay in pixels. Values below MIN_TASK_LIST_WIDTH are clamped. */
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
  /** Callback when parent task is ungrouped (removed while direct children move one level up) */
  onUngroupTask?: (taskId: string) => void;
  /** Custom day configurations for date picker */
  customDays?: CustomDayConfig[];
  /** Optional base weekend predicate for date picker */
  isWeekend?: (date: Date) => boolean;
  /** Считать duration в рабочих днях */
  businessDays?: boolean;
  /** Task IDs highlighted by the active filter */
  highlightedTaskIds?: Set<string>;
  /** Filter mode: 'highlight' shows yellow highlight on matches, 'hide' hides non-matching tasks */
  filterMode?: 'highlight' | 'hide';
  /** Task IDs that match the filter (used for hide mode). When undefined, no filtering is applied */
  filteredTaskIds?: Set<string>;
  /** Whether filter is currently active (needed to distinguish "no filter" from "filter with no matches") */
  isFilterActive?: boolean;
  /** Additional columns to display after built-in columns */
  additionalColumns?: TaskListColumn<any>[];
  /** Additional commands rendered in each row three-dots menu */
  taskListMenuCommands?: TaskListMenuCommand<Task>[];
}

interface PendingInsertState {
  anchorTaskId: string;
  insertAfterTaskId: string;
  parentId?: string;
  startDate: string | Date;
  endDate: string | Date;
  nestingDepth: number;
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
  taskListWidth = MIN_TASK_LIST_WIDTH,
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
  onUngroupTask,
  customDays,
  isWeekend,
  businessDays,
  highlightedTaskIds = new Set(),
  filterMode = 'highlight',
  filteredTaskIds = new Set(),
  isFilterActive = false,
  additionalColumns,
  taskListMenuCommands,
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
    return normalizeHierarchyTasks(tasks);
  }, [tasks]);

  const weekendPredicate = useMemo(
    () => createCustomDayPredicate({ customDays, isWeekend }),
    [customDays, isWeekend]
  );

  // Filter tasks to hide children of collapsed parents.
  // Checks the full ancestor chain so grandchildren are hidden when any ancestor is collapsed.
  const visibleTasks = useMemo(() => {
    const parentMap = new Map(orderedTasks.map(t => [t.id, (t as any).parentId as string | undefined]));

    function isAnyAncestorCollapsed(parentId: string | undefined): boolean {
      let current = parentId;
      while (current) {
        if (collapsedParentIds.has(current)) return true;
        current = parentMap.get(current);
      }
      return false;
    }

    let tasks = orderedTasks.filter(task => !isAnyAncestorCollapsed((task as any).parentId));

    // In 'hide' mode with active filter, only show matching tasks
    if (filterMode === 'hide' && isFilterActive) {
      tasks = tasks.filter(task => filteredTaskIds.has(task.id));
    }

    return tasks;
  }, [orderedTasks, collapsedParentIds, filterMode, filteredTaskIds, isFilterActive]);

  const totalHeight = useMemo(
    () => visibleTasks.length * rowHeight,
    [visibleTasks.length, rowHeight]
  );
  const visibleTaskNumberMap = useMemo(
    () =>
      Object.fromEntries(
        visibleTasks.map((task, index) => [task.id, String(getTaskNumber(visibleTasks, index))])
      ) as Record<string, string>,
    [visibleTasks]
  );

  // Оригинальные номера задач на основе полного списка (до фильтрации)
  // Используются для сохранения нумерации при скрытии задач
  const originalTaskNumberMap = useMemo(
    () => {
      const numberMap = new Map<string, string>();
      for (let i = 0; i < orderedTasks.length; i++) {
        numberMap.set(orderedTasks[i].id, getTaskNumber(orderedTasks, i));
      }
      return Object.fromEntries(numberMap) as Record<string, string>;
    },
    [orderedTasks]
  );

  // Compute nesting depth for each task (0 = root, 1 = child, 2 = grandchild, etc.)
  const nestingDepthMap = useMemo(() => {
    const depthMap = new Map<string, number>();
    const taskById = new Map(tasks.map(t => [t.id, t]));

    function getDepth(taskId: string): number {
      if (depthMap.has(taskId)) return depthMap.get(taskId)!;
      const task = taskById.get(taskId);
      if (!task || !(task as any).parentId || !taskById.has((task as any).parentId)) {
        depthMap.set(taskId, 0);
        return 0;
      }
      const depth = getDepth((task as any).parentId) + 1;
      depthMap.set(taskId, depth);
      return depth;
    }

    for (const task of tasks) {
      getDepth(task.id);
    }
    return depthMap;
  }, [tasks]);

  // For each child task, determine if it's the last visible child of its parent
  const lastChildIds = useMemo(() => {
    const last = new Set<string>();
    const seenParents = new Set<string>();
    for (let i = visibleTasks.length - 1; i >= 0; i--) {
      const t = visibleTasks[i] as Task;
      if (t.parentId && !seenParents.has(t.parentId)) {
        last.add(t.id);
        seenParents.add(t.parentId);
      }
    }
    return last;
  }, [visibleTasks]);

  const visibleParentIds = useMemo(() => {
    const parentIds = new Set<string>();
    for (const task of visibleTasks) {
      if (task.parentId) parentIds.add(task.parentId);
    }
    return parentIds;
  }, [visibleTasks]);

  // For each visible task, determine whether each ancestor line above the direct parent
  // should continue through the full row or terminate at the row midpoint.
  const ancestorLineModesMap = useMemo(() => {
    const taskById = new Map(tasks.map(t => [t.id, t]));

    const isDescendantOf = (taskId: string, ancestorId: string): boolean => {
      let current: any = taskById.get(taskId);
      while (current?.parentId && taskById.has(current.parentId)) {
        if (current.parentId === ancestorId) return true;
        current = taskById.get(current.parentId);
      }
      return false;
    };

    const map = new Map<string, ("full" | "half")[]>();
    for (let index = 0; index < visibleTasks.length; index++) {
      const task = visibleTasks[index];
      const ancestorIds: string[] = [];
      let current: any = taskById.get(task.id);
      while (current?.parentId && taskById.has(current.parentId)) {
        ancestorIds.unshift(current.parentId as string);
        current = taskById.get(current.parentId);
      }

      const ancestorsAboveParent = ancestorIds.slice(0, -1);
      const modes = ancestorsAboveParent.map((ancestorId) => {
        const hasLaterVisibleDescendant = visibleTasks
          .slice(index + 1)
          .some((laterTask) => isDescendantOf(laterTask.id, ancestorId));
        return hasLaterVisibleDescendant ? "full" : "half";
      });

      map.set(task.id, modes);
    }
    return map;
  }, [tasks, visibleTasks]);

  const handleRowClick = useCallback((taskId: string) => {
    onTaskSelect?.(taskId);
  }, [onTaskSelect]);

  // Dependency state
  const [activeLinkType, setActiveLinkType] = useState<LinkType>('FS');
  const [selectingPredecessorFor, setSelectingPredecessorFor] = useState<string | null>(null);
  const [dependencyPickMode, setDependencyPickMode] = useState<DependencyPickMode>('successor');
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const [dependencyError, setDependencyError] = useState<string | null>(null);
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

  // Escape / outside-click cancel for picker mode, chip selection, and task row selection
  useEffect(() => {
    if (!selectingPredecessorFor && !selectedChip && !selectedTaskId) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectingPredecessorFor(null);
        setSelectedChip(null);
        onSelectedChipChange?.(null);
        onTaskSelect?.(null);
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
      onTaskSelect?.(null);
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown, true);
    };
  }, [selectingPredecessorFor, selectedChip, selectedTaskId, onTaskSelect, onSelectedChipChange]);

  const handleAddDependency = useCallback((
    successorTaskId: string,
    predecessorTaskId: string,
    linkType: LinkType
  ) => {
    // Guard: no self-links
    if (successorTaskId === predecessorTaskId) return;

    // Guard: no links between ancestors and descendants in either direction
    if (areTasksHierarchicallyRelated(successorTaskId, predecessorTaskId, tasks)) {
      setDependencyError('Связи между родителем и потомком запрещены');
      setTimeout(() => setDependencyError(null), 3000);
      setSelectingPredecessorFor(null);
      return;
    }

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
      const hasHierarchyConstraint = validation.errors.some(error => error.type === 'constraint');
      setDependencyError(
        hasHierarchyConstraint
          ? 'Связи между родителем и потомком запрещены'
          : 'Цикл зависимостей!'
      );
      setTimeout(() => setDependencyError(null), 3000);
      return;
    }

    const updatedTask = hypothetical.find(t => t.id === successorTaskId)!;

    // Snap successor dates to the predecessor position (lag=0)
    const predecessor = tasks.find(t => t.id === predecessorTaskId);
    if (predecessor) {
      const predStart = new Date(predecessor.startDate as string);
      const predEnd = new Date(predecessor.endDate as string);
      const constraintDate = calculateSuccessorDate(
        predStart,
        predEnd,
        linkType,
        0,
        businessDays ?? true,
        weekendPredicate
      );

      const origSuccessor = tasks.find(t => t.id === successorTaskId)!;
      const duration = getTaskDuration(
        origSuccessor.startDate,
        origSuccessor.endDate,
        businessDays ?? true,
        weekendPredicate
      );

      let newStart: Date;
      let newEnd: Date;

      if (linkType === 'FS' || linkType === 'SS') {
        ({ start: newStart, end: newEnd } = buildTaskRangeFromStart(
          constraintDate,
          duration,
          businessDays ?? true,
          weekendPredicate
        ));
      } else {
        ({ start: newStart, end: newEnd } = buildTaskRangeFromEnd(
          constraintDate,
          duration,
          businessDays ?? true,
          weekendPredicate
        ));
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
  const [pendingInsert, setPendingInsert] = useState<PendingInsertState | null>(null);

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
    // Allow this for unlimited nesting — parent can become nested under another task.
    // Scenarios 1 and 3 still protect against circular references and self-nesting.

    // Scenario 3: Dropping parent under one of its own descendants
    // This would create a cycle (parent becomes child of its descendant)
    // Check if dropTarget is a descendant of draggedTaskId
    const draggedTask = orderedTasks.find(t => t.id === draggedTaskId);
    if (!draggedTask) return true;

    const descendants = getAllDescendants(draggedTaskId, orderedTasks);
    const descendantIds = new Set(descendants.map(d => d.id));

    if (descendantIds.has(dropTarget.id)) {
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
      setDraggingIndex(null);
      setDragOverIndex(null);
      dragOriginIndexRef.current = null;
      dragTaskIdRef.current = null;
      return;
    }

    const moved = orderedTasks[originOrderedIndex];

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
    } else {
      // Single task (not a parent)
      subtree = [moved];
      subtreeCount = 1;
    }

    const reordered = [...orderedTasks];

    // Remove the entire subtree from its original position
    reordered.splice(originOrderedIndex, subtreeCount);

    // CRITICAL: insertIndex is already relative to reorderedWithoutMoved
    // After the splice, reordered === reorderedWithoutMoved (same array, same order)
    // So we should use insertIndex directly, NOT insertIndex - subtreeCount
    // The old code was subtracting subtreeCount again, which was incorrect
    const adjustedInsertIndex = insertIndex;

    // parentId inference: determine if task should be in a group
    // IMPORTANT: Calculate this BEFORE splicing moved task back into reordered
    // because we need to find the parent's position in the array WITHOUT the moved task
    let inferredParentId: string | undefined;

    if (moved.parentId) {
      // Task is currently a child - check if it's staying in or leaving its group
      // Find parent position in the array WITHOUT the moved task (reordered after first splice)
      const parentIndex = reordered.findIndex(t => t.id === moved.parentId);

      if (parentIndex === -1) {
        // Parent not found - should not happen, but handle gracefully
        inferredParentId = undefined;
      } else {
        // Calculate where the moved task will end up AFTER we splice it in
        // The key question: is insertIndex outside the range [parentIndex, parentIndex + numSiblings]?
        const numSiblings = reordered.filter(t => t.parentId === moved.parentId).length;
        const groupEnd = parentIndex + numSiblings;

        // If adjustedInsertIndex is <= parent (at or above parent position) or > groupEnd (below all siblings)
        // Note: adjustedInsertIndex == parentIndex means child will be inserted at parent's position,
        // which after splicing puts child above parent (parent shifts down by 1)
        if (adjustedInsertIndex <= parentIndex || adjustedInsertIndex > groupEnd) {
          inferredParentId = undefined; // Exit group - become root
        } else {
          // Staying within group - keep original parentId
          inferredParentId = moved.parentId;
        }
      }
    } else {
      // Task is currently root - check if it should join a group after splicing
    }

    // Now splice the entire subtree into its final position
    reordered.splice(adjustedInsertIndex, 0, ...subtree);

    // For root tasks, check if they should join a group (need reordered for this)
    // IMPORTANT: Parent tasks (hasChildren === true) must NEVER be reparented during drag-drop.
    // They always stay at root level regardless of where they are dropped.
    // Only leaf/child tasks (non-parents) can be adopted into a group by neighboring tasks.
    if (!moved.parentId && !hasChildren) {
      const taskAbove = adjustedInsertIndex > 0 ? reordered[adjustedInsertIndex - 1] : null;
      const taskBelow = adjustedInsertIndex < reordered.length - 1 ? reordered[adjustedInsertIndex + 1] : null;

      // Join a group ONLY if placed between parent and its first child,
      // or between two children of the same parent.
      // Dropping after the last child of a group keeps the task at root level.
      if (taskAbove && taskBelow && taskBelow.parentId === taskAbove.id) {
        // Placed between a parent and its first child
        inferredParentId = taskAbove.id;
      } else if (taskAbove && taskBelow && taskAbove.parentId && taskAbove.parentId === taskBelow.parentId) {
        // Placed between two children of the same parent
        inferredParentId = taskAbove.parentId;
      } else if (!taskAbove && taskBelow && taskBelow.parentId) {
        // Placed at the very top, above a child — join that group
        inferredParentId = taskBelow.parentId;
      }
    }

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

  const findInsertAfterTaskId = useCallback((anchorTaskId: string): string => {
    const anchorIndex = orderedTasks.findIndex(task => task.id === anchorTaskId);
    if (anchorIndex === -1) {
      return anchorTaskId;
    }

    const taskById = new Map(orderedTasks.map(task => [task.id, task]));
    let insertAfterTaskId = anchorTaskId;

    for (let index = anchorIndex + 1; index < orderedTasks.length; index += 1) {
      let currentParentId = orderedTasks[index]?.parentId;
      let isDescendant = false;

      while (currentParentId) {
        if (currentParentId === anchorTaskId) {
          isDescendant = true;
          break;
        }
        currentParentId = taskById.get(currentParentId)?.parentId;
      }

      if (!isDescendant) {
        break;
      }

      insertAfterTaskId = orderedTasks[index].id;
    }

    return insertAfterTaskId;
  }, [orderedTasks]);

  const pendingInsertDisplayTaskId = useMemo(() => {
    if (!pendingInsert) {
      return null;
    }

    const taskById = new Map(visibleTasks.map(task => [task.id, task]));
    if (!taskById.has(pendingInsert.anchorTaskId)) {
      return null;
    }

    let displayTaskId = pendingInsert.anchorTaskId;

    for (const task of visibleTasks) {
      let currentParentId = task.parentId;
      while (currentParentId) {
        if (currentParentId === pendingInsert.anchorTaskId) {
          displayTaskId = task.id;
          break;
        }
        currentParentId = taskById.get(currentParentId)?.parentId;
      }
    }

    return displayTaskId;
  }, [pendingInsert, visibleTasks]);

  const handleStartInsertAfter = useCallback((taskId: string, newTask: Task) => {
    const anchorTask = orderedTasks.find(task => task.id === taskId);
    if (!anchorTask) {
      return;
    }

    setIsCreating(false);
    setPendingInsert({
      anchorTaskId: taskId,
      insertAfterTaskId: findInsertAfterTaskId(taskId),
      parentId: anchorTask.parentId,
      startDate: newTask.startDate,
      endDate: newTask.endDate,
      nestingDepth: nestingDepthMap.get(taskId) ?? 0,
    });
  }, [findInsertAfterTaskId, nestingDepthMap, orderedTasks]);

  const handleConfirmInsertedTask = useCallback((name: string) => {
    if (!pendingInsert) {
      return;
    }

    const newTask: Task = {
      id: crypto.randomUUID(),
      name,
      startDate: pendingInsert.startDate,
      endDate: pendingInsert.endDate,
      parentId: pendingInsert.parentId,
    };

    onInsertAfter?.(pendingInsert.insertAfterTaskId, newTask);
    setPendingInsert(null);
  }, [onInsertAfter, pendingInsert]);

  const handleCancelInsertedTask = useCallback(() => setPendingInsert(null), []);

  /**
   * Calculate the depth of a task in the hierarchy.
   * Root tasks have depth 0, their children have depth 1, etc.
   */
  function getTaskDepth(task: Task | undefined, tasks: Task[]): number {
    if (!task) return 0;
    let depth = 0;
    let current: Task | undefined = task;
    while (current) {
      if (!current.parentId) break;
      depth++;
      const parentId: string = current.parentId;
      current = tasks.find(t => t.id === parentId);
    }
    return depth;
  }

  /**
   * Demote wrapper — move task down one level in hierarchy.
   *
   * Rules:
   * 1. Find the PREVIOUS task at the SAME depth level (same hierarchy level)
   * 2. Make that task the parent of the current task
   * 3. If no previous task at same level exists (first task), create "Новый раздел"
   *
   * Example:
   * - Task 1.1 (depth 1)
   * - Task 1.2 (depth 1)
   * - [Task to demote] (depth 1) → becomes child of Task 1.2
   *
   * Result:
   * - Task 1.1 (depth 1)
   * - Task 1.2 (depth 1)
   *   - Task to demote (depth 2, child of 1.2)
   *
   * The `_newParentId` argument from TaskListRow is ignored — we compute the correct parent here.
   */
  const handleDemoteWrapper = useCallback((taskId: string, _newParentId: string) => {
    const taskIndex = visibleTasks.findIndex(t => t.id === taskId);
    const currentTask = visibleTasks[taskIndex];
    const currentDepth = getTaskDepth(currentTask, orderedTasks);

    if (taskIndex > 0) {
      // Search backwards for the previous task at the same depth level
      for (let i = taskIndex - 1; i >= 0; i--) {
        const previousTask = visibleTasks[i];
        const previousDepth = getTaskDepth(previousTask, orderedTasks);

        // Found a task at the same level - use it as parent
        if (previousDepth === currentDepth) {
          onDemoteTask?.(taskId, previousTask.id);
          return;
        }

        // If we encounter a task at a shallower depth, stop searching
        // (no same-level task exists before this point)
        if (previousDepth < currentDepth) {
          break;
        }
      }

      // No same-level task found - cannot demote
      return;
    }

    // First-task case: create "Новый раздел" as a new root parent
    const demotedTask = orderedTasks.find(t => t.id === taskId);
    if (!demotedTask) return;

    const newSectionTask: Task = {
      id: crypto.randomUUID(),
      name: 'Новый раздел',
      startDate: demotedTask.startDate,
      endDate: demotedTask.endDate,
    };

    const updatedTasks: Task[] = [
      newSectionTask,
      ...orderedTasks.map(t =>
        t.id === taskId ? { ...t, parentId: newSectionTask.id } : t
      ),
    ];

    onReorder?.(updatedTasks, taskId, newSectionTask.id);
  }, [visibleTasks, orderedTasks, onDemoteTask, onReorder]);

  const handleDuplicateTask = useCallback((taskId: string) => {
    const duplicatedTasks = duplicateTaskSubtree(taskId, orderedTasks);
    onReorder?.(duplicatedTasks);
  }, [orderedTasks, onReorder]);

  // ---- Column resolution ----
  const builtInColumns = useMemo(() => createBuiltInColumns<Task>({ businessDays }), [businessDays]);
  const resolvedColumns = useMemo(
    () => resolveTaskListColumns(builtInColumns, (additionalColumns ?? []) as NewTaskListColumn<Task>[]),
    [builtInColumns, additionalColumns]
  );
  const resolvedColumnWidthTotal = useMemo(
    () => resolvedColumns.reduce((sum, col) => sum + (col.width ?? 120), 0),
    [resolvedColumns]
  );

  const effectiveTaskListWidth = Math.max(taskListWidth, MIN_TASK_LIST_WIDTH, resolvedColumnWidthTotal);

  return (
    <div
      ref={overlayRef}
      className={`gantt-tl-overlay${show ? '' : ' gantt-tl-hidden'}${hasRightShadow ? ' gantt-tl-overlay-shadowed' : ''}`}
      style={{ '--tasklist-width': `${effectiveTaskListWidth}px` } as React.CSSProperties}
    >
      <div className="gantt-tl-table">
        {/* Header row - aligns with TimeScaleHeader, 1px taller for row alignment */}
        <div className="gantt-tl-header" style={{ height: `${headerHeight + 0.5}px` }}>
          {resolvedColumns.map(col => {
            // Dependencies header has special Popover UI
            if (col.id === 'dependencies') {
              return (
                <div key={col.id} className="gantt-tl-headerCell gantt-tl-cell-deps"
                     data-column-id="dependencies"
                     style={{ position: 'relative' }}>
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
                  {dependencyError && (
                    <div className="gantt-tl-dep-error">{dependencyError}</div>
                  )}
                </div>
              );
            }
            // Built-in columns use CSS classes for width (same as body cells — no inline width override)
            const builtInClass = BUILT_IN_CSS_CLASSES[col.id];
            if (builtInClass !== undefined) {
              return (
                <div key={col.id}
                     className={`gantt-tl-headerCell ${builtInClass}`}
                     data-column-id={col.id}>
                  {col.header}
                </div>
              );
            }
            // Custom columns
            return (
              <div key={col.id}
                   className="gantt-tl-headerCell gantt-tl-headerCell-custom"
                   data-column-id={`custom:${col.id}`}
                   data-custom-column-id={col.id}
                   style={{ width: col.width, minWidth: col.width, flexShrink: 0 }}>
                {col.header}
              </div>
            );
          })}
        </div>

        {/* Data rows */}
        <div className="gantt-tl-body" style={{ height: `${totalHeight}px` }}>
          {visibleTasks.map((task, index) => {
            const previousVisibleTask = index > 0 ? visibleTasks[index - 1] : undefined;
            const canDemoteTask = index === 0
              || !task.parentId
              || previousVisibleTask?.id !== task.parentId;

            return (
              <React.Fragment key={task.id}>
                <TaskListRow
                  task={task}
                  rowIndex={index}
                  taskNumber={originalTaskNumberMap[task.id] || ''}
                  taskNumberMap={originalTaskNumberMap}
                  rowHeight={rowHeight}
                  onTasksChange={onTasksChange}
                  selectedTaskId={selectedTaskId}
                  onRowClick={handleRowClick}
                  disableTaskNameEditing={disableTaskNameEditing}
                  disableDependencyEditing={disableDependencyEditing}
                  allTasks={tasks}
                  activeLinkType={activeLinkType}
                  onSetActiveLinkType={setActiveLinkType}
                  selectingPredecessorFor={selectingPredecessorFor}
                  dependencyPickMode={dependencyPickMode}
                  onSetDependencyPickMode={setDependencyPickMode}
                  onSetSelectingPredecessorFor={setSelectingPredecessorFor}
                  onAddDependency={handleAddDependency}
                  onRemoveDependency={handleRemoveDependency}
                  selectedChip={selectedChip}
                  onChipSelect={handleChipSelect}
                  onScrollToTask={onScrollToTask}
                  onDelete={onDelete}
                  onAdd={onAdd}
                  onInsertAfter={handleStartInsertAfter}
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
                  onDemoteTask={onDemoteTask ? handleDemoteWrapper : undefined}
                  onUngroupTask={onUngroupTask}
                  onDuplicateTask={onReorder ? handleDuplicateTask : undefined}
                  canDemoteTask={canDemoteTask}
                  isLastChild={lastChildIds.has(task.id)}
                  nestingDepth={nestingDepthMap.get(task.id) ?? 0}
                  hasVisibleChildren={visibleParentIds.has(task.id)}
                  ancestorLineModes={ancestorLineModesMap.get(task.id) ?? []}
                  customDays={customDays}
                  isWeekend={isWeekend}
                  businessDays={businessDays}
                  isFilterMatch={filterMode === 'highlight' ? highlightedTaskIds.has(task.id) : false}
                  isFilterHideMode={filterMode === 'hide' && isFilterActive}
                  resolvedColumns={resolvedColumns}
                  taskListMenuCommands={taskListMenuCommands}
                />
                {pendingInsertDisplayTaskId === task.id && (
                  <NewTaskRow
                    rowHeight={rowHeight}
                    onConfirm={handleConfirmInsertedTask}
                    onCancel={handleCancelInsertedTask}
                    nestingDepth={pendingInsert?.nestingDepth ?? 0}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Ghost row for new task creation — positioned OUTSIDE body div to avoid height desync */}
        {isCreating && !pendingInsert && (
          <NewTaskRow
            rowHeight={rowHeight}
            onConfirm={handleConfirmNewTask}
            onCancel={handleCancelNewTask}
            nestingDepth={0}
          />
        )}

        {/* Add task button - also serves as drop target for moving tasks to end */}
        {enableAddTask && onAdd && !isCreating && !pendingInsert && (
          <button
            className={`gantt-tl-add-btn${dragOverIndex === visibleTasks.length ? ' gantt-tl-add-btn-drag-over' : ''}`}
            onClick={() => {
              setPendingInsert(null);
              setIsCreating(true);
            }}
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
