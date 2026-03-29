'use client';

import React, { useMemo, useCallback, useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { getMultiMonthDays, createCustomDayPredicate, type CustomDayConfig, type CustomDayPredicateConfig } from '../../utils/dateUtils';
import { calculateGridWidth } from '../../utils/geometry';
import { validateDependencies, cascadeByLinks, universalCascade, computeParentDates, computeParentProgress, getChildren, removeDependenciesBetweenTasks, isTaskParent } from '../../utils/dependencyUtils';
import { normalizeHierarchyTasks } from '../../utils/hierarchyOrder';
import type { ValidationResult } from '../../types';
import { TaskPredicate } from '../../filters';
import type { TaskListColumn } from '../TaskList/taskListColumns';
import TimeScaleHeader from '../TimeScaleHeader';
import TaskRow from '../TaskRow';
import TodayIndicator from '../TodayIndicator';
import GridBackground from '../GridBackground';
import DragGuideLines from '../DragGuideLines/DragGuideLines';
import { DependencyLines } from '../DependencyLines';
import { TaskList } from '../TaskList';
import './GanttChart.css';

const SCROLL_TO_ROW_CONTEXT_ROWS = 2;

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
   * - Lag is required (positive = delay, negative = overlap)
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
  /** Lag in days */
  lag: number;
}

export interface GanttChartProps<TTask extends Task = Task> {
  /** Array of tasks to display */
  tasks: TTask[];
  /** Width of each day column in pixels (default: 40) */
  dayWidth?: number;
  /** Height of each task row in pixels (default: 40) */
  rowHeight?: number;
  /** Height of the header row in pixels (default: 40) */
  headerHeight?: number;
  /** Container height. Can be pixels (600), string ("90vh", "100%", "500px"), or undefined for auto height */
  containerHeight?: number | string;
  /** Callback when tasks are modified. Receives ONLY the changed tasks as full objects with all properties. */
  onTasksChange?: (tasks: TTask[]) => void;
  /** Optional callback for dependency validation results */
  onValidateDependencies?: (result: ValidationResult) => void;
  /** Enable automatic shifting of dependent tasks when predecessor moves (default: false) */
  enableAutoSchedule?: boolean;
  /** Disable dependency constraint checking during drag (default: false) */
  disableConstraints?: boolean;
  /** Called when a cascade drag completes; receives all shifted tasks (including dragged task) in hard mode */
  onCascade?: (tasks: TTask[]) => void;
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
  onAdd?: (task: TTask) => void;
  /** Callback when a task is deleted via the task list */
  onDelete?: (taskId: string) => void;
  /** Callback when a new task is inserted after a specific task via the task list */
  onInsertAfter?: (taskId: string, newTask: TTask) => void;
  /** Callback when tasks are reordered via drag in the task list */
  onReorder?: (tasks: TTask[], movedTaskId?: string, inferredParentId?: string) => void;
  /** Callback when a task is promoted (parentId removed). If not provided, default internal logic is used. */
  onPromoteTask?: (taskId: string) => void;
  /** Callback when a task is demoted (parentId set). If not provided, default internal logic is used. */
  onDemoteTask?: (taskId: string, newParentId: string) => void;
  /** Enable add task button at bottom of task list (default: true) */
  enableAddTask?: boolean;
  /** View mode: 'day' renders one column per day, 'week' renders one column per 7 days, 'month' renders one column per month (default: 'day') */
  viewMode?: 'day' | 'week' | 'month';
  /** Custom day configurations with explicit type (weekend or workday) */
  customDays?: CustomDayConfig[];
  /** Optional base weekend predicate (checked before customDays overrides) */
  isWeekend?: (date: Date) => boolean;
  /** Считать duration в рабочих днях, исключая выходные (default: true) */
  businessDays?: boolean;
  /**
   * Optional predicate to mark tasks in the current view.
   * Matching tasks stay visible and are highlighted in the chart and task list.
   * Dependencies are still computed on ALL tasks (normalizedTasks).
   */
  taskFilter?: TaskPredicate;
  /** Filter mode: 'highlight' shows all tasks with yellow highlight on matches, 'hide' hides non-matching tasks (default: 'highlight') */
  filterMode?: 'highlight' | 'hide';
  /** Set of collapsed parent task IDs for controlled mode */
  collapsedParentIds?: Set<string>;
  /** Callback when collapse/expand button is clicked (controlled mode) */
  onToggleCollapse?: (parentId: string) => void;
  /** Task IDs to highlight in the task list (for search results) */
  highlightedTaskIds?: Set<string>;
  /** Disable task drag and resize on the calendar grid (default: false) */
  disableTaskDrag?: boolean;
  /** Show calendar chart area (default: true) */
  showChart?: boolean;
  /** Additional custom columns to render in the TaskList after built-in columns */
  additionalColumns?: TaskListColumn<TTask>[];
}

