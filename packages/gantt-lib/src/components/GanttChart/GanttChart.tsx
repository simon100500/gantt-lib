'use client';

import React, { useMemo, useCallback, useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { getMultiMonthDays } from '../../utils/dateUtils';
import { calculateGridWidth } from '../../utils/geometry';
import { validateDependencies, cascadeByLinks, computeParentDates, computeParentProgress, getChildren, removeDependenciesBetweenTasks } from '../../utils/dependencyUtils';
import { normalizeHierarchyTasks } from '../../utils/hierarchyOrder';
import type { ValidationResult } from '../../types';
import TimeScaleHeader from '../TimeScaleHeader';
import TaskRow from '../TaskRow';
import TodayIndicator from '../TodayIndicator';
import GridBackground from '../GridBackground';
import DragGuideLines from '../DragGuideLines/DragGuideLines';
import { DependencyLines } from '../DependencyLines';
import { TaskList } from '../TaskList';
import './GanttChart.css';

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
  /** Optional parent task ID for hierarchy relationship */
  parentId?: string;
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
  /** Container height. Can be pixels (600), string ("90vh", "100%", "500px"), or undefined for auto height */
  containerHeight?: number | string;
  /** Callback when tasks are modified. Receives ONLY the changed tasks as full objects with all properties. */
  onTasksChange?: (tasks: Task[]) => void;
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
  /** Disable task name editing in the task list (default: false) */
  disableTaskNameEditing?: boolean;
  /** Disable dependency editing in the task list (default: false) */
  disableDependencyEditing?: boolean;
  /** Highlight expired/overdue tasks with red background (default: false) */
  highlightExpiredTasks?: boolean;
  /** Callback when a new task is added via the task list */
  onAdd?: (task: Task) => void;
  /** Callback when a task is deleted via the task list */
  onDelete?: (taskId: string) => void;
  /** Callback when a new task is inserted after a specific task via the task list */
  onInsertAfter?: (taskId: string, newTask: Task) => void;
  /** Callback when tasks are reordered via drag in the task list */
  onReorder?: (tasks: Task[], movedTaskId?: string, inferredParentId?: string) => void;
  /** Callback when a task is promoted (parentId removed). If not provided, default internal logic is used. */
  onPromoteTask?: (taskId: string) => void;
  /** Callback when a task is demoted (parentId set). If not provided, default internal logic is used. */
  onDemoteTask?: (taskId: string, newParentId: string) => void;
  /** Enable add task button at bottom of task list (default: true) */
  enableAddTask?: boolean;
}

/**
 * Ref handle type for GanttChart — exposes imperative scroll methods.
 */
export interface GanttChartHandle {
  scrollToToday: () => void;
  scrollToTask: (taskId: string) => void;
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
 * @example
 * ```tsx
 * // Hide add task button
 * <GanttChart
 *   tasks={tasks}
 *   enableAddTask={false}
 * />
 * ```
 */
export const GanttChart = forwardRef<GanttChartHandle, GanttChartProps>(({
  tasks,
  dayWidth = 40,
  rowHeight = 40,
  headerHeight = 40,
  containerHeight,
  onTasksChange,
  onValidateDependencies,
  enableAutoSchedule,
  disableConstraints,
  onCascade,
  showTaskList = false,
  taskListWidth = 660,
  disableTaskNameEditing = false,
  disableDependencyEditing = false,
  highlightExpiredTasks = false,
  onAdd,
  onDelete,
  onInsertAfter,
  onReorder,
  onPromoteTask,
  onDemoteTask,
  enableAddTask = true,
}, ref) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Track selected task ID for highlighting in both TaskList and TaskRow
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskListHasRightShadow, setTaskListHasRightShadow] = useState(false);

  // Track selected dep chip for arrow highlighting in DependencyLines
  const [selectedChip, setSelectedChip] = useState<{ successorId: string; predecessorId: string; linkType: string } | null>(null);

