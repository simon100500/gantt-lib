'use client';

import React, { useMemo, useCallback, useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { getMultiMonthDays, createCustomDayPredicate, parseUTCDate, type CustomDayConfig, type CustomDayPredicateConfig } from '../../utils/dateUtils';
import { calculateGridWidth } from '../../utils/geometry';
import { validateDependencies, cascadeByLinks, universalCascade, computeParentDates, computeParentProgress, getChildren, removeDependenciesBetweenTasks, isTaskParent } from '../../core/scheduling';
import { normalizeHierarchyTasks } from '../../utils/hierarchyOrder';
import type {
  ResourceTableColumnWidthMap,
  ResourcePlannerChartProps,
  ResourceTimelineItem,
  ResourceTimelineMove,
  ResourceTimelineResource,
  ResourceTimelineResourceMenuCommand,
  TimelineMarker,
  TaskDateChangeMode,
  ValidationResult,
} from '../../types';
import { TaskPredicate } from '../../filters';
import type { TaskListColumn, TaskListColumnId, TaskListColumnWidthMap } from '../TaskList/columns/types';
import TimeScaleHeader from '../TimeScaleHeader';
import TaskRow from '../TaskRow';
import TodayIndicator from '../TodayIndicator';
import TimelineMarkers from '../TimelineMarkers';
import GridBackground from '../GridBackground';
import DragGuideLines from '../DragGuideLines/DragGuideLines';
import { DependencyLines } from '../DependencyLines';
import { TaskList } from '../TaskList';
import { ResourceTimelineChart } from '../ResourceTimelineChart';
import { TableMatrix, type TableMatrixCellClickContext, type TableMatrixColumn, type TableMatrixColumnGroup, type TableMatrixDateOverlay } from '../TableMatrix';
import { printGanttChart } from './print';
import { createTaskPreviewPositionStore, type TaskPreviewPositionStore } from './previewStore';
import './GanttChart.css';

const SCROLL_TO_ROW_CONTEXT_ROWS = 2;
const TASK_ROW_OVERSCAN = 24;
const INITIAL_VIEWPORT_HEIGHT_FALLBACK = 800;
const HORIZONTAL_OVERSCAN_VIEWPORT_MULTIPLIER = 0.5;
const HORIZONTAL_SCROLL_STATE_BUCKET_PX = 64;

function arePositionMapsEqual(
  left: Map<string, { left: number; width: number }>,
  right: Map<string, { left: number; width: number }>
): boolean {
  if (left.size !== right.size) return false;

  for (const [taskId, leftPosition] of left) {
    const rightPosition = right.get(taskId);
    if (!rightPosition) return false;
    if (leftPosition.left !== rightPosition.left || leftPosition.width !== rightPosition.width) {
      return false;
    }
  }

  return true;
}

function arePreviewTaskMapsEqual(left: Map<string, Task>, right: Map<string, Task>): boolean {
  if (left.size !== right.size) return false;

  for (const [taskId, leftTask] of left) {
    const rightTask = right.get(taskId);
    if (!rightTask) return false;
    if (leftTask.startDate !== rightTask.startDate || leftTask.endDate !== rightTask.endDate) {
      return false;
    }

    const leftDependencies = leftTask.dependencies ?? [];
    const rightDependencies = rightTask.dependencies ?? [];
    if (leftDependencies.length !== rightDependencies.length) {
      return false;
    }

    for (let index = 0; index < leftDependencies.length; index += 1) {
      const leftDependency = leftDependencies[index];
      const rightDependency = rightDependencies[index];
      if (
        leftDependency.taskId !== rightDependency.taskId ||
        leftDependency.type !== rightDependency.type ||
        leftDependency.lag !== rightDependency.lag
      ) {
        return false;
      }
    }
  }

  return true;
}

export type {
  GanttChartMode,
  ResourcePlannerChartProps,
  ResourceTableColumnWidthMap,
  ResourceTimelineItem,
  ResourceTimelineMove,
  ResourceTimelineResource,
  ResourceTimelineResourceMenuCommand,
  TimelineMarker,
} from '../../types';

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
  /** Optional baseline start date for planned schedule visualization */
  baselineStartDate?: string | Date;
  /** Optional baseline end date for planned schedule visualization */
  baselineEndDate?: string | Date;
  /** Optional color for task bar visualization */
  color?: string;
  /**
   * Optional task subtype. Milestones are single-date tasks and default to
   * regular 'task' behavior when omitted.
   */
  type?: 'task' | 'milestone';
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

export interface TaskListMenuCommand<TTask extends Task = Task> {
  /** Stable command id for React keys and consumer bookkeeping */
  id: string;
  /** Visible label in the three-dots menu */
  label: string;
  /** Optional icon rendered before the label */
  icon?: React.ReactNode;
  /** Command handler receives the current task row */
  onSelect: (row: TTask) => void;
  /** Optional per-row visibility predicate */
  isVisible?: (row: TTask) => boolean;
  /** Optional per-row disabled predicate */
  isDisabled?: (row: TTask) => boolean;
  /** Scope of the command in the hierarchy: all rows, parent/group rows, regular linear rows, or milestones */
  scope?: 'all' | 'group' | 'linear' | 'milestone';
  /** Optional visual divider before or after the command */
  divider?: 'top' | 'bottom';
  /** Marks the command with danger styling */
  danger?: boolean;
  /** Close the menu after click (default: true) */
  closeOnSelect?: boolean;
}

interface TaskChartSharedProps<TTask extends Task = Task> {
  /** Array of tasks to display */
  tasks: TTask[];
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
  /** Show baseline lines below task bars when baseline dates are present (default: false) */
  showBaseline?: boolean;
  /** Callback when a new task is added via the task list */
  onAdd?: (task: TTask) => void;
  /** Callback when a task is deleted via the task list */
  onDelete?: (taskId: string) => void;
  /** Callback when a new task is inserted after a specific task via the task list */
  onInsertAfter?: (taskId: string, newTask: TTask) => void;
  /** Callback when tasks are reordered via drag in the task list */
  onReorder?: (tasks: TTask[], movedTaskId?: string, inferredParentId?: string) => void;
  /** Disable row reorder and drag handle inside the task list (default: false) */
  disableTaskListReorder?: boolean;
  /** Callback when a task is promoted (parentId removed). If not provided, default internal logic is used. */
  onPromoteTask?: (taskId: string) => void;
  /** Callback when a task is demoted (parentId set). If not provided, default internal logic is used. */
  onDemoteTask?: (taskId: string, newParentId: string) => void;
  /** Callback when a parent task is ungrouped while direct children move one level up and the parent remains. */
  onUngroupTask?: (taskId: string) => void;
  /** Enable add task button at bottom of task list (default: true) */
  enableAddTask?: boolean;
  /** Default duration for newly created tasks, interpreted in the active day mode (default: 5). */
  defaultTaskDurationDays?: number;
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
  /** Enable a leading checkbox column for multi-selecting task rows (default: false) */
  enableTaskMultiSelect?: boolean;
  /** Controlled selected task IDs for multi-select mode */
  selectedTaskIds?: Set<string>;
  /** Callback when multi-selected task IDs change */
  onSelectedTaskIdsChange?: (taskIds: Set<string>) => void;
  /** Disable task drag and resize on the calendar grid (default: false) */
  disableTaskDrag?: boolean;
  /** Show calendar chart area (default: true) */
  showChart?: boolean;
  /** Optional vertical timeline markers such as deadlines and checkpoints. */
  timelineMarkers?: TimelineMarker[];
  /** Additional custom columns to render in the TaskList after built-in columns */
  additionalColumns?: TaskListColumn<TTask>[];
  /** Built-in or custom TaskList column IDs to hide after column placement is resolved */
  hiddenTaskListColumns?: readonly TaskListColumnId[];
  /** Initial or controlled TaskList column widths keyed by built-in/custom column id. */
  taskListColumnWidths?: TaskListColumnWidthMap;
  /** Called when the user resizes TaskList columns. */
  onTaskListColumnWidthsChange?: (widths: TaskListColumnWidthMap) => void;
  /** Additional commands rendered in the TaskList row three-dots menu */
  taskListMenuCommands?: TaskListMenuCommand<TTask>[];
  /** Hide row action controls in the TaskList for table-like read/edit presentations. */
  hideTaskListRowActions?: boolean;
  /** Returns an extra CSS class name for a TaskList row. */
  getTaskListRowClassName?: (task: TTask) => string | undefined;
  /** Global number of text lines the row height should accommodate in table-like presentations. */
  rowContentLines?: number;
  /** How task-list date pickers apply start/end edits (default: preserve-duration) */
  taskDateChangeMode?: TaskDateChangeMode;
  /** Controlled callback for task-list date picker mode changes */
  onTaskDateChangeModeChange?: (mode: TaskDateChangeMode) => void;
}

export interface GanttModeProps<TTask extends Task = Task> extends TaskChartSharedProps<TTask> {
  /** Omitted mode keeps the historical task-based gantt behavior. */
  mode?: 'gantt';
  /** Width of each day column in pixels (default: 40) */
  dayWidth?: number;
  /** View mode: 'day' renders one column per day, 'week' renders one column per 7 days, 'month' renders one column per month (default: 'day') */
  viewMode?: 'day' | 'week' | 'month';
  /** Custom day configurations with explicit type (weekend or workday) */
  customDays?: CustomDayConfig[];
  /** Optional base weekend predicate (checked before customDays overrides) */
  isWeekend?: (date: Date) => boolean;
  /** Считать duration в рабочих днях, исключая выходные (default: true) */
  businessDays?: boolean;
}

export interface TableMatrixModeProps<TTask extends Task = Task> extends TaskChartSharedProps<TTask> {
  mode: 'table-matrix';
  /** Width of the arbitrary right-side matrix columns. */
  matrixColumns: Array<TableMatrixColumn<TTask>>;
  /** Optional grouped header row above matrix columns (e.g. months over weekly columns). */
  matrixColumnGroups?: Array<TableMatrixColumnGroup>;
  /** Called when any data cell in the right-side matrix is clicked. */
  onMatrixCellClick?: (context: TableMatrixCellClickContext<TTask>) => void;
  /** Optional actual-date overlay rendered under matrix cell content for date-ranged columns. */
  matrixDateOverlay?: TableMatrixDateOverlay<TTask> | false;
}

export type GanttChartProps<
  TTask extends Task = Task,
  TItem extends ResourceTimelineItem = ResourceTimelineItem,
> = GanttModeProps<TTask> | TableMatrixModeProps<TTask> | ResourcePlannerChartProps<TItem>;

export interface ExportToPdfOptions {
  /** Structured header displayed above the exported chart */
  header?: ExportToPdfHeaderOptions;
  /** Suggested file name for the print document title (browser may use it for PDF default name) */
  fileName?: string;
  /** Explicit print document title used for the browser print/PDF window title */
  documentTitle?: string;
  /** Human-readable document title rendered above the exported chart */
  title?: string;
  /** Optional PDF page orientation hint for the browser print layout */
  orientation?: 'portrait' | 'landscape';
  /** Include the task list area in the exported document (default: mirrors current chart config) */
  includeTaskList?: boolean;
  /** Include the timeline/chart area in the exported document (default: mirrors current chart config) */
  includeChart?: boolean;
}

export interface ExportToPdfHeaderOptions {
  /** Optional logo image URL or data URI displayed on the left */
  logoUrl?: string;
  /** Optional link for the logo */
  logoHref?: string;
  /** Service/product name displayed in the header */
  serviceName?: string;
  /** Optional link for the service name */
  serviceHref?: string;
  /** Project/document name displayed under or next to the service name */
  projectName?: string;
  /** Export date shown on the right; string is rendered as-is */
  exportDate?: string | Date;
}

export interface ScrollToRowOptions {
  /** Keep built-in row selection styling after scroll (default: true) */
  select?: boolean;
  /** Browser scroll behavior for the vertical scroll action (default: 'smooth') */
  behavior?: ScrollBehavior;
  /** Automatically clear built-in row selection after N milliseconds */
  clearSelectionAfterMs?: number;
}

/**
 * Ref handle type for GanttChart — exposes imperative scroll methods.
 */
export interface GanttChartHandle {
  scrollToToday: () => void;
  scrollToTask: (taskId: string) => void;
  scrollToRow: (taskId: string, options?: ScrollToRowOptions) => void;
  collapseAll: () => void;
  expandAll: () => void;
  exportToPdf: (options?: ExportToPdfOptions) => Promise<void>;
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
function GanttChartInner<
  TTask extends Task = Task,
  TItem extends ResourceTimelineItem = ResourceTimelineItem,
>(
  props: GanttChartProps<TTask, TItem>,
  ref: React.ForwardedRef<GanttChartHandle>
) {
  if (props.mode === 'resource-planner') {
    return <ResourceTimelineChart {...props} />;
  }

  return (
    <TaskGanttChart
      {...props}
      ref={ref}
    />
  );
}

function TaskGanttChartInner<TTask extends Task = Task>(
  props: GanttModeProps<TTask> | TableMatrixModeProps<TTask>,
  ref: React.ForwardedRef<GanttChartHandle>
) {
  const isTableMatrixMode = props.mode === 'table-matrix';
  const {
    tasks,
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
    showBaseline = false,
    onAdd,
    onDelete,
    onInsertAfter,
    onReorder,
    disableTaskListReorder = false,
    onPromoteTask,
    onDemoteTask,
    onUngroupTask,
    enableAddTask = true,
    defaultTaskDurationDays,
    taskFilter,
    filterMode = 'highlight',
    collapsedParentIds: externalCollapsedParentIds,
    onToggleCollapse: externalOnToggleCollapse,
    highlightedTaskIds,
    enableTaskMultiSelect = false,
    selectedTaskIds,
    onSelectedTaskIdsChange,
    disableTaskDrag = false,
    showChart = true,
    timelineMarkers,
    additionalColumns,
    hiddenTaskListColumns,
    taskListColumnWidths,
    onTaskListColumnWidthsChange,
    taskListMenuCommands,
    hideTaskListRowActions = false,
    getTaskListRowClassName,
    rowContentLines = 1,
    taskDateChangeMode: externalTaskDateChangeMode,
    onTaskDateChangeModeChange: externalOnTaskDateChangeModeChange,
  } = props;
  const dayWidth = !isTableMatrixMode ? props.dayWidth ?? 40 : 40;
  const viewMode = !isTableMatrixMode ? props.viewMode ?? 'day' : 'day';
  const customDays = !isTableMatrixMode ? props.customDays : undefined;
  const isWeekend = !isTableMatrixMode ? props.isWeekend : undefined;
  const businessDays = !isTableMatrixMode ? props.businessDays ?? true : true;
  const matrixColumns = isTableMatrixMode ? props.matrixColumns : [];
  const matrixColumnGroups = isTableMatrixMode ? props.matrixColumnGroups : undefined;
  const onMatrixCellClick = isTableMatrixMode ? props.onMatrixCellClick : undefined;
  const matrixDateOverlay = isTableMatrixMode ? props.matrixDateOverlay : undefined;
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollContentRef = useRef<HTMLDivElement>(null);
  const clearSelectedTaskTimeoutRef = useRef<number | null>(null);
  const hasAutoScrolledToTodayRef = useRef(false);
  const isPanningRef = useRef(false);
  const forceViewportSyncRef = useRef<(() => void) | null>(null);
  const previewPositionStoreRef = useRef<TaskPreviewPositionStore | null>(null);
  const renderedTaskIdsRef = useRef<Set<string>>(new Set());
  if (previewPositionStoreRef.current === null) {
    previewPositionStoreRef.current = createTaskPreviewPositionStore();
  }
  const previewPositionStore = previewPositionStoreRef.current;

  // Track selected task ID for highlighting in both TaskList and TaskRow
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskListHasRightShadow, setTaskListHasRightShadow] = useState(false);
  const [internalTaskDateChangeMode, setInternalTaskDateChangeMode] = useState<TaskDateChangeMode>('preserve-duration');
  const [scrollViewport, setScrollViewport] = useState({
    scrollTopRowIndex: 0,
    scrollLeft: 0,
    viewportHeight: 0,
    viewportWidth: 0,
  });

  // Track selected dep chip for arrow highlighting in DependencyLines
  const [selectedChip, setSelectedChip] = useState<{ successorId: string; predecessorId: string; linkType: string } | null>(null);
  const [activeTimelineTooltip, setActiveTimelineTooltip] = useState<{ label: string; left: number; color: string } | null>(null);

  // Hierarchy state: collapsed parent IDs (uncontrolled mode - internal state)
  const [internalCollapsedParentIds, setInternalCollapsedParentIds] = useState<Set<string>>(new Set());

  // Use external collapsedParentIds if provided (controlled mode), otherwise use internal state
  const collapsedParentIds = externalCollapsedParentIds ?? internalCollapsedParentIds;

  // Track editing task ID for auto-edit mode after insert
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const taskDateChangeMode = externalTaskDateChangeMode ?? internalTaskDateChangeMode;
  const handleTaskDateChangeMode = externalOnTaskDateChangeModeChange ?? setInternalTaskDateChangeMode;
  const resolvedRowContentLines = Math.max(1, Math.floor(rowContentLines));
  const effectiveRowHeight = useMemo(
    () => Math.max(rowHeight, 10 + resolvedRowContentLines * 18),
    [resolvedRowContentLines, rowHeight]
  );

  const normalizedTasks = useMemo(() => normalizeHierarchyTasks(tasks), [tasks]);
  const directChildCountByTaskId = useMemo(() => {
    const counts = new Map<string, number>();
    for (const task of normalizedTasks) {
      if (!task.parentId) continue;
      counts.set(task.parentId, (counts.get(task.parentId) ?? 0) + 1);
    }
    return counts;
  }, [normalizedTasks]);

  // Create custom weekend predicate from props (memoized for performance)
  const isCustomWeekend = useMemo(
    () => createCustomDayPredicate({ customDays, isWeekend }),
    [customDays, isWeekend]
  );

  // When baseline is visible, expand the visible range to include baseline dates too.
  const dateRangeTasks = useMemo(() => {
    if (!showBaseline) {
      return normalizedTasks;
    }

    return normalizedTasks.map(task => ({
      ...task,
      startDate: task.baselineStartDate && parseUTCDate(task.baselineStartDate).getTime() < parseUTCDate(task.startDate).getTime()
        ? task.baselineStartDate
        : task.startDate,
      endDate: task.baselineEndDate && parseUTCDate(task.baselineEndDate).getTime() > parseUTCDate(task.endDate).getTime()
        ? task.baselineEndDate
        : task.endDate,
    }));
  }, [normalizedTasks, showBaseline]);

  // Calculate multi-month date range from normalized tasks
  const dateRange = useMemo(() => getMultiMonthDays(dateRangeTasks), [dateRangeTasks]);

  // Track dependency validation results
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const cycleTaskIds = useMemo(() => {
    const cycleError = validationResult?.errors.find(error => error.type === 'cycle');
    return new Set(cycleError?.relatedTaskIds ?? []);
  }, [validationResult]);

  // Cascade override positions for dependency lines. Task bars subscribe to previewPositionStore directly.
  const [cascadeOverrides, setCascadeOverrides] = useState<Map<string, { left: number; width: number }>>(new Map());

  // Calculate grid width
  const gridWidth = useMemo(
    () => Math.round(dateRange.length * dayWidth),
    [dateRange.length, dayWidth]
  );
  const horizontalWindow = useMemo(() => {
    if (isTableMatrixMode || gridWidth <= 0 || scrollViewport.viewportWidth <= 0) {
      return undefined;
    }

    const chartStartOffset = showTaskList ? taskListWidth : 0;
    const overscan = Math.max(dayWidth, Math.round(scrollViewport.viewportWidth * HORIZONTAL_OVERSCAN_VIEWPORT_MULTIPLIER));
    const visibleStart = scrollViewport.scrollLeft - chartStartOffset;
    const visibleEnd = visibleStart + scrollViewport.viewportWidth;

    return {
      startPx: Math.max(0, Math.floor(visibleStart - overscan)),
      endPx: Math.min(gridWidth, Math.ceil(visibleEnd + overscan)),
    };
  }, [
    dayWidth,
    gridWidth,
    isTableMatrixMode,
    scrollViewport.scrollLeft,
    scrollViewport.viewportWidth,
    showTaskList,
    taskListWidth,
  ]);
  const matrixWidth = useMemo(
    () => matrixColumns.reduce<number | undefined>((sum, column) => {
      if (typeof column.width !== 'number') return undefined;
      return sum !== undefined ? sum + column.width : undefined;
    }, 0),
    [matrixColumns]
  );

  // Visible tasks are determined by collapsed parent state and optionally by filter mode.
  // Checks the full ancestor chain so grandchildren are hidden when any ancestor is collapsed.
  const { visibleTasks, visibleTaskIndexMap } = useMemo(() => {
    const parentMap = new Map(normalizedTasks.map(t => [t.id, t.parentId]));

    function isAnyAncestorCollapsed(parentId: string | undefined): boolean {
      let current = parentId;
      while (current) {
        if (collapsedParentIds.has(current)) return true;
        current = parentMap.get(current);
      }
      return false;
    }

    const tasks: TTask[] = [];

    for (const task of normalizedTasks) {
      if (isAnyAncestorCollapsed(task.parentId)) {
        continue;
      }

      // In 'hide' mode with active filter, only show matching tasks
      if (filterMode === 'hide' && taskFilter && !taskFilter(task)) {
        continue;
      }

      tasks.push(task);
    }

    return {
      visibleTasks: tasks,
      visibleTaskIndexMap: new Map(tasks.map((task, index) => [task.id, index])),
    };
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
    () => visibleTasks.length * effectiveRowHeight,
    [effectiveRowHeight, visibleTasks.length]
  );
  // TimeScaleHeader is headerHeight tall; the wrapper owns the bottom grid border.
  const timelineHeaderHeight = headerHeight + 1;
  const tableBodyMinHeight = useMemo(() => {
    if (!isTableMatrixMode || containerHeight === undefined) {
      return undefined;
    }

    if (typeof containerHeight === 'number') {
      return Math.max(0, containerHeight - timelineHeaderHeight);
    }

    return `calc(${containerHeight} - ${timelineHeaderHeight}px)`;
  }, [containerHeight, isTableMatrixMode, timelineHeaderHeight]);

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

  const visibleTimelineMarkers = useMemo(() => {
    if (isTableMatrixMode || !timelineMarkers || timelineMarkers.length === 0 || dateRange.length === 0) {
      return [];
    }

    const rangeStartMs = dateRange[0].getTime();
    const rangeEndMs = dateRange[dateRange.length - 1].getTime();

    return timelineMarkers.filter(marker => {
      const markerDate = parseUTCDate(marker.date).getTime();
      return markerDate >= rangeStartMs && markerDate <= rangeEndMs;
    });
  }, [dateRange, isTableMatrixMode, timelineMarkers]);

  // Center chart on today's date on initial mount
  useEffect(() => {
    if (isTableMatrixMode) return;
    if (hasAutoScrolledToTodayRef.current) return;
    const container = scrollContainerRef.current;
    if (!container || dateRange.length === 0) return;

    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const todayIndex = dateRange.findIndex(day => day.getTime() === today.getTime());

    if (todayIndex === -1) return;

    // Position today at ~30% of visible area (closer to task list side)
    const todayOffset = todayIndex * dayWidth;
    const containerWidth = container.clientWidth;
    const scrollLeft = Math.round(todayOffset + (dayWidth / 2) - containerWidth * 0.3);

    container.scrollLeft = Math.max(0, scrollLeft);
    hasAutoScrolledToTodayRef.current = true;
  }, [dateRange, dayWidth, isTableMatrixMode]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let frameId: number | null = null;
    let forceHorizontalSync = false;
    const updateViewport = () => {
      frameId = null;
      const shouldForceHorizontalSync = forceHorizontalSync;
      forceHorizontalSync = false;
      const nextHasRightShadow = container.scrollLeft > 0;
      const nextViewportHeight = Math.max(0, container.clientHeight - timelineHeaderHeight);
      const nextScrollTopRowIndex = Math.max(0, Math.floor(container.scrollTop / effectiveRowHeight));
      const measuredScrollLeft = Math.floor(container.scrollLeft / HORIZONTAL_SCROLL_STATE_BUCKET_PX) * HORIZONTAL_SCROLL_STATE_BUCKET_PX;
      const nextViewportWidth = container.clientWidth;

      setTaskListHasRightShadow((previous) =>
        previous === nextHasRightShadow ? previous : nextHasRightShadow
      );
      setScrollViewport((previous) =>
      {
        const nextScrollLeft = isPanningRef.current && !shouldForceHorizontalSync
          ? previous.scrollLeft
          : measuredScrollLeft;

        return previous.scrollTopRowIndex === nextScrollTopRowIndex &&
          previous.scrollLeft === nextScrollLeft &&
          previous.viewportHeight === nextViewportHeight &&
          previous.viewportWidth === nextViewportWidth
            ? previous
            : {
              scrollTopRowIndex: nextScrollTopRowIndex,
              scrollLeft: nextScrollLeft,
              viewportHeight: nextViewportHeight,
              viewportWidth: nextViewportWidth,
            };
      });
    };

    const scheduleUpdate = (forceHorizontal: boolean = false) => {
      forceHorizontalSync = forceHorizontalSync || forceHorizontal;
      if (frameId !== null) return;
      frameId = window.requestAnimationFrame(updateViewport);
    };
    const scheduleRegularUpdate = () => scheduleUpdate(false);
    forceViewportSyncRef.current = () => scheduleUpdate(true);

    scheduleUpdate();
    container.addEventListener('scroll', scheduleRegularUpdate, { passive: true });
    window.addEventListener('resize', scheduleRegularUpdate);

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => {
          scheduleRegularUpdate();
        })
      : null;
    resizeObserver?.observe(container);

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
      forceViewportSyncRef.current = null;
      resizeObserver?.disconnect();
      container.removeEventListener('scroll', scheduleRegularUpdate);
      window.removeEventListener('resize', scheduleRegularUpdate);
    };
  }, [effectiveRowHeight, timelineHeaderHeight]);

  /**
   * Scroll to today's date when the "Today" button is clicked
   */
  const scrollToToday = useCallback(() => {
    if (isTableMatrixMode) return;
    const container = scrollContainerRef.current;
    if (!container || dateRange.length === 0) return;

    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const todayIndex = dateRange.findIndex(day => day.getTime() === today.getTime());

    if (todayIndex === -1) return;

    // Position today at ~30% of visible area (closer to task list side)
    const todayOffset = todayIndex * dayWidth;
    const containerWidth = container.clientWidth;
    const scrollLeft = Math.round(todayOffset + (dayWidth / 2) - containerWidth * 0.3);

    container.scrollTo({ left: Math.max(0, scrollLeft), behavior: 'smooth' });
  }, [dateRange, dayWidth, isTableMatrixMode]);

  /**
   * Scroll to a specific task by ID, centering its start date horizontally in the grid.
   */
  const scrollToTask = useCallback((taskId: string) => {
    if (isTableMatrixMode) {
      const container = scrollContainerRef.current;
      if (!container) return;

      const rowIndex = visibleTasks.findIndex((visibleTask) => visibleTask.id === taskId);
      if (rowIndex === -1) return;

      const paddedRowIndex = Math.max(0, rowIndex - SCROLL_TO_ROW_CONTEXT_ROWS);
      container.scrollTo({ top: Math.max(0, effectiveRowHeight * paddedRowIndex), behavior: 'smooth' });
      setSelectedTaskId(taskId);
      return;
    }
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
  }, [dateRange, dayWidth, effectiveRowHeight, isTableMatrixMode, tasks, visibleTasks]);

  const scrollToRow = useCallback((taskId: string, options: ScrollToRowOptions = {}) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const rowIndex = visibleTasks.findIndex(visibleTask => visibleTask.id === task.id);
    if (rowIndex === -1) return;

    const paddedRowIndex = Math.max(0, rowIndex - SCROLL_TO_ROW_CONTEXT_ROWS);
    const scrollTop = Math.max(0, effectiveRowHeight * paddedRowIndex);
    const {
      select = true,
      behavior = 'smooth',
      clearSelectionAfterMs,
    } = options;

    if (clearSelectedTaskTimeoutRef.current !== null) {
      window.clearTimeout(clearSelectedTaskTimeoutRef.current);
      clearSelectedTaskTimeoutRef.current = null;
    }

    if (select) {
      setSelectedTaskId(taskId);
      if (typeof clearSelectionAfterMs === 'number' && clearSelectionAfterMs >= 0) {
        clearSelectedTaskTimeoutRef.current = window.setTimeout(() => {
          setSelectedTaskId((current) => (current === taskId ? null : current));
          clearSelectedTaskTimeoutRef.current = null;
        }, clearSelectionAfterMs);
      }
    }

    container.scrollTo({ top: scrollTop, behavior });
  }, [effectiveRowHeight, tasks, visibleTasks]);

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

  useEffect(() => () => {
    if (clearSelectedTaskTimeoutRef.current !== null) {
      window.clearTimeout(clearSelectedTaskTimeoutRef.current);
    }
    previewPositionStore.clear();
  }, [previewPositionStore]);

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

    // Date edits should behave the same across chart drag and task-list picker:
    // moving a parent shifts its descendants, and parent dates are then re-derived
    // from the shifted children inside universalCascade.
    const sourceTasks = tasks.map((task) => (
      task.id === updatedTask.id ? updatedTask : task
    ));

    const cascadedTasks = disableConstraints
      ? [updatedTask]
      : universalCascade(updatedTask, newStart, newEnd, sourceTasks, businessDays, isCustomWeekend);

    onTasksChange?.(cascadedTasks as TTask[]);
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
   * Handle task insertion after inline draft confirmation.
   * The task name is already confirmed inside TaskList, so no auto-edit is needed here.
   */
  const handleInsertAfter = useCallback((taskId: string, newTask: Task) => {
    onInsertAfter?.(taskId, newTask as TTask);
  }, [onInsertAfter]);

  /**
   * Handle task reordering.
   *
   * Preferred path: emit a single onReorder callback with the full normalized task array.
   * Backward-compatibility path: if onReorder is not provided, fall back to onTasksChange.
   *
   * This avoids duplicate reorder notifications for consumers that already opted into
   * the dedicated reorder API while preserving legacy consumers that only listen to
   * onTasksChange.
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
    if (onReorder) {
      onReorder(normalized as TTask[], movedTaskId, inferredParentId);
      return;
    }

    onTasksChange?.(normalized as TTask[]);
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
    previewPositionStore.setPositions(overrides);
    const renderedTaskIds = renderedTaskIdsRef.current;
    const renderedOverrides = new Map<string, { left: number; width: number }>();
    for (const [taskId, position] of overrides) {
      if (renderedTaskIds.has(taskId)) {
        renderedOverrides.set(taskId, position);
      }
    }

    setCascadeOverrides((current) => (
      arePositionMapsEqual(current, renderedOverrides) ? current : renderedOverrides
    ));
    setPreviewTasksById((current) => {
      const next = previewTasks.length > 0
        ? new Map(previewTasks
          .filter(task => renderedTaskIds.has(task.id))
          .map(task => [task.id, task]))
        : new Map<string, Task>();
      return arePreviewTaskMapsEqual(current, next) ? current : next;
    });
  }, [previewPositionStore]);

  const previewNormalizedTasks = useMemo(() => {
    if (previewTasksById.size === 0) return normalizedTasks;
    return normalizedTasks.map(task => previewTasksById.get(task.id) ?? task);
  }, [normalizedTasks, previewTasksById]);

  const previewVisibleTasks = useMemo(() => {
    if (previewTasksById.size === 0) return visibleTasks;
    return visibleTasks.map(task => previewTasksById.get(task.id) ?? task);
  }, [visibleTasks, previewTasksById]);

  const forcedRenderedTaskIds = useMemo(() => {
    const ids = new Set<string>();

    if (draggedTaskOverride) {
      ids.add(draggedTaskOverride.taskId);
    }

    return ids;
  }, [draggedTaskOverride]);
  const visibleTaskWindowIndices = useMemo(() => {
    const totalTasks = visibleTasks.length;
    if (totalTasks === 0) {
      return [] as number[];
    }

    const viewportHeight = scrollViewport.viewportHeight > 0
      ? scrollViewport.viewportHeight
      : INITIAL_VIEWPORT_HEIGHT_FALLBACK;

    const viewportRows = Math.max(1, Math.ceil(viewportHeight / effectiveRowHeight));
    const rangeStart = Math.max(0, scrollViewport.scrollTopRowIndex - TASK_ROW_OVERSCAN);
    const rangeEnd = Math.min(
      totalTasks - 1,
      rangeStart + viewportRows + TASK_ROW_OVERSCAN * 2 - 1
    );
    const indices = new Set<number>();

    for (let index = rangeStart; index <= rangeEnd; index += 1) {
      indices.add(index);
    }

    for (const taskId of forcedRenderedTaskIds) {
      const index = visibleTaskIndexMap.get(taskId);
      if (index !== undefined) {
        indices.add(index);
      }
    }

    return Array.from(indices).sort((left, right) => left - right);
  }, [
    effectiveRowHeight,
    forcedRenderedTaskIds,
    scrollViewport.scrollTopRowIndex,
    scrollViewport.viewportHeight,
    visibleTaskIndexMap,
    visibleTasks.length,
  ]);

  const renderedChartTasks = useMemo(
    () =>
      visibleTaskWindowIndices
        .map((index) => {
          const task = previewVisibleTasks[index];
          return task ? { index, task } : null;
        })
        .filter((entry): entry is { index: number; task: Task } => entry !== null),
    [previewVisibleTasks, visibleTaskWindowIndices]
  );

  const renderedDependencyTasks = useMemo(
    () => renderedChartTasks.map(({ task }) => task),
    [renderedChartTasks]
  );
  const visibleTaskWindowTop = scrollViewport.scrollTopRowIndex * effectiveRowHeight;
  const visibleTaskWindowHeight = Math.min(
    Math.max(0, totalGridHeight - visibleTaskWindowTop),
    Math.max(scrollViewport.viewportHeight, INITIAL_VIEWPORT_HEIGHT_FALLBACK) + effectiveRowHeight * 2
  );
  renderedTaskIdsRef.current = useMemo(
    () => new Set(renderedChartTasks.map(({ task }) => task.id)),
    [renderedChartTasks]
  );

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

  const hoveredRowElementsRef = useRef<HTMLElement[]>([]);

  const clearHoveredRows = useCallback(() => {
    for (const element of hoveredRowElementsRef.current) {
      element.classList.remove('gantt-tl-row-hovered', 'gantt-tr-row-hovered', 'gantt-mx-row-hovered');
    }
    hoveredRowElementsRef.current = [];
  }, []);

  const applyHoveredRows = useCallback((taskId: string) => {
    const root = scrollContentRef.current;
    if (!root) return;

    clearHoveredRows();
    const nextHoveredRows = Array.from(
      root.querySelectorAll<HTMLElement>('[data-gantt-task-row-id]')
    ).filter((element) => element.dataset.ganttTaskRowId === taskId);

    for (const element of nextHoveredRows) {
      if (element.classList.contains('gantt-tl-row')) {
        element.classList.add('gantt-tl-row-hovered');
      }
      if (element.classList.contains('gantt-tr-row')) {
        element.classList.add('gantt-tr-row-hovered');
      }
      if (element.classList.contains('gantt-mx-row')) {
        element.classList.add('gantt-mx-row-hovered');
      }
    }

    hoveredRowElementsRef.current = nextHoveredRows;
  }, [clearHoveredRows]);

  const handleSharedRowHover = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (isPanningRef.current) return;

    const target = event.target as HTMLElement;
    const row = target.closest<HTMLElement>('[data-gantt-task-row-id]');
    const taskId = row?.dataset.ganttTaskRowId;
    if (!taskId) return;

    if (hoveredRowElementsRef.current.some((element) => element.dataset.ganttTaskRowId === taskId)) {
      return;
    }

    applyHoveredRows(taskId);
  }, [applyHoveredRows]);

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

  const exportToPdf = useCallback(async (options?: ExportToPdfOptions) => {
    const sourceContainer = containerRef.current;
    const sourceContent = scrollContentRef.current;

    if (!sourceContainer || !sourceContent || typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const includeTaskList = options?.includeTaskList ?? showTaskList;
    const includeChart = options?.includeChart ?? showChart;

    if (!includeTaskList && !includeChart) {
      return;
    }

    const printContent = sourceContent.cloneNode(true) as HTMLDivElement;
    const taskListClone = printContent.querySelector('.gantt-tl-overlay') as HTMLDivElement | null;
    const chartClone = printContent.querySelector('.gantt-chartSurface') as HTMLDivElement | null;

    if (includeTaskList) {
      taskListClone?.classList.remove('gantt-tl-hidden', 'gantt-tl-overlay-shadowed');
    } else {
      taskListClone?.remove();
    }

    if (includeChart) {
      chartClone?.classList.remove('gantt-chart-hidden');
      if (chartClone) chartClone.style.display = '';
    } else {
      chartClone?.remove();
    }

    await printGanttChart({
      sourceDocument: document,
      sourceContainer,
      printContent,
      header: options?.header,
      documentTitle: options?.documentTitle,
      title: options?.title,
      fileName: options?.fileName,
      orientation: options?.orientation,
    });
  }, [showTaskList, showChart]);

  // Expose collapse/expand methods via ref (must be after handlers are defined)
  useImperativeHandle(
    ref,
    () => ({
      scrollToToday,
      scrollToTask,
      scrollToRow,
      collapseAll: handleCollapseAll,
      expandAll: handleExpandAll,
      exportToPdf,
    }),
    [scrollToToday, scrollToTask, scrollToRow, handleCollapseAll, handleExpandAll, exportToPdf]
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

    const tasksWithoutPromoted = tasks.filter(t => t.id !== taskId);
    const insertIndex = lastSiblingIndex.index;
    const reorderedTasks = normalizeHierarchyTasks([
      ...tasksWithoutPromoted.slice(0, insertIndex),
      promotedTask,
      ...tasksWithoutPromoted.slice(insertIndex)
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

  const handleUngroupTask = useCallback((taskId: string) => {
    if (onUngroupTask) {
      onUngroupTask(taskId);
      return;
    }

    const parentTask = tasks.find(task => task.id === taskId);
    if (!parentTask) return;

    const hasDirectChildren = tasks.some(task => task.parentId === taskId);
    if (!hasDirectChildren) return;

    const changedTasks: Task[] = [];

    for (const task of tasks) {
      const nextParentId = task.parentId === taskId ? parentTask.parentId : task.parentId;
      const nextDependencies = task.dependencies?.filter(dep => dep.taskId !== taskId);

      if (nextParentId !== task.parentId || nextDependencies?.length !== task.dependencies?.length) {
        changedTasks.push({
          ...task,
          parentId: nextParentId,
          dependencies: nextDependencies,
        });
      }
    }

    if (changedTasks.length > 0) {
      onTasksChange?.(changedTasks as TTask[]);
    }
  }, [tasks, onTasksChange, onUngroupTask]);

  // Pan (grab-scroll) on empty grid area
  const panStateRef = useRef<{ active: boolean; startX: number; startY: number; scrollX: number; scrollY: number } | null>(null);
  const panMoveRef = useRef<{ clientX: number; clientY: number } | null>(null);
  const panFrameRef = useRef<number | null>(null);

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
    isPanningRef.current = true;
    clearHoveredRows();
    // Blur any focused input so onBlur save handlers fire before pan starts
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    container.style.cursor = 'grabbing';
    e.preventDefault();
  }, [clearHoveredRows]);

  useEffect(() => {
    const applyPanMove = () => {
      panFrameRef.current = null;
      const pan = panStateRef.current;
      const move = panMoveRef.current;
      if (!pan?.active || !move) return;
      const container = scrollContainerRef.current;
      if (!container) return;

      container.scrollLeft = pan.scrollX - (move.clientX - pan.startX);
      container.scrollTop = pan.scrollY - (move.clientY - pan.startY);
    };

    const handlePanMove = (e: MouseEvent) => {
      const pan = panStateRef.current;
      if (!pan?.active) return;

      panMoveRef.current = { clientX: e.clientX, clientY: e.clientY };
      if (panFrameRef.current === null) {
        panFrameRef.current = window.requestAnimationFrame(applyPanMove);
      }
    };

    const handlePanEnd = () => {
      if (!panStateRef.current?.active) return;
      if (panFrameRef.current !== null) {
        window.cancelAnimationFrame(panFrameRef.current);
        panFrameRef.current = null;
        applyPanMove();
      }
      panStateRef.current = null;
      isPanningRef.current = false;
      panMoveRef.current = null;
      const container = scrollContainerRef.current;
      if (container) container.style.cursor = '';
      forceViewportSyncRef.current?.();
    };

    window.addEventListener('mousemove', handlePanMove);
    window.addEventListener('mouseup', handlePanEnd);
    return () => {
      if (panFrameRef.current !== null) {
        window.cancelAnimationFrame(panFrameRef.current);
        panFrameRef.current = null;
      }
      isPanningRef.current = false;
      window.removeEventListener('mousemove', handlePanMove);
      window.removeEventListener('mouseup', handlePanEnd);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={isTableMatrixMode ? 'gantt-container gantt-container-tableMatrix' : 'gantt-container'}
    >
      <div
        ref={scrollContainerRef}
        className="gantt-scrollContainer"
        style={{ height: containerHeight ?? 'auto', cursor: 'grab' }}
        onMouseDown={handlePanStart}
      >
        {/* Content wrapper - enables TaskList to scroll with chart horizontally */}
        <div
          ref={scrollContentRef}
          className="gantt-scrollContent"
          onMouseOver={handleSharedRowHover}
          onMouseLeave={clearHoveredRows}
        >
          {/* TaskList - sticky left, scrolls with content horizontally */}
          <TaskList
            tasks={normalizedTasks}
            rowHeight={effectiveRowHeight}
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
            disableTaskDrag={disableTaskListReorder}
            editingTaskId={editingTaskId}
            enableAddTask={enableAddTask}
            defaultTaskDurationDays={defaultTaskDurationDays}
            collapsedParentIds={collapsedParentIds}
            onToggleCollapse={handleToggleCollapse}
            onPromoteTask={onPromoteTask ?? handlePromoteTask}
            onDemoteTask={onDemoteTask ?? handleDemoteTask}
            onUngroupTask={onUngroupTask ?? handleUngroupTask}
            highlightedTaskIds={taskListHighlightedTaskIds}
            enableTaskMultiSelect={enableTaskMultiSelect}
            selectedTaskIds={selectedTaskIds}
            onSelectedTaskIdsChange={onSelectedTaskIdsChange}
            customDays={customDays}
            isWeekend={isWeekend}
            businessDays={businessDays}
            filterMode={filterMode}
            filteredTaskIds={matchedTaskIds}
            isFilterActive={!!taskFilter}
            additionalColumns={additionalColumns}
            hiddenTaskListColumns={hiddenTaskListColumns}
            taskListColumnWidths={taskListColumnWidths}
            onTaskListColumnWidthsChange={onTaskListColumnWidthsChange}
            taskListMenuCommands={taskListMenuCommands as TaskListMenuCommand<Task>[] | undefined}
            hideTaskListRowActions={hideTaskListRowActions}
            getTaskListRowClassName={getTaskListRowClassName as ((task: Task) => string | undefined) | undefined}
            rowContentLines={resolvedRowContentLines}
            bodyMinHeight={tableBodyMinHeight}
            taskDateChangeMode={taskDateChangeMode}
            onTaskDateChangeModeChange={handleTaskDateChangeMode}
            visibleRowIndices={visibleTaskWindowIndices}
            assumeTasksNormalized={true}
          />

          {/* Chart area */}
          <div
            className={isTableMatrixMode || showChart ? 'gantt-chartSurface' : 'gantt-chartSurface gantt-chart-hidden'}
            style={{
              minWidth: isTableMatrixMode
                ? (matrixWidth !== undefined ? `${matrixWidth}px` : undefined)
                : `${gridWidth}px`,
              width: isTableMatrixMode
                ? (matrixWidth !== undefined ? `${matrixWidth}px` : 'max-content')
                : undefined,
              flex: isTableMatrixMode ? '0 0 auto' : 1,
              display: isTableMatrixMode || showChart ? undefined : 'none',
            }}
          >
            {isTableMatrixMode ? (
              <TableMatrix
                tasks={visibleTasks}
                allTasks={normalizedTasks}
                columns={matrixColumns}
                columnGroups={matrixColumnGroups}
                rowHeight={effectiveRowHeight}
                headerHeight={timelineHeaderHeight}
                bodyMinHeight={tableBodyMinHeight}
                selectedTaskId={selectedTaskId}
                onTaskSelect={handleTaskSelect}
                onCellClick={onMatrixCellClick}
                dateOverlay={matrixDateOverlay}
                highlightedTaskIds={taskListHighlightedTaskIds}
                filterMode={filterMode}
              />
            ) : (
              <>
                {/* Sticky header - stays at top during vertical scroll, scrolls with content horizontally */}
                <div
                  className="gantt-stickyHeader"
                  style={{ width: `${gridWidth}px`, height: `${timelineHeaderHeight}px` }}
                >
                  <TimeScaleHeader
                    days={dateRange}
                    dayWidth={dayWidth}
                    headerHeight={headerHeight}
                    viewMode={viewMode}
                    isCustomWeekend={isCustomWeekend}
                    timelineMarkers={visibleTimelineMarkers}
                    onTimelineHover={setActiveTimelineTooltip}
                    onTimelineHoverEnd={() => setActiveTimelineTooltip(null)}
                  />
                  {activeTimelineTooltip && (
                    <div className="gantt-timelineTooltipLayer" aria-hidden="true">
                      <div
                        className="gantt-timelineTooltip"
                        style={{
                          left: `${activeTimelineTooltip.left}px`,
                          backgroundColor: activeTimelineTooltip.color,
                        }}
                      >
                        {activeTimelineTooltip.label}
                      </div>
                    </div>
                  )}
                </div>

                {/* Task area */}
                <div
                  className="gantt-taskArea"
                  style={{
                    position: 'relative',
                    width: `${gridWidth}px`,
                    height: `${totalGridHeight}px`,
                  }}
                >
                  <GridBackground
                    dateRange={dateRange}
                    dayWidth={dayWidth}
                    totalHeight={totalGridHeight}
                    viewMode={viewMode}
                    isCustomWeekend={isCustomWeekend}
                    horizontalWindow={horizontalWindow}
                  />

                  {todayInRange && (
                    <TodayIndicator
                      monthStart={monthStart}
                      dayWidth={dayWidth}
                      onHover={setActiveTimelineTooltip}
                      onHoverEnd={() => setActiveTimelineTooltip(null)}
                    />
                  )}
                  {visibleTimelineMarkers.length > 0 && (
                    <TimelineMarkers
                      rangeStart={monthStart}
                      dayWidth={dayWidth}
                      totalHeight={totalGridHeight}
                      markers={visibleTimelineMarkers}
                      onHover={setActiveTimelineTooltip}
                      onHoverEnd={() => setActiveTimelineTooltip(null)}
                    />
                  )}

                  {/* Dependency lines SVG overlay */}
                  <DependencyLines
                    tasks={renderedDependencyTasks}
                    allTasks={previewNormalizedTasks}
                    collapsedParentIds={collapsedParentIds}
                    monthStart={monthStart}
                    dayWidth={dayWidth}
                    rowHeight={effectiveRowHeight}
                    gridWidth={gridWidth}
                    totalHeight={totalGridHeight}
                    rowIndexByTaskId={visibleTaskIndexMap}
                    dragOverrides={dependencyOverrides}
                    selectedDep={selectedChip}
                    cycleTaskIds={cycleTaskIds}
                    businessDays={businessDays}
                    weekendPredicate={isCustomWeekend}
                    horizontalWindow={horizontalWindow}
                  />

                  {dragGuideLines && (
                    <DragGuideLines
                      isDragging={dragGuideLines.isDragging}
                      dragMode={dragGuideLines.dragMode}
                      left={dragGuideLines.left}
                      width={dragGuideLines.width}
                      top={visibleTaskWindowTop}
                      totalHeight={visibleTaskWindowHeight}
                    />
                  )}

                  {renderedChartTasks.map(({ task, index }) => (
                    <div
                      key={task.id}
                      style={{
                        position: 'absolute',
                        top: `${index * effectiveRowHeight}px`,
                        left: 0,
                        right: 0,
                        height: `${effectiveRowHeight}px`,
                      }}
                    >
                      <TaskRow
                        task={task}
                        monthStart={monthStart}
                        dayWidth={dayWidth}
                        rowHeight={effectiveRowHeight}
                        onTasksChange={handleTaskChange as (tasks: Task[]) => void}
                        onDragStateChange={(state) => {
                          if (state.isDragging) {
                            setDragGuideLines((current) => (
                              current &&
                              current.isDragging === state.isDragging &&
                              current.dragMode === state.dragMode &&
                              current.left === state.left &&
                              current.width === state.width
                                ? current
                                : state
                            ));
                            if (state.liveDependencyUpdate === false) {
                              setDraggedTaskOverride((current) => (current === null ? current : null));
                            } else {
                              setDraggedTaskOverride((current) => (
                                current &&
                                current.taskId === task.id &&
                                current.left === state.left &&
                                current.width === state.width
                                  ? current
                                  : { taskId: task.id, left: state.left, width: state.width }
                              ));
                            }
                          } else {
                            setDragGuideLines((current) => (current === null ? current : null));
                            setDraggedTaskOverride((current) => (current === null ? current : null));
                          }
                        }}
                        rowIndex={index}
                        allTasks={normalizedTasks}
                        directChildCount={directChildCountByTaskId.get(task.id) ?? 0}
                        enableAutoSchedule={enableAutoSchedule ?? false}
                        disableConstraints={disableConstraints ?? false}
                        previewPositionStore={previewPositionStore}
                        onCascadeProgress={handleCascadeProgress as (overrides: Map<string, { left: number; width: number }>, previewTasks?: Task[]) => void}
                        onCascade={handleCascade as (cascadedTasks: Task[]) => void}
                        highlightExpiredTasks={highlightExpiredTasks}
                        showBaseline={showBaseline}
                        isFilterMatch={filterMode === 'highlight' ? matchedTaskIds.has(task.id) : false}
                        businessDays={businessDays}
                        customDays={customDays}
                        isWeekend={isWeekend}
                        disableTaskDrag={disableTaskDrag}
                        viewMode={viewMode}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const TaskGanttChart = forwardRef(TaskGanttChartInner) as <TTask extends Task = Task>(
  props: (GanttModeProps<TTask> | TableMatrixModeProps<TTask>) & { ref?: React.Ref<GanttChartHandle> }
) => React.ReactElement;

export const GanttChart = forwardRef(GanttChartInner) as <
  TTask extends Task = Task,
  TItem extends ResourceTimelineItem = ResourceTimelineItem,
>(
  props: GanttChartProps<TTask, TItem> & { ref?: React.Ref<GanttChartHandle> }
) => React.ReactElement;

(GanttChart as React.FC).displayName = 'GanttChart';

export default GanttChart;