/**
 * Ref handle type for GanttChart — exposes imperative scroll methods.
 */
export interface GanttChartHandle {
  scrollToToday: () => void;
  scrollToTask: (taskId: string) => void;
  scrollToRow: (taskId: string) => void;
  collapseAll: () => void;
  expandAll: () => void;
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
function GanttChartInner<TTask extends Task = Task>(
  props: GanttChartProps<TTask>,
  ref: React.ForwardedRef<GanttChartHandle>
) {
  const {
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
  viewMode = 'day',
  customDays,
  isWeekend,
  businessDays = true,
  taskFilter,
  filterMode = 'highlight',
  collapsedParentIds: externalCollapsedParentIds,
  onToggleCollapse: externalOnToggleCollapse,
  highlightedTaskIds,
  disableTaskDrag = false,
  showChart = true,
  additionalColumns,
  } = props;
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Track selected task ID for highlighting in both TaskList and TaskRow
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskListHasRightShadow, setTaskListHasRightShadow] = useState(false);

  // Track selected dep chip for arrow highlighting in DependencyLines
  const [selectedChip, setSelectedChip] = useState<{ successorId: string; predecessorId: string; linkType: string } | null>(null);

  // Hierarchy state: collapsed parent IDs (uncontrolled mode - internal state)
  const [internalCollapsedParentIds, setInternalCollapsedParentIds] = useState<Set<string>>(new Set());

  // Use external collapsedParentIds if provided (controlled mode), otherwise use internal state
  const collapsedParentIds = externalCollapsedParentIds ?? internalCollapsedParentIds;

  // Track editing task ID for auto-edit mode after insert
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const normalizedTasks = useMemo(() => normalizeHierarchyTasks(tasks), [tasks]);

  // Create custom weekend predicate from props (memoized for performance)
  const isCustomWeekend = useMemo(
    () => createCustomDayPredicate({ customDays, isWeekend }),
    [customDays, isWeekend]
  );

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

  // Visible tasks are determined by collapsed parent state and optionally by filter mode.
  // Checks the full ancestor chain so grandchildren are hidden when any ancestor is collapsed.
  const visibleTasks = useMemo(() => {
    const parentMap = new Map(normalizedTasks.map(t => [t.id, t.parentId]));

    function isAnyAncestorCollapsed(parentId: string | undefined): boolean {
      let current = parentId;
      while (current) {
        if (collapsedParentIds.has(current)) return true;
        current = parentMap.get(current);
      }
      return false;
    }

    let tasks = normalizedTasks.filter(task => !isAnyAncestorCollapsed(task.parentId));

    // In 'hide' mode with active filter, only show matching tasks
    if (filterMode === 'hide' && taskFilter) {
      tasks = tasks.filter(taskFilter);
    }

    return tasks;
  }, [normalizedTasks, collapsedParentIds, filterMode, taskFilter]);

  const matchedTaskIds = useMemo(() => {
    if (!taskFilter) return new Set<string>();
    return new Set(visibleTasks.filter(taskFilter).map(task => task!.id));
  }, [visibleTasks, taskFilter]);

  const taskListHighlightedTaskIds = useMemo(() => {
    // In hide mode, no highlighting needed - all visible tasks already match the filter
    if (filterMode === 'hide') {
      return new Set<string>();
    }
    if ((!highlightedTaskIds || highlightedTaskIds.size === 0) && matchedTaskIds.size === 0) {
      return new Set<string>();
    }

    const mergedHighlightedTaskIds = new Set(highlightedTaskIds ?? []);
    matchedTaskIds.forEach((taskId) => mergedHighlightedTaskIds.add(taskId));
    return mergedHighlightedTaskIds;
  }, [filterMode, highlightedTaskIds, matchedTaskIds]);

  // Calculate total grid height from currently visible rows.
  const totalGridHeight = useMemo(
    () => visibleTasks.length * rowHeight,
    [visibleTasks.length, rowHeight]
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

  const scrollToRow = useCallback((taskId: string) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const rowIndex = visibleTasks.findIndex(visibleTask => visibleTask.id === task.id);
    if (rowIndex === -1) return;

    const paddedRowIndex = Math.max(0, rowIndex - SCROLL_TO_ROW_CONTEXT_ROWS);
    const scrollTop = Math.max(0, rowHeight * paddedRowIndex);
    setSelectedTaskId(taskId);
    container.scrollTo({ top: scrollTop, behavior: 'smooth' });
  }, [tasks, visibleTasks, rowHeight]);