  // Hierarchy state: collapsed parent IDs
  const [collapsedParentIds, setCollapsedParentIds] = useState<Set<string>>(new Set());

  // Track editing task ID for auto-edit mode after insert
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const normalizedTasks = useMemo(() => normalizeHierarchyTasks(tasks), [tasks]);

  // Calculate multi-month date range from normalized tasks
  const dateRange = useMemo(() => getMultiMonthDays(normalizedTasks), [normalizedTasks]);

  // Track dependency validation results
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  // Cascade override positions for non-dragged chain members
  const [cascadeOverrides, setCascadeOverrides] = useState<Map<string, { left: number; width: number }>>(new Map());

  // Calculate grid width
  const gridWidth = useMemo(
    () => Math.round(dateRange.length * dayWidth),
    [dateRange.length, dayWidth]
  );

  // Filter tasks to hide children of collapsed parents (for chart rendering)
  const filteredTasks = useMemo(() => {
    return normalizedTasks.filter(task => {
      // Root-level tasks (no parentId) are always visible
      if (!task.parentId) return true;
      // Child tasks are visible only if their parent is not collapsed
      const parentCollapsed = collapsedParentIds.has(task.parentId);
      return !parentCollapsed;
    });
  }, [normalizedTasks, collapsedParentIds]);

  // Calculate total grid height (based on filtered tasks)
  const totalGridHeight = useMemo(
    () => filteredTasks.length * rowHeight,
    [filteredTasks.length, rowHeight]
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

  // Center chart on today's date on initial mount
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || dateRange.length === 0) return;

    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const todayIndex = dateRange.findIndex(day => day.getTime() === today.getTime());

    if (todayIndex === -1) return;

    // Calculate scroll position to center today
    const todayOffset = todayIndex * dayWidth;
    const containerWidth = container.clientWidth;
    const scrollLeft = Math.round(todayOffset - (containerWidth / 2) + (dayWidth / 2));

