'use client';

import React, { useMemo, useCallback, useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { getMultiMonthDays } from '../../utils/dateUtils';
import { calculateGridWidth } from '../../utils/geometry';
import { validateDependencies, cascadeByLinks, computeParentDates, computeParentProgress, getChildren, removeDependenciesBetweenTasks } from '../../utils/dependencyUtils';
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
  /** Callback when tasks are modified via drag/resize. Can receive either the new tasks array or a functional updater. */
  onChange?: (tasks: Task[] | ((currentTasks: Task[]) => Task[])) => void;
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
  onChange,
  onValidateDependencies,
  enableAutoSchedule,
  disableConstraints,
  onCascade,
  showTaskList = false,
  taskListWidth = 520,
  disableTaskNameEditing = false,
  disableDependencyEditing = false,
  highlightExpiredTasks = false,
  onAdd,
  onDelete,
  onInsertAfter,
  onReorder,
  enableAddTask = true,
}, ref) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Track selected task ID for highlighting in both TaskList and TaskRow
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Track selected dep chip for arrow highlighting in DependencyLines
  const [selectedChip, setSelectedChip] = useState<{ successorId: string; predecessorId: string; linkType: string } | null>(null);

  // Hierarchy state: collapsed parent IDs
  const [collapsedParentIds, setCollapsedParentIds] = useState<Set<string>>(new Set());

  // Track editing task ID for auto-edit mode after insert
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  // Calculate multi-month date range from tasks
  const dateRange = useMemo(() => getMultiMonthDays(tasks), [tasks]);

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
    return tasks.filter(task => {
      // Root-level tasks (no parentId) are always visible
      if (!task.parentId) return true;
      // Child tasks are visible only if their parent is not collapsed
      const parentCollapsed = collapsedParentIds.has(task.parentId);
      return !parentCollapsed;
    });
  }, [tasks, collapsedParentIds]);

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
   * Stable callback for task updates
   *
   * FIXED: No longer depends on `tasks` to avoid stale closure bugs.
   * Uses functional state update pattern: the callback receives an updater function
   * that maps over the current tasks state, ensuring we always use the latest state.
   *
   * This prevents the "reverting" bug where dragging a second task causes the
   * first task to revert to its original position.
   *
   * To prevent re-render storms during drag:
   * 1. The onChange callback is only called AFTER drag completes (mouseUp)
   * 2. During drag, only the dragged TaskRow re-renders (due to its internal state)
   * 3. Other TaskRows don't re-render because their props haven't changed
   *
   * The React.memo comparison in TaskRow excludes onChange from comparison,
   * relying on the fact that onChange fires only after drag completes.
   */
  const handleTaskChange = useCallback((updatedTask: Task) => {
    // Find original task to detect date changes
    const originalTask = tasks.find(t => t.id === updatedTask.id);
    if (!originalTask) {
      onChange?.((currentTasks) => currentTasks.map(t => t.id === updatedTask.id ? updatedTask : t));
      // Clear editingTaskId after name edit completes
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
      // Dates didn't change, but progress or other fields might have
      // Check if this task has a parent and update parent progress if needed
      const taskParentId = (updatedTask as any).parentId;
      if (taskParentId) {
        onChange?.((currentTasks) => {
          let finalTasks = currentTasks.map(t => t.id === updatedTask.id ? updatedTask : t);
          // Update parent progress
          const newProgress = computeParentProgress(taskParentId, finalTasks);
          finalTasks = finalTasks.map(t =>
            t.id === taskParentId
              ? { ...t, progress: newProgress }
              : t
          );
          return finalTasks;
        });
      } else {
        onChange?.((currentTasks) => currentTasks.map(t => t.id === updatedTask.id ? updatedTask : t));
      }
      // Clear editingTaskId after name edit completes
      if (editingTaskId === updatedTask.id) {
        setEditingTaskId(null);
      }
      return;
    }

    let cascadedTasksForCallback: Task[];

    if (disableConstraints) {
      cascadedTasksForCallback = [updatedTask];
    } else {
      const cascadedChain = cascadeByLinks(updatedTask.id, newStart, newEnd, tasks);
      cascadedTasksForCallback = [updatedTask, ...cascadedChain];
    }

    // Apply changes
    if (disableConstraints) {
      onChange?.((currentTasks) => currentTasks.map(t => t.id === updatedTask.id ? updatedTask : t));
    } else {
      onChange?.((currentTasks) => {
        const m = new Map(cascadedTasksForCallback.map(t => [t.id, t]));

        // Phase 19: Update parent dates when child task changes
        // For each updated task, check if it has a parent and update parent dates
        let finalTasks = currentTasks.map(t => m.get(t.id) ?? t);

        // Collect parent IDs that need updating
        const parentIdsToUpdate = new Set<string>();
        cascadedTasksForCallback.forEach(task => {
          if ((task as any).parentId) {
            parentIdsToUpdate.add((task as any).parentId);
          }
        });

        // Update each parent's dates and progress
        parentIdsToUpdate.forEach(parentId => {
          const newDates = computeParentDates(parentId, finalTasks);
          const newProgress = computeParentProgress(parentId, finalTasks);
          finalTasks = finalTasks.map(t =>
            t.id === parentId
              ? { ...t, startDate: newDates.startDate.toISOString().split('T')[0], endDate: newDates.endDate.toISOString().split('T')[0], progress: newProgress }
              : t
          );
        });

        return finalTasks;
      });
      onCascade?.(cascadedTasksForCallback);
    }
  }, [tasks, onChange, disableConstraints, onCascade, editingTaskId]);

  /**
   * Handle task deletion: purge deleted taskId from all other tasks' dependency arrays,
   * emit onChange with cleaned tasks, then emit onDelete with the taskId.
   * For parent tasks, cascade delete to all children.
   */
  const handleDelete = useCallback((taskId: string) => {
    onChange?.((currentTasks) => {
      // Collect all tasks to delete (parent + descendants)
      const toDelete = new Set<string>([taskId]);

      function collectDescendants(parentId: string) {
        const children = getChildren(parentId, currentTasks);
        children.forEach(child => {
          toDelete.add(child.id);
          collectDescendants(child.id);
        });
      }

      collectDescendants(taskId);

      // Filter out deleted tasks
      const filteredTasks = currentTasks.filter(t => !toDelete.has(t.id));

      // Clean dependencies pointing to deleted tasks
      const cleanedTasks = filteredTasks.map(task => {
        if (!task.dependencies) return task;
        return {
          ...task,
          dependencies: task.dependencies.filter(dep => !toDelete.has(dep.taskId))
        };
      });

      return cleanedTasks;
    });
    onDelete?.(taskId);
  }, [onChange, onDelete]);

  /**
   * Handle task insertion: set editingTaskId to trigger auto-edit mode,
   * then notify external consumer via onInsertAfter callback.
   *
   * NOTE: The external onInsertAfter callback is responsible for adding
   * the task to the tasks array via onChange.
   */
  const handleInsertAfter = useCallback((taskId: string, newTask: Task) => {
    setEditingTaskId(newTask.id);
    onInsertAfter?.(taskId, newTask);
  }, [onInsertAfter]);

  /**
   * Handle task reordering: notify external consumer via onChange and onReorder callbacks.
   *
   * NOTE: onChange receives the full reordered array directly (not a functional updater).
   * Reordering is always a full replacement, never a diff.
   *
   * Extended signature: also accepts movedTaskId and inferredParentId for smart hierarchy.
   */
  const handleReorder = useCallback((reorderedTasks: Task[], movedTaskId?: string, inferredParentId?: string) => {
    onChange?.((currentTasks) => {
      let updated = reorderedTasks;
      if (movedTaskId && inferredParentId !== undefined) {
        updated = updated.map(t =>
          t.id === movedTaskId
            ? { ...t, parentId: inferredParentId || undefined }
            : t
        );
      }
      return updated;
    });
    onReorder?.(reorderedTasks);
  }, [onChange, onReorder]);

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
   * Handle cascade completion — updates all shifted tasks via onChange (functional updater)
   * and notifies the external onCascade consumer.
   */
  const handleCascade = useCallback((cascadedTasks: Task[]) => {
    // Update state by merging cascaded tasks into current tasks
    onChange?.((currentTasks) => {
      const cascadeMap = new Map(cascadedTasks.map(t => [t.id, t]));
      let finalTasks = currentTasks.map(t => cascadeMap.get(t.id) ?? t);

      // Update parent dates for any cascaded tasks that have parents
      // Collect parent IDs that need updating
      const parentIdsToUpdate = new Set<string>();
      cascadedTasks.forEach(task => {
        if ((task as any).parentId) {
          parentIdsToUpdate.add((task as any).parentId);
        }
      });

      // Update each parent's dates and progress
      parentIdsToUpdate.forEach(parentId => {
        const newDates = computeParentDates(parentId, finalTasks);
        const newProgress = computeParentProgress(parentId, finalTasks);
        finalTasks = finalTasks.map(t =>
          t.id === parentId
            ? { ...t, startDate: newDates.startDate.toISOString().split('T')[0], endDate: newDates.endDate.toISOString().split('T')[0], progress: newProgress }
            : t
        );
      });

      return finalTasks;
    });
    // Notify external consumer
    onCascade?.(cascadedTasks);
  }, [onChange, onCascade]);

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
    onChange?.((currentTasks) => {
      return currentTasks.map(t => {
        if (t.id === taskId && (t as any).parentId) {
          // Remove parentId to promote to root level
          return { ...t, parentId: undefined };
        }
        return t;
      });
    });
  }, [onChange]);

  const handleDemoteTask = useCallback((taskId: string, newParentId: string) => {
    onChange?.((currentTasks) => {
      // Check for circular hierarchy
      const wouldCreateCircular = (targetId: string, parentId: string, tasks: Task[]): boolean => {
        if (targetId === parentId) return true; // Can't be own parent

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

      if (wouldCreateCircular(taskId, newParentId, currentTasks)) {
        // Circular hierarchy detected, return unchanged
        return currentTasks;
      }

      // Remove any existing dependencies between the two tasks
      let updatedTasks = removeDependenciesBetweenTasks(taskId, newParentId, currentTasks);

      // Apply parentId change
      updatedTasks = updatedTasks.map(t => {
        if (t.id === taskId) {
          // Set parentId to demote under new parent
          return { ...t, parentId: newParentId };
        }
        return t;
      });

      // Compute and apply parent dates from all children
      const parentDates = computeParentDates(newParentId, updatedTasks);
      const parentProgress = computeParentProgress(newParentId, updatedTasks);

      updatedTasks = updatedTasks.map(t =>
        t.id === newParentId
          ? { ...t, startDate: parentDates.startDate.toISOString().split('T')[0], endDate: parentDates.endDate.toISOString().split('T')[0], progress: parentProgress }
          : t
      );

      return updatedTasks;
    });
  }, [onChange]);

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
            tasks={tasks}
            rowHeight={rowHeight}
            headerHeight={headerHeight}
            taskListWidth={taskListWidth}
            onTaskChange={handleTaskChange}
            selectedTaskId={selectedTaskId ?? undefined}
            onTaskSelect={handleTaskSelect}
            show={showTaskList}
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
            onPromoteTask={handlePromoteTask}
            onDemoteTask={handleDemoteTask}
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
            tasks={tasks}
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
              onChange={handleTaskChange}
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
              allTasks={tasks}
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