  // Track drag state for guide lines
  const [dragGuideLines, setDragGuideLines] = useState<{
    isDragging: boolean;
    dragMode: 'move' | 'resize-left' | 'resize-right' | null;
    left: number;
    width: number;
  } | null>(null);

  // Track currently-dragged task's pixel position for real-time dependency line updates
  const [draggedTaskOverride, setDraggedTaskOverride] = useState<{ taskId: string; left: number; width: number } | null>(null);
  const [previewTasksById, setPreviewTasksById] = useState<Map<string, Task>>(new Map());

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
    const updatedTask = updatedTasks[0];
    if (!updatedTask) return;
    const originalTask = tasks.find(t => t.id === updatedTask.id);
    if (!originalTask) {
      // New task or task not found - pass all tasks as-is
      onTasksChange?.(updatedTasks as TTask[]);
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
      // Special case: parent progress cascade (multiple tasks, no date changes)
      if (updatedTasks.length > 1) {
        onTasksChange?.(updatedTasks as TTask[]);
        if (editingTaskId === updatedTask.id) {
          setEditingTaskId(null);
        }
        return;
      }

      // Single task without date changes - compute parent progress if needed
      const taskParentId = (updatedTask as any).parentId;
      if (taskParentId) {
        const parentProgress = computeParentProgress(taskParentId, tasks.map(t => t.id === updatedTask.id ? updatedTask : t));
        const parentTask = tasks.find(t => t.id === taskParentId);
        if (parentTask) {
          const updatedParent = { ...parentTask, progress: parentProgress };
          onTasksChange?.([updatedTask, updatedParent] as TTask[]);
        } else {
          onTasksChange?.([updatedTask] as TTask[]);
        }
      } else {
        onTasksChange?.([updatedTask] as TTask[]);
      }
      if (editingTaskId === updatedTask.id) {
        setEditingTaskId(null);
      }
      return;
    }