    container.scrollLeft = Math.max(0, scrollLeft);
  }, []); // Empty deps array - run only on mount

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const updateShadow = () => {
      setTaskListHasRightShadow(container.scrollLeft > 0);
    };

    updateShadow();
    container.addEventListener('scroll', updateShadow, { passive: true });
    return () => {
      container.removeEventListener('scroll', updateShadow);
    };
  }, []);

  /**
   * Scroll to today's date when the "Today" button is clicked
   */
  const scrollToToday = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || dateRange.length === 0) return;

    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const todayIndex = dateRange.findIndex(day => day.getTime() === today.getTime());

    if (todayIndex === -1) return;

    // Calculate scroll position to center today
    const todayOffset = todayIndex * dayWidth;
    const containerWidth = container.clientWidth;
    const scrollLeft = Math.round(todayOffset - (containerWidth / 2) + (dayWidth / 2));

    container.scrollTo({ left: Math.max(0, scrollLeft), behavior: 'smooth' });
  }, [dateRange, dayWidth]);

  /**
   * Scroll to a specific task by ID, centering its start date horizontally in the grid.
   */
  const scrollToTask = useCallback((taskId: string) => {
    const container = scrollContainerRef.current;
    if (!container || dateRange.length === 0) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const taskStart = new Date(task.startDate as string);
    const taskStartUTC = new Date(Date.UTC(
      taskStart.getUTCFullYear(),
      taskStart.getUTCMonth(),
      taskStart.getUTCDate()
    ));
    const taskIndex = dateRange.findIndex(day => day.getTime() === taskStartUTC.getTime());
    if (taskIndex === -1) return;

    const taskOffset = taskIndex * dayWidth;
    const scrollLeft = Math.round(taskOffset - dayWidth * 2);
    container.scrollTo({ left: Math.max(0, scrollLeft), behavior: 'smooth' });
  }, [tasks, dateRange, dayWidth]);

  /**
   * Expose scrollToToday and scrollToTask methods to parent component via ref
   */
  useImperativeHandle(
    ref,
    () => ({
      scrollToToday,
      scrollToTask,
    }),
    [scrollToToday, scrollToTask]
  );

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
   * Callback when tasks are modified.
   * Always receives ONLY the changed tasks as full objects with all properties.
   * Single task = array of 1 element (batch of size 1).
   */
  const handleTaskChange = useCallback((updatedTasks: Task[]) => {
    const updatedTask = updatedTasks[0]; // TODO: handle batch properly
    if (!updatedTask) return;
    const originalTask = tasks.find(t => t.id === updatedTask.id);
    if (!originalTask) {
      onTasksChange?.([updatedTask]);
      if (editingTaskId === updatedTask.id) {
        setEditingTaskId(null);
      }
      return;
    }

    const origStart = new Date(originalTask.startDate as string);
    const origEnd = new Date(originalTask.endDate as string);
    const newStart = new Date(updatedTask.startDate as string);
    const newEnd = new Date(updatedTask.endDate as string);
    const datesChanged = origStart.getTime() !== newStart.getTime() || origEnd.getTime() !== newEnd.getTime();

    if (!datesChanged) {
      const taskParentId = (updatedTask as any).parentId;
      if (taskParentId) {
        const parentProgress = computeParentProgress(taskParentId, tasks.map(t => t.id === updatedTask.id ? updatedTask : t));
        const parentTask = tasks.find(t => t.id === taskParentId);
        if (parentTask) {
          const updatedParent = { ...parentTask, progress: parentProgress };
          onTasksChange?.([updatedTask, updatedParent]);
        } else {
          onTasksChange?.([updatedTask]);
        }
      } else {
        onTasksChange?.([updatedTask]);
      }
      if (editingTaskId === updatedTask.id) {
        setEditingTaskId(null);
      }
      return;
    }

    const cascadedTasks = disableConstraints
      ? [updatedTask]
      : [updatedTask, ...cascadeByLinks(updatedTask.id, newStart, newEnd, tasks)];

    if (disableConstraints) {
      onTasksChange?.(cascadedTasks);
    } else {
      const changedTasks = new Map(cascadedTasks.map(t => [t.id, t]));
      const parentIdsToUpdate = new Set<string>();
      cascadedTasks.forEach(task => {
        if ((task as any).parentId) {
          parentIdsToUpdate.add((task as any).parentId);
        }
      });

      const additionalParentUpdates: Task[] = [];
      parentIdsToUpdate.forEach(parentId => {
        const parentTask = tasks.find(t => t.id === parentId);
        if (!parentTask) return;

        // If the moved task IS the parent, update its progress in cascadedTasks
        // (don't add to additionalParentUpdates to avoid duplicate with old dates)
        if (parentId === updatedTask.id) {
          const newProgress = computeParentProgress(parentId, tasks.map(t => changedTasks.get(t.id) ?? t));
          // Update the parent's progress in cascadedTasks (it's already there with new dates)
          const parentInCascaded = cascadedTasks.find(t => t.id === parentId);
          if (parentInCascaded) {
            (parentInCascaded as any).progress = newProgress;
          }
          return;
        }

        // For other parents, recalc dates and progress from children
        const tempTasks = tasks.map(t => changedTasks.get(t.id) ?? t);
        const newDates = computeParentDates(parentId, tempTasks);
        const newProgress = computeParentProgress(parentId, tempTasks);
        additionalParentUpdates.push({
          ...parentTask,
          startDate: newDates.startDate.toISOString().split('T')[0],
          endDate: newDates.endDate.toISOString().split('T')[0],
          progress: newProgress
        });
      });

      onTasksChange?.([...cascadedTasks, ...additionalParentUpdates]);
    }
  }, [tasks, onTasksChange, disableConstraints, editingTaskId]);

  /**
   * Handle task deletion: collect all changed tasks (with cleaned dependencies),
   * emit onTasksChange with them, then emit onDelete with the taskId.
   * For parent tasks, cascade delete to all children.
   */
  const handleDelete = useCallback((taskId: string) => {
    const toDelete = new Set<string>([taskId]);

    function collectDescendants(parentId: string) {
      const children = getChildren(parentId, tasks);
      children.forEach(child => {
        toDelete.add(child.id);
        collectDescendants(child.id);
      });
    }

    collectDescendants(taskId);

    const changedTasks: Task[] = [];
    tasks.forEach(task => {
      if (toDelete.has(task.id)) return;

      if (task.dependencies && task.dependencies.some(dep => toDelete.has(dep.taskId))) {
        changedTasks.push({
          ...task,
          dependencies: task.dependencies.filter(dep => !toDelete.has(dep.taskId))
        });
      }
    });

    if (changedTasks.length > 0) {
      onTasksChange?.(changedTasks);
    }

    onDelete?.(taskId);
  }, [tasks, onTasksChange, onDelete]);

  /**
   * Handle task insertion: set editingTaskId to trigger auto-edit mode,
   * then notify external consumer via onInsertAfter callback.
   *
   * NOTE: The external onInsertAfter callback is responsible for adding
   * the task and should emit onTasksChange with the new task.
   */
  const handleInsertAfter = useCallback((taskId: string, newTask: Task) => {
    setEditingTaskId(newTask.id);
    onInsertAfter?.(taskId, newTask);
  }, [onInsertAfter]);

  /**
   * Handle task reordering: notify external consumer via onTasksChange and onReorder callbacks.
   * Reordering changes all tasks positions, so we emit the full reordered array.
   */
  const handleReorder = useCallback((reorderedTasks: Task[], movedTaskId?: string, inferredParentId?: string) => {
    console.log('=== GANTT CHART handleReorder START ===');
    console.log('[INPUTS]', {
      movedTaskId,
      inferredParentId,
      inferredParentIdType: typeof inferredParentId,
      reorderedTasksCount: reorderedTasks.length
    });

    const movedTaskInReordered = reorderedTasks.find(t => t.id === movedTaskId);
    if (movedTaskInReordered) {
      console.log('[MOVED TASK IN REORDERED]', {
        id: movedTaskInReordered.id,
        name: movedTaskInReordered.name,
        currentParentId: movedTaskInReordered.parentId
      });
    } else {
      console.log('[MOVED TASK NOT FOUND IN REORDERED]');
    }

    let updated = reorderedTasks;
    if (movedTaskId) {
      console.log('[CONDITION CHECK]', {
        condition: 'if (movedTaskId)',
        movedTaskId,
        isTrue: !!movedTaskId,
        willUpdateParentId: true
      });
      updated = updated.map(t => {
        if (t.id === movedTaskId) {
          const newParentId = inferredParentId || undefined;
          console.log('[UPDATING TASK]', {
            taskId: t.id,
            taskName: t.name,
            oldParentId: t.parentId,
            newParentId: newParentId,
            inferredParentId: inferredParentId,
            finalValue: newParentId
          });
          return { ...t, parentId: newParentId };
        }
        return t;
      });
    } else {
      console.log('[CONDITION CHECK]', {
        condition: 'if (movedTaskId)',
        movedTaskId,
        isTrue: false,
        willUpdateParentId: false
      });
    }

    const updatedTask = updated.find(t => t.id === movedTaskId);
    if (updatedTask) {
      console.log('[UPDATED TASK VERIFICATION]', {
        id: updatedTask.id,
        name: updatedTask.name,
        finalParentId: updatedTask.parentId
      });
    }

    console.log('[ONCHANGE END]', {
      updatedCount: updated.length
    });
    console.log('=== GANTT CHART handleReorder END ===\n');

    const normalized = normalizeHierarchyTasks(updated);
    onTasksChange?.(normalized);
    onReorder?.(normalized, movedTaskId, inferredParentId);
  }, [onTasksChange, onReorder]);

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
   * Handle cascade completion — emit all changed tasks (cascaded + parent updates).
   */
  const handleCascade = useCallback((cascadedTasks: Task[]) => {
    const draggedTaskId = cascadedTasks[0]?.id;
    const cascadeMap = new Map(cascadedTasks.map(t => [t.id, t]));

    const parentIdsToUpdate = new Set<string>();
    cascadedTasks.forEach(task => {
      if ((task as any).parentId) {
        parentIdsToUpdate.add((task as any).parentId);
      }
    });

    const additionalParentUpdates: Task[] = [];
    parentIdsToUpdate.forEach(parentId => {
      const parentTask = tasks.find(t => t.id === parentId);
      if (!parentTask) return;

      const tempTasks = tasks.map(t => cascadeMap.get(t.id) ?? t);

      // If the dragged task IS the parent, update its progress in cascadedTasks
      // (don't add to additionalParentUpdates to avoid duplicate with old dates)
      if (parentId === draggedTaskId) {
        const newProgress = computeParentProgress(parentId, tempTasks);
        const parentInCascaded = cascadedTasks.find(t => t.id === parentId);
        if (parentInCascaded) {
          (parentInCascaded as any).progress = newProgress;
        }
        return;
      }

      const newDates = computeParentDates(parentId, tempTasks);
      const newProgress = computeParentProgress(parentId, tempTasks);
      additionalParentUpdates.push({
        ...parentTask,
        startDate: newDates.startDate.toISOString().split('T')[0],
        endDate: newDates.endDate.toISOString().split('T')[0],
        progress: newProgress
      });
    });

    onTasksChange?.([...cascadedTasks, ...additionalParentUpdates]);
  }, [tasks, onTasksChange]);

  /**
   * Handle task selection from TaskList or TaskRow
   */
  const handleTaskSelect = useCallback((taskId: string | null) => {
    setSelectedTaskId(taskId);
  }, []);

  // Hierarchy callbacks
  const handleToggleCollapse = useCallback((parentId: string) => {
    setCollapsedParentIds(prev => {
      const next = new Set(prev);
      if (next.has(parentId)) {
        next.delete(parentId);
      } else {
        next.add(parentId);
      }
      return next;
    });
  }, []);

  const handlePromoteTask = useCallback((taskId: string) => {
    // If consumer provided custom callback, use it
    if (onPromoteTask) {
      onPromoteTask(taskId);
      return;
    }

    // Default internal logic
    const taskToPromote = tasks.find(t => t.id === taskId);
    if (!taskToPromote || !(taskToPromote as any).parentId) {
      return;
    }

    const parentId = (taskToPromote as any).parentId;
    const siblings = tasks.filter(t => (t as any).parentId === parentId);

    if (siblings.length <= 1) {
      const promotedTask = { ...taskToPromote, parentId: undefined };
      onTasksChange?.([promotedTask]);
      return;
    }

    const lastSiblingIndex = tasks
      .map((t, i) => ({ task: t, index: i }))
      .filter(({ task }) => (task as any).parentId === parentId)
      .sort((a, b) => b.index - a.index)[0];

    if (!lastSiblingIndex) {
      const promotedTask = { ...taskToPromote, parentId: undefined };
      onTasksChange?.([promotedTask]);
      return;
    }

    const promotedTask = { ...taskToPromote, parentId: undefined };
    const reorderedTasks = normalizeHierarchyTasks([
      ...tasks.filter(t => t.id !== taskId).slice(0, lastSiblingIndex.index + 1),
      promotedTask,
      ...tasks.filter(t => t.id !== taskId).slice(lastSiblingIndex.index + 1)
    ]);

    onTasksChange?.(reorderedTasks);
  }, [tasks, onTasksChange, onPromoteTask]);

  const handleDemoteTask = useCallback((taskId: string, newParentId: string) => {
    // If consumer provided custom callback, use it
    if (onDemoteTask) {
      onDemoteTask(taskId, newParentId);
      return;
    }

    // Default internal logic
    const wouldCreateCircular = (targetId: string, parentId: string, tasks: Task[]): boolean => {
      if (targetId === parentId) return true;

      const descendants = new Set<string>();
      function collect(id: string) {
        const children = getChildren(id, tasks);
        children.forEach(child => {
          descendants.add(child.id);
          collect(child.id);
        });
      }
      collect(targetId);
      return descendants.has(parentId);
    };

    if (wouldCreateCircular(taskId, newParentId, tasks)) {
      return;
    }

    let updatedTasks = removeDependenciesBetweenTasks(taskId, newParentId, tasks);

    const demotedTask = updatedTasks.find(t => t.id === taskId);
    const parentTask = updatedTasks.find(t => t.id === newParentId);

    if (!demotedTask || !parentTask) return;

    const updatedDemotedTask = { ...demotedTask, parentId: newParentId };

    const tempTasks = updatedTasks.map(t => t.id === taskId ? updatedDemotedTask : t);
    const parentDates = computeParentDates(newParentId, tempTasks);
    const parentProgress = computeParentProgress(newParentId, tempTasks);

    const updatedParentTask = {
      ...parentTask,
      startDate: parentDates.startDate.toISOString().split('T')[0],
      endDate: parentDates.endDate.toISOString().split('T')[0],
      progress: parentProgress
    };

    onTasksChange?.([updatedDemotedTask, updatedParentTask]);
  }, [tasks, onTasksChange, onDemoteTask]);

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
        style={{ height: containerHeight ?? 'auto', cursor: 'grab' }}
        onMouseDown={handlePanStart}
      >
        {/* Content wrapper - enables TaskList to scroll with chart horizontally */}
        <div className="gantt-scrollContent">
          {/* TaskList - sticky left, scrolls with content horizontally */}
          <TaskList
            tasks={normalizedTasks}
            rowHeight={rowHeight}
            headerHeight={headerHeight}
            taskListWidth={taskListWidth}
            onTasksChange={handleTaskChange}
            selectedTaskId={selectedTaskId ?? undefined}
            onTaskSelect={handleTaskSelect}
            show={showTaskList}
            hasRightShadow={taskListHasRightShadow}
            disableTaskNameEditing={disableTaskNameEditing}
            disableDependencyEditing={disableDependencyEditing}
            onScrollToTask={scrollToTask}
            onSelectedChipChange={setSelectedChip}
            onAdd={onAdd}
            onDelete={handleDelete}
            onInsertAfter={handleInsertAfter}
            onReorder={handleReorder}
            editingTaskId={editingTaskId}
            enableAddTask={enableAddTask}
            collapsedParentIds={collapsedParentIds}
            onToggleCollapse={handleToggleCollapse}
            onPromoteTask={onPromoteTask ?? handlePromoteTask}
            onDemoteTask={onDemoteTask ?? handleDemoteTask}
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
            tasks={filteredTasks}
            allTasks={normalizedTasks}
            collapsedParentIds={collapsedParentIds}
            monthStart={monthStart}
            dayWidth={dayWidth}
            rowHeight={rowHeight}
            gridWidth={gridWidth}
            dragOverrides={dependencyOverrides}
            selectedDep={selectedChip}
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

          {filteredTasks.map((task, index) => (
            <TaskRow
              key={task.id}
              task={task}
              monthStart={monthStart}
              dayWidth={dayWidth}
              rowHeight={rowHeight}
              onTasksChange={handleTaskChange}
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
            allTasks={normalizedTasks}
              enableAutoSchedule={enableAutoSchedule ?? false}
              disableConstraints={disableConstraints ?? false}
              overridePosition={cascadeOverrides.get(task.id)}
              onCascadeProgress={handleCascadeProgress}
              onCascade={handleCascade}
              highlightExpiredTasks={highlightExpiredTasks}
            />
          ))}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
});

GanttChart.displayName = 'GanttChart';

export default GanttChart;