    // Special handling for parent tasks: dates are computed from children
    const isParent = isTaskParent(updatedTask.id, tasks);
    if (isParent) {
      // When editing a parent task via task list, ignore the entered dates
      // and recalculate from children. Children should NOT be moved.
      const { startDate: parentStart, endDate: parentEnd } = computeParentDates(updatedTask.id, tasks);
      const parentWithRecalcDates = {
        ...updatedTask,
        startDate: parentStart.toISOString().split('T')[0],
        endDate: parentEnd.toISOString().split('T')[0],
      };

      // Cascade only dependency successors (not children) if constraints enabled
      const cascadedTasks = disableConstraints
        ? [parentWithRecalcDates]
        : universalCascade(parentWithRecalcDates, parentStart, parentEnd, tasks, businessDays, isCustomWeekend);

      onTasksChange?.(cascadedTasks as TTask[]);
    } else {
      // Regular task or child: normal cascade
      const cascadedTasks = disableConstraints
        ? [updatedTask]
        : universalCascade(updatedTask, newStart, newEnd, tasks, businessDays, isCustomWeekend);

      onTasksChange?.(cascadedTasks as TTask[]);
    }
  }, [tasks, onTasksChange, disableConstraints, editingTaskId, businessDays, isCustomWeekend]);

  /**
   * Handle task deletion: collect all changed tasks (with cleaned dependencies),
   * emit onTasksChange with them, then emit onDelete for each deleted task ID
   * (original + all descendants) so the consumer can remove all of them.
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
      onTasksChange?.(changedTasks as TTask[]);
    }

    // Call onDelete for each task in the cascade set (original + all descendants)
    // so the consumer removes all of them, not just the root.
    toDelete.forEach(id => onDelete?.(id));
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
    onInsertAfter?.(taskId, newTask as TTask);
  }, [onInsertAfter]);

  /**
   * Handle task reordering: notify external consumer via onTasksChange and onReorder callbacks.
   * Reordering changes all tasks positions, so we emit the full reordered array.
   */
  const handleReorder = useCallback((reorderedTasks: Task[], movedTaskId?: string, inferredParentId?: string) => {
    let updated = reorderedTasks;
    if (movedTaskId) {
      updated = updated.map(t => {
        if (t.id === movedTaskId) {
          return { ...t, parentId: inferredParentId || undefined };
        }
        return t;
      });
    }

    const normalized = normalizeHierarchyTasks(updated);
    onTasksChange?.(normalized as TTask[]);
    onReorder?.(normalized as TTask[], movedTaskId, inferredParentId);
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
  const handleCascadeProgress = useCallback((
    overrides: Map<string, { left: number; width: number }>,
    previewTasks: Task[] = []
  ) => {
    setCascadeOverrides(new Map(overrides));
    setPreviewTasksById(new Map(previewTasks.map(task => [task.id, task])));
  }, []);

  const previewNormalizedTasks = useMemo(() => {
    if (previewTasksById.size === 0) return normalizedTasks;
    return normalizedTasks.map(task => previewTasksById.get(task.id) ?? task);
  }, [normalizedTasks, previewTasksById]);

  const previewVisibleTasks = useMemo(() => {
    if (previewTasksById.size === 0) return visibleTasks;
    return visibleTasks.map(task => previewTasksById.get(task.id) ?? task);
  }, [visibleTasks, previewTasksById]);

  /**
   * Handle cascade completion — emit all changed tasks.
   * Parent tasks are computed from children - don't send them in batch.
   */
  const handleCascade = useCallback((cascadedTasks: Task[]) => {
    // Backend should compute parent dates from children
    onTasksChange?.(cascadedTasks as TTask[]);
  }, [tasks, onTasksChange]);

  /**
   * Handle task selection from TaskList or TaskRow
   */
  const handleTaskSelect = useCallback((taskId: string | null) => {
    setSelectedTaskId(taskId);
  }, []);

  // Hierarchy callbacks
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

  // Get all parent task IDs (tasks that have children)
  const allParentIds = useMemo(() => {
    return new Set(
      normalizedTasks
        .filter(t => isTaskParent(t.id, normalizedTasks))
        .map(t => t.id)
    );
  }, [normalizedTasks]);

  const handleCollapseAll = useCallback(() => {
    if (externalCollapsedParentIds) return; // Don't modify external state
    setInternalCollapsedParentIds(allParentIds);
  }, [allParentIds, externalCollapsedParentIds]);

  const handleExpandAll = useCallback(() => {
    if (externalCollapsedParentIds) return; // Don't modify external state
    setInternalCollapsedParentIds(new Set());
  }, [externalCollapsedParentIds]);

  // Expose collapse/expand methods via ref (must be after handlers are defined)
  useImperativeHandle(
    ref,
    () => ({
      scrollToToday,
      scrollToTask,
      scrollToRow,
      collapseAll: handleCollapseAll,
      expandAll: handleExpandAll,
    }),
    [scrollToToday, scrollToTask, scrollToRow, handleCollapseAll, handleExpandAll]
  );

  /**
   * Calculate the depth of a task in the hierarchy.
   * Root tasks have depth 0, their children have depth 1, etc.
   */
  function getTaskDepth(taskId: string, tasks: Task[]): number {
    let depth = 0;
    let current: Task | undefined = tasks.find(t => t.id === taskId);
    while (current) {
      if (!current.parentId) break;
      depth++;
      const parentId: string = current.parentId;
      current = tasks.find(t => t.id === parentId);
    }
    return depth;
  }

  const handlePromoteTask = useCallback((taskId: string) => {
    // If consumer provided custom callback, use it
    if (onPromoteTask) {
      onPromoteTask(taskId);
      return;
    }

    // Default internal logic
    const taskToPromote = tasks.find(t => t.id === taskId);
    if (!taskToPromote || !taskToPromote.parentId) {
      return;
    }

    // Calculate current depth and determine new parent for single-level promotion
    const depth = getTaskDepth(taskId, tasks);
    const grandparentId = depth > 1
      ? tasks.find(t => t.id === taskToPromote.parentId)?.parentId
      : undefined;

    const currentParentId = taskToPromote.parentId;
    const siblings = tasks.filter(t => t.parentId === currentParentId);

    const promotedTask = { ...taskToPromote, parentId: grandparentId };

    if (siblings.length <= 1) {
      onTasksChange?.([promotedTask] as TTask[]);
      return;
    }

    // Reorder: place after last sibling of the old parent group
    const lastSiblingIndex = tasks
      .map((t, i) => ({ task: t, index: i }))
      .filter(({ task }) => task.parentId === currentParentId)
      .sort((a, b) => b.index - a.index)[0];

    if (!lastSiblingIndex) {
      onTasksChange?.([promotedTask] as TTask[]);
      return;
    }

    const reorderedTasks = normalizeHierarchyTasks([
      ...tasks.filter(t => t.id !== taskId).slice(0, lastSiblingIndex.index + 1),
      promotedTask,
      ...tasks.filter(t => t.id !== taskId).slice(lastSiblingIndex.index + 1)
    ]);

    onTasksChange?.(reorderedTasks as TTask[]);
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
    if (!demotedTask) return;

    // If task was a parent (had children), save computed dates as its own dates
    // These become the task's "own" dates after demotion
    const wasParent = getChildren(taskId, tasks).length > 0;
    let taskDates = { startDate: demotedTask.startDate, endDate: demotedTask.endDate };

    if (wasParent) {
      const computedDates = computeParentDates(taskId, tasks);
      taskDates = {
        startDate: computedDates.startDate.toISOString().split('T')[0],
        endDate: computedDates.endDate.toISOString().split('T')[0]
      };
    }

    const updatedDemotedTask = {
      ...demotedTask,
      parentId: newParentId,
      startDate: taskDates.startDate,
      endDate: taskDates.endDate
    };

    // Only send the demoted task - parent dates are computed from children
    onTasksChange?.([updatedDemotedTask] as TTask[]);
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
            onAdd={onAdd as ((task: Task) => void) | undefined}
            onDelete={handleDelete}
            onInsertAfter={handleInsertAfter as ((taskId: string, newTask: Task) => void) | undefined}
            onReorder={handleReorder as ((tasks: Task[], movedTaskId?: string, inferredParentId?: string) => void) | undefined}
            editingTaskId={editingTaskId}
            enableAddTask={enableAddTask}
            collapsedParentIds={collapsedParentIds}
            onToggleCollapse={handleToggleCollapse}
            onPromoteTask={onPromoteTask ?? handlePromoteTask}
            onDemoteTask={onDemoteTask ?? handleDemoteTask}
            highlightedTaskIds={taskListHighlightedTaskIds}
            customDays={customDays}
            isWeekend={isWeekend}
            businessDays={businessDays}
            filterMode={filterMode}
            filteredTaskIds={matchedTaskIds}
            isFilterActive={!!taskFilter}
            additionalColumns={additionalColumns}
          />

          {/* Chart area */}
          <div className={showChart ? '' : 'gantt-chart-hidden'} style={{ minWidth: `${gridWidth}px`, flex: 1 }}>
            {/* Sticky header - stays at top during vertical scroll, scrolls with content horizontally */}
            <div className="gantt-stickyHeader" style={{ width: `${gridWidth}px` }}>
              <TimeScaleHeader
                days={dateRange}
                dayWidth={dayWidth}
                headerHeight={headerHeight}
                viewMode={viewMode}
                isCustomWeekend={isCustomWeekend}
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
            viewMode={viewMode}
            isCustomWeekend={isCustomWeekend}
          />

          {todayInRange && <TodayIndicator monthStart={monthStart} dayWidth={dayWidth} />}

          {/* Dependency lines SVG overlay */}
          <DependencyLines
            tasks={previewVisibleTasks}
            allTasks={previewNormalizedTasks}
            collapsedParentIds={collapsedParentIds}
            monthStart={monthStart}
            dayWidth={dayWidth}
            rowHeight={rowHeight}
            gridWidth={gridWidth}
            dragOverrides={dependencyOverrides}
            selectedDep={selectedChip}
            businessDays={businessDays}
            weekendPredicate={isCustomWeekend}
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

          {visibleTasks.map((task, index) => (
            <TaskRow
              key={task.id}
              task={task}
              monthStart={monthStart}
              dayWidth={dayWidth}
              rowHeight={rowHeight}
              onTasksChange={handleTaskChange as (tasks: Task[]) => void}
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
              onCascadeProgress={handleCascadeProgress as (overrides: Map<string, { left: number; width: number }>, previewTasks?: Task[]) => void}
              onCascade={handleCascade as (cascadedTasks: Task[]) => void}
              highlightExpiredTasks={highlightExpiredTasks}
              isFilterMatch={filterMode === 'highlight' ? matchedTaskIds.has(task.id) : false}
              businessDays={businessDays}
              customDays={customDays}
              isWeekend={isWeekend}
              disableTaskDrag={disableTaskDrag}
            />
          ))}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const GanttChart = forwardRef(GanttChartInner) as <TTask extends Task = Task>(
  props: GanttChartProps<TTask> & { ref?: React.Ref<GanttChartHandle> }
) => React.ReactElement;

(GanttChart as React.FC).displayName = 'GanttChart';

export default GanttChart;
