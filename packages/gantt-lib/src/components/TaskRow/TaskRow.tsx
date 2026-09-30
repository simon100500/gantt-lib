'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { parseUTCDate, formatDateRangeLabel, createCustomDayPredicate } from '../../utils/dateUtils';
import { calculateMilestoneGeometry, calculateTaskBar, pixelsToDate } from '../../utils/geometry';
import { ACTIVITY_LANE_BAR_HEIGHT, ACTIVITY_LANE_STEP, computeActivityLanes, shiftActivityChain, type ActivitySegment } from '../../utils/activities';
import { isTaskExpired } from '../../utils/expired';
import { isMilestoneTask, normalizeTaskDatesForType } from '../../utils/taskType';
import { useTaskDrag } from '../../hooks/useTaskDrag';
import { isTaskParent, getChildren, getBusinessDaysCount, DAY_MS } from '../../core/scheduling';
import type { Task } from '../GanttChart';
import type { GanttScheduleIntent } from '../../types';
import type { TaskPreviewPositionStore, ActivityPreviewStore } from '../GanttChart/previewStore';
import './TaskRow.css';

// Минимальный шаг между отсечками состава: реже — рисками мельчим.
const COMPOSITE_SEGMENT_CUT_MIN_PX = 10;

type ActivityDragMode = 'move' | 'resize-left' | 'resize-right';

const toIsoDay = (date: Date): string => date.toISOString().slice(0, 10);

const shiftActivityDay = (value: string | Date, days: number): Date =>
  new Date(parseUTCDate(value).getTime() + days * DAY_MS);

const activityDurationDays = (activity: { startDate: string | Date; endDate: string | Date }): number =>
  Math.max(1, Math.round((parseUTCDate(activity.endDate).getTime() - parseUTCDate(activity.startDate).getTime()) / DAY_MS) + 1);

const formatCompositePreviewDate = (date: Date): string => {
  const month = new Intl.DateTimeFormat('ru-RU', { month: 'short', timeZone: 'UTC' })
    .format(date)
    .replace(/\.$/, '');
  const yearSuffix = date.getUTCFullYear() === new Date().getFullYear()
    ? ''
    : ` ${String(date.getUTCFullYear()).slice(-2)}`;
  return `${date.getUTCDate()} ${month}${yearSuffix}`;
};

// START_MODULE_CONTRACT
// PURPOSE: Render one Gantt task row, including its bar, scheduling affordances, and optional external labels.
// SCOPE: Calculate task geometry, render duration/progress/name/date labels, and preserve drag/dependency interactions with optional deferred cascade preview.
// DEPENDS: core scheduling, geometry, useTaskDrag, GanttChart presentation props.
// LINKS: M-SCHEDULE, GanttChart, type-TaskRowProps, fn-formatDateRangeLabel
// ROLE: RUNTIME
// MAP_MODE: EXPORTS
// END_MODULE_CONTRACT

export interface TaskRowProps {
  /** Task data to render */
  task: Task;
  /** Start of the month for positioning calculations */
  monthStart: Date;
  /** Width of each day column in pixels */
  dayWidth: number;
  /** Height of the task row in pixels */
  rowHeight: number;
  /** Callback when task is modified via drag/resize. Receives array of changed tasks. */
  onTasksChange?: (tasks: Task[]) => void;
  /** Semantic scheduling operation completed by this chart row. */
  onScheduleIntent?: (intent: GanttScheduleIntent) => void;
  /** Callback when task drag state changes (for rendering guide lines) */
  onDragStateChange?: (state: {
    isDragging: boolean;
    dragMode: 'move' | 'resize-left' | 'resize-right' | null;
    left: number;
    width: number;
  }) => void;
  /** Index of the task row (used for dependency rendering) */
  rowIndex?: number;
  /** All tasks in the chart (used for dependency validation) */
  allTasks?: Task[];
  /** Whether auto-scheduling is enabled */
  enableAutoSchedule?: boolean;
  /** Whether to disable constraint checking during drag */
  disableConstraints?: boolean;
  /** Keep the dragged bar live but defer the cascade preview until drop. */
  deferCascadePreview?: boolean;
  /** Position override for cascade preview — when set, overrides both static and drag position */
  overridePosition?: { left: number; width: number };
  /** External per-task preview store used to avoid chart-wide renders during cascade drag */
  previewPositionStore?: TaskPreviewPositionStore;
  /** Live day-shifts of chained row activities in other rows during a conveyor drag. */
  activityPreviewStore?: ActivityPreviewStore;
  /** Called each RAF during cascade drag with override positions for non-dragged chain tasks */
  onCascadeProgress?: (
    overrides: Map<string, { left: number; width: number }>,
    previewTasks?: Task[]
  ) => void;
  /** Called when cascade drag completes; receives all shifted tasks including dragged task */
  onCascade?: (tasks: Task[]) => void;
  /** Optional horizontal divider line - renders above or below the task row */
  divider?: 'top' | 'bottom';
  /** Highlight expired/overdue tasks with red background */
  highlightExpiredTasks?: boolean;
  /** Show baseline line below the task bar */
  showBaseline?: boolean;
  /** Whether this row matches the active filter highlight */
  isFilterMatch?: boolean;
  /** Whether this task lies on the critical path */
  isCritical?: boolean;
  /** Calculate duration in business days (excluding weekends) */
  businessDays?: boolean;
  /** Custom weekend configuration */
  customDays?: Array<{ date: Date; type: 'weekend' | 'workday' }>;
  /** Custom weekend predicate (overrides default Saturday/Sunday) */
  isWeekend?: (date: Date) => boolean;
  /** Disable task drag and resize (overrides task.locked) */
  disableTaskDrag?: boolean;
  /** Disable visual dependency creation ports */
  disableDependencyEditing?: boolean;
  /** Called when a user starts dragging a dependency from a task edge */
  onDependencyPortPointerDown?: (
    taskId: string,
    side: 'left' | 'right',
    event: React.PointerEvent<HTMLButtonElement>
  ) => void;
  /** Whether a dependency drag is currently active */
  isDependencyDragActive?: boolean;
  /** Active chart view mode */
  viewMode?: 'day' | 'week' | 'month';
  /** Render the date range label to the left of the task bar (default: true). */
  showTaskDateLabels?: boolean;
  /** Render the task name to the right of the task bar (default: true). */
  showTaskNames?: boolean;
  /** Render composite child mini-bars inside the parent bar (default: true). */
  showCompositeSegments?: boolean;
  /** Open or close the composite detail rows. */
  onCompositeToggle?: (source: 'release' | 'click' | 'keyboard') => void;
  compactDetail?: boolean;
  /** Parent bar color used to tint a composite detail row. */
  compositeParentColor?: string;
  compositeExpanded?: boolean;
}

/**
 * Custom comparison function for React.memo
 *
 * Performance optimization: Only re-renders if task properties that affect rendering change.
 *
 * NOTE: onTasksChange is intentionally excluded from this comparison because:
 * 1. The parent (GanttChart) wraps onTasksChange in useCallback for referential stability
 * 2. onTasksChange is only called AFTER drag completes (not during drag)
 * 3. During drag, only the dragged TaskRow re-renders due to its internal drag state
 * 4. Other TaskRows don't need to re-render when one task is dragged
 *
 * NOTE: monthStart MUST be included because task positions are calculated relative to it.
 * When the grid expands (e.g., dragging a task left beyond the boundary), monthStart changes
 * and all tasks need to re-render to update their positions.
 *
 * NOTE: onCascadeProgress and onCascade are excluded from comparison (same pattern as onTasksChange —
 * callbacks excluded from comparison because GanttChart wraps them in useCallback).
 *
 * Excluding onTasksChange prevents re-render storms when dragging tasks with ~100 tasks.
 */
const arePropsEqual = (prevProps: TaskRowProps, nextProps: TaskRowProps) => {
  return (
    prevProps.task.id === nextProps.task.id &&
    prevProps.task.name === nextProps.task.name &&
    prevProps.task.startDate === nextProps.task.startDate &&
    prevProps.task.endDate === nextProps.task.endDate &&
    prevProps.task.baselineStartDate === nextProps.task.baselineStartDate &&
    prevProps.task.baselineEndDate === nextProps.task.baselineEndDate &&
    prevProps.task.type === nextProps.task.type &&
    prevProps.task.color === nextProps.task.color &&
    prevProps.task.progress === nextProps.task.progress &&
    prevProps.task.accepted === nextProps.task.accepted &&
    prevProps.task.activities === nextProps.task.activities &&
    prevProps.monthStart.getTime() === nextProps.monthStart.getTime() &&
    prevProps.dayWidth === nextProps.dayWidth &&
    prevProps.rowHeight === nextProps.rowHeight &&
    prevProps.overridePosition?.left === nextProps.overridePosition?.left &&
    prevProps.overridePosition?.width === nextProps.overridePosition?.width &&
    prevProps.previewPositionStore === nextProps.previewPositionStore &&
    prevProps.activityPreviewStore === nextProps.activityPreviewStore &&
    prevProps.allTasks === nextProps.allTasks &&
    prevProps.disableConstraints === nextProps.disableConstraints &&
    prevProps.deferCascadePreview === nextProps.deferCascadePreview &&
    prevProps.task.locked === nextProps.task.locked &&
    prevProps.task.synced === nextProps.task.synced &&
    prevProps.task.divider === nextProps.task.divider &&
    prevProps.highlightExpiredTasks === nextProps.highlightExpiredTasks &&
    prevProps.isCritical === nextProps.isCritical &&
    prevProps.showBaseline === nextProps.showBaseline &&
    prevProps.onCompositeToggle === nextProps.onCompositeToggle &&
    prevProps.compactDetail === nextProps.compactDetail &&
    prevProps.compositeParentColor === nextProps.compositeParentColor &&
    prevProps.compositeExpanded === nextProps.compositeExpanded &&
    prevProps.isFilterMatch === nextProps.isFilterMatch &&
    prevProps.businessDays === nextProps.businessDays &&
    prevProps.customDays === nextProps.customDays &&
    prevProps.isWeekend === nextProps.isWeekend &&
    prevProps.disableTaskDrag === nextProps.disableTaskDrag &&
    prevProps.disableDependencyEditing === nextProps.disableDependencyEditing &&
    prevProps.isDependencyDragActive === nextProps.isDependencyDragActive &&
    prevProps.viewMode === nextProps.viewMode &&
    prevProps.showTaskDateLabels === nextProps.showTaskDateLabels &&
    prevProps.showTaskNames === nextProps.showTaskNames &&
    prevProps.showCompositeSegments === nextProps.showCompositeSegments
    // onTasksChange, onCascadeProgress, onCascade excluded - see note above
  );
};

/**
 * TaskRow component - renders a single task row with a task bar
 *
 * Uses React.memo for performance optimization (QL-01).
 * The task bar is positioned absolutely based on start/end dates.
 */
const TaskRow: React.FC<TaskRowProps> = React.memo(
  ({ task, monthStart, dayWidth, rowHeight, onTasksChange, onScheduleIntent, onDragStateChange, rowIndex, allTasks, enableAutoSchedule, disableConstraints, deferCascadePreview = false, overridePosition, previewPositionStore, activityPreviewStore, onCascadeProgress, onCascade, divider, highlightExpiredTasks, isCritical = false, showBaseline = false, isFilterMatch = false, businessDays, customDays, isWeekend, disableTaskDrag = false, disableDependencyEditing = false, onDependencyPortPointerDown, isDependencyDragActive = false, viewMode = 'day', showTaskDateLabels = true, showTaskNames = true, showCompositeSegments: showCompositeSegmentsProp = true, onCompositeToggle, compactDetail = false, compositeParentColor, compositeExpanded = false }) => {
    const defaultParentBarColor = '#782FC4';
    const [showCompositePreview, setShowCompositePreview] = useState(false);
    const [compositePreviewPosition, setCompositePreviewPosition] = useState<{ left: number; top: number } | null>(null);
    const pointerStart = useRef<{ x: number; y: number } | null>(null);
    const suppressCompositeClick = useRef(false);
    const compositeChildren = useMemo(
      () => task.composite ? (allTasks ?? []).filter(child => child.parentId === task.id) : [],
      [allTasks, task.composite, task.id]
    );
    useEffect(() => {
      if (!showCompositePreview) return;
      const hide = () => setShowCompositePreview(false);
      window.addEventListener('scroll', hide, true);
      window.addEventListener('resize', hide);
      return () => {
        window.removeEventListener('scroll', hide, true);
        window.removeEventListener('resize', hide);
      };
    }, [showCompositePreview]);
    // Extract divider from task prop
    const { divider: taskDivider } = task;

    const normalizedTask = useMemo(() => normalizeTaskDatesForType(task), [task]);
    const milestone = useMemo(() => isMilestoneTask(normalizedTask), [normalizedTask]);

    // Parse dates as UTC
    const taskStartDate = useMemo(() => parseUTCDate(normalizedTask.startDate), [normalizedTask.startDate]);
    const taskEndDate = useMemo(() => parseUTCDate(normalizedTask.endDate), [normalizedTask.endDate]);
    const baselineStartDate = useMemo(
      () => (task.baselineStartDate ? parseUTCDate(task.baselineStartDate) : null),
      [task.baselineStartDate]
    );
    const baselineEndDate = useMemo(
      () => (task.baselineEndDate ? parseUTCDate(task.baselineEndDate) : null),
      [task.baselineEndDate]
    );

    // Hierarchy: compute isParent and childCount
    const isParent = useMemo(() => {
      return allTasks ? isTaskParent(task.id, allTasks) : false;
    }, [allTasks, task.id]);
    const isVisualParent = isParent && !task.composite;

    const childCount = useMemo(() => {
      return allTasks ? getChildren(task.id, allTasks).length : 0;
    }, [allTasks, task.id]);

    // Calculate expiration status for overdue tasks
    const isExpired = useMemo(() => {
      if (!highlightExpiredTasks) return false;
      return isTaskExpired(normalizedTask);
    }, [normalizedTask.startDate, normalizedTask.endDate, normalizedTask.progress, highlightExpiredTasks]);

    // Calculate task bar position and dimensions
    const { left, width } = useMemo(
      () => calculateTaskBar(taskStartDate, taskEndDate, monthStart, dayWidth),
      [taskStartDate, taskEndDate, monthStart, dayWidth]
    );

    const milestoneGeometry = useMemo(
      () => calculateMilestoneGeometry(taskStartDate, monthStart, dayWidth),
      [taskStartDate, monthStart, dayWidth]
    );
    const baselineGeometry = useMemo(() => {
      if (!baselineStartDate || !baselineEndDate) return null;
      if (milestone) {
        return calculateTaskBar(baselineStartDate, baselineStartDate, monthStart, dayWidth);
      }
      return calculateTaskBar(baselineStartDate, baselineEndDate, monthStart, dayWidth);
    }, [baselineStartDate, baselineEndDate, milestone, monthStart, dayWidth]);

    // Determine task bar color. Expired tinting keeps priority over the critical
    // repaint; disable the highlightExpiredTasks toggle in the UI to see the
    // clean critical red.
    const criticalBarColor = 'var(--gantt-critical-path-color, #dc2626)';
    const barColor = isExpired
      ? 'var(--gantt-expired-color)'
      : isCritical
        ? criticalBarColor
        : (task.color || 'var(--gantt-task-bar-default-color)');

    // Calculate clamped and rounded progress width
    const progressWidth = useMemo(() => {
      if (task.progress === undefined || task.progress <= 0) return 0;
      return Math.min(100, Math.max(0, Math.round(task.progress)));
    }, [task.progress]);

    // Determine progress color based on completion status
    const progressColor = useMemo(() => {
      if (isExpired) {
        // Dark red for expired tasks
        return 'color-mix(in srgb, var(--gantt-expired-color) 40%, black)';
      }
      if (isCritical) {
        // Darker shade of the critical red so progress stays readable
        return `color-mix(in srgb, ${criticalBarColor} 40%, black)`;
      }
      if (progressWidth === 100) {
        return task.accepted
          ? 'var(--gantt-progress-accepted, #22c55e)'    // Green for accepted
          : 'var(--gantt-progress-completed, #fbbf24)';   // Yellow for completed (not accepted)
      }
      // Darker shade using color-mix() with task color or default
      const baseColor = task.color || 'var(--gantt-task-bar-default-color)';
      return `color-mix(in srgb, ${baseColor} 40%, black)`;
    }, [isCritical, isExpired, progressWidth, task.accepted, task.color]);

    const externalTaskNameColor = useMemo(() => {
      if (isExpired) {
        return 'color-mix(in srgb, var(--gantt-expired-color) 40%, black)';
      }
      const baseColor = isVisualParent
        ? (task.color || defaultParentBarColor)
        : (task.color || 'var(--gantt-task-bar-default-color)');
      return `color-mix(in srgb, ${baseColor} 40%, black)`;
    }, [defaultParentBarColor, isCritical, isExpired, isVisualParent, task.color]);

    // At 100% progress, tint the bar itself instead of rendering a fill overlay.
    const barStyle = useMemo(() => {
      const parentBarColor = task.color || defaultParentBarColor;
      if (isCritical && !isExpired) {
        const c = criticalBarColor;
        if (isVisualParent) {
          return { backgroundColor: c, '--gantt-parent-bar-color': c } as React.CSSProperties;
        }
        return { backgroundColor: c } as React.CSSProperties;
      }
      if (isVisualParent) {
        if (progressWidth >= 100) {
          const c = isExpired
            ? 'color-mix(in srgb, var(--gantt-expired-color) 40%, black)'
            : `color-mix(in srgb, ${parentBarColor} 40%, black)`;
          return { backgroundColor: c, '--gantt-parent-bar-color': c } as React.CSSProperties;
        }
        return { '--gantt-parent-bar-color': parentBarColor } as React.CSSProperties;
      }
      if (progressWidth >= 100) {
        return { backgroundColor: progressColor };
      }
      return { backgroundColor: barColor };
    }, [isCritical, defaultParentBarColor, isExpired, isVisualParent, progressWidth, barColor, progressColor, task.color]);

    // Handle drag end - call onTasksChange with updated task
    const handleDragEnd = (result: { id: string; startDate: Date; endDate: Date; updatedDependencies?: Task['dependencies'] }) => {
      const updatedTask: Task = {
        ...normalizedTask,
        startDate: result.startDate.toISOString(),
        endDate: result.endDate.toISOString(),
        ...(result.updatedDependencies !== undefined && { dependencies: result.updatedDependencies }),
      };
      if (!onScheduleIntent) {
        onTasksChange?.([updatedTask]);
      }
    };

    // Weekend predicate for business days calculation (must be before useTaskDrag)
    const weekendPredicate = useMemo(
      () => createCustomDayPredicate({ customDays, isWeekend }),
      [customDays, isWeekend]
    );

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
      onScheduleIntent,
      onDragStateChange,
      edgeZoneWidth: 20,
      allTasks,
      rowIndex,
      enableAutoSchedule,
      disableConstraints,
      deferCascadePreview,
      locked: task.locked,
      disableTaskDrag,
      onCascadeProgress,
      onCascade,
      businessDays,
      weekendPredicate,
      viewMode,
    });

    const subscribePreviewPosition = useCallback(
      (listener: () => void) => previewPositionStore?.subscribeTask(task.id, listener) ?? (() => { }),
      [previewPositionStore, task.id]
    );
    const getPreviewPositionSnapshot = useCallback(
      () => previewPositionStore?.getTaskPosition(task.id),
      [previewPositionStore, task.id]
    );
    const previewPosition = useSyncExternalStore(
      subscribePreviewPosition,
      getPreviewPositionSnapshot,
      () => undefined
    );

    // Use external/store override position (for cascade preview) with fallback to drag or static position
    const effectiveOverridePosition = previewPosition ?? overridePosition;
    const displayLeft = effectiveOverridePosition?.left ?? (isDragging ? currentLeft : left);
    const displayWidth = effectiveOverridePosition?.width ?? (isDragging ? currentWidth : width);
    const displayMilestoneGeometry = useMemo(() => {
      // Milestones are always anchored to a single day cell even if some preview path
      // passes a wider width (for example, malformed input dates before normalization).
      const centerX = Math.round(displayLeft + dayWidth / 2);
      const halfSize = Math.round(milestoneGeometry.size / 2);
      return {
        centerX,
        left: centerX - halfSize,
        right: centerX + halfSize,
        size: milestoneGeometry.size,
      };
    }, [displayLeft, dayWidth, milestoneGeometry.size]);
    const visualLeft = milestone ? displayMilestoneGeometry.left : displayLeft;
    const visualWidth = milestone ? displayMilestoneGeometry.size : displayWidth;
    const compositeSegments = useMemo(() => {
      if (!task.composite || width <= 0) return [];
      // Порядок состава не меняем: обходим детей в порядке списка, при наслоении
      // спускаемся в новый поток, встык — расширяем текущий. Освободившиеся
      // верхние потоки не переиспользуем, даже если там есть место.
      const laneEnds: number[] = [];
      const segments = compositeChildren.map(child => {
        const segment = calculateTaskBar(parseUTCDate(child.startDate), parseUTCDate(child.endDate), monthStart, dayWidth);
        let lane = Math.max(0, laneEnds.length - 1);
        if (laneEnds.length > 0 && segment.left < laneEnds[lane]) {
          lane = laneEnds.length;
        }
        laneEnds[lane] = segment.left + segment.width;
        return {
          id: child.id,
          name: child.name,
          left: (segment.left - left) / width * 100,
          width: segment.width / width * 100,
          lane,
          pxLeft: segment.left - left,
          cut: false,
        };
      });
      // Отсечка живёт в границах своего потока (lane): высота — полоса сегмента,
      // у левого края работы; внутри потока риски не дублируем чаще
      // чем через COMPOSITE_SEGMENT_CUT_MIN_PX.
      const lastCutByLane: number[] = [];
      for (const segment of [...segments].sort((a, b) => a.pxLeft - b.pxLeft)) {
        segment.cut = segment.pxLeft >= 1
          && segment.pxLeft - (lastCutByLane[segment.lane] ?? 0) >= COMPOSITE_SEGMENT_CUT_MIN_PX;
        if (segment.cut) lastCutByLane[segment.lane] = segment.pxLeft;
      }
      return segments;
    }, [task.composite, compositeChildren, monthStart, dayWidth, left, width, displayLeft]);
    const compositeLaneCount = Math.max(1, ...compositeSegments.map(segment => segment.lane + 1));
    const shouldRenderCompositeSegments = showCompositeSegmentsProp && task.composite && compositeSegments.length > 0
      && visualWidth / compositeSegments.length >= 22;
    const shouldRenderBaseline = showBaseline && baselineGeometry !== null;
    const hasPreviewPosition = isDragging || effectiveOverridePosition !== undefined;

    // Multi-activity row: works packed into sub-lanes replace the main bar.
    const activityLayout = useMemo(
      () => (task.activities && task.activities.length > 0
        ? computeActivityLanes(task.activities, monthStart, dayWidth)
        : null),
      [task.activities, monthStart, dayWidth]
    );
    const renderActivities = activityLayout !== null && !compactDetail;
    const activityTopOffset = activityLayout
      ? Math.max(0, (rowHeight - activityLayout.laneCount * ACTIVITY_LANE_STEP) / 2)
      : 0;
    const activityDragEnabled = !task.locked && !disableTaskDrag;
    const [activityDrag, setActivityDrag] = useState<{ id: string; mode: ActivityDragMode; dayDelta: number } | null>(null);
    const [activityTipId, setActivityTipId] = useState<string | null>(null);
    const [activityTipPosition, setActivityTipPosition] = useState<{ left: number; top: number } | null>(null);
    const activityDragStart = useRef<{ x: number; durationDays: number } | null>(null);

    const subscribeActivityOverrides = useCallback(
      (listener: () => void) => activityPreviewStore?.subscribeTask(task.id, listener) ?? (() => { }),
      [activityPreviewStore, task.id]
    );
    const getActivityOverridesSnapshot = useCallback(
      () => activityPreviewStore?.getTaskOverrides(task.id),
      [activityPreviewStore, task.id]
    );
    const activityOverrides = useSyncExternalStore(
      subscribeActivityOverrides,
      getActivityOverridesSnapshot,
      () => undefined
    );

    // Изменение окончания изменённой работы: левый край конец не двигает — конвейер спит.
    const chainEndDeltaDays = (mode: ActivityDragMode, dayDelta: number, durationDays: number): number => {
      if (mode === 'resize-left') return 0;
      if (mode === 'resize-right') return Math.max(dayDelta, -(durationDays - 1));
      return dayDelta;
    };

    const publishChainPreview = useCallback((draggedId: string, mode: ActivityDragMode, dayDelta: number) => {
      if (!activityPreviewStore) return;
      const endDelta = task.activityChain
        ? chainEndDeltaDays(mode, dayDelta, activityDragStart.current?.durationDays ?? 1)
        : 0;
      if (endDelta === 0) {
        activityPreviewStore.clear();
        return;
      }
      const shifts = shiftActivityChain(allTasks ?? [], task.id, draggedId, endDelta);
      const overrides = new Map<string, Map<string, number>>();
      for (const shift of shifts) {
        const deltas = new Map<string, number>();
        for (const id of shift.shiftedIds) deltas.set(id, endDelta);
        if (deltas.size > 0) overrides.set(shift.taskId, deltas);
      }
      activityPreviewStore.setOverrides(overrides);
    }, [activityPreviewStore, allTasks, task.activityChain, task.id]);

    // Drag/resize of one activity: day-snapped, committed as a whole updated task.
    useEffect(() => {
      if (!activityDrag) return;
      const startInfo = activityDragStart.current;
      if (!startInfo) return;
      const onMove = (event: MouseEvent) => {
        const rawDelta = Math.round((event.clientX - startInfo.x) / dayWidth);
        let clamped = rawDelta;
        if (activityDrag.mode === 'resize-left') clamped = Math.min(rawDelta, startInfo.durationDays - 1);
        if (activityDrag.mode === 'resize-right') clamped = Math.max(rawDelta, -(startInfo.durationDays - 1));
        setActivityDrag(current => (current ? { ...current, dayDelta: clamped } : current));
        setActivityTipPosition({
          left: Math.min(event.clientX + 14, window.innerWidth - 200),
          top: Math.min(event.clientY + 18, window.innerHeight - 60),
        });
        publishChainPreview(activityDrag.id, activityDrag.mode, clamped);
      };
      const onUp = () => {
        activityPreviewStore?.clear();
        if (activityDrag.dayDelta !== 0) {
          const clampLeft = Math.min(activityDrag.dayDelta, startInfo.durationDays - 1);
          const clampRight = Math.max(activityDrag.dayDelta, -(startInfo.durationDays - 1));
          const updatedActivities = (task.activities ?? []).map(activity => {
            if (activity.id !== activityDrag.id) return activity;
            if (activityDrag.mode === 'move') {
              return {
                ...activity,
                startDate: toIsoDay(shiftActivityDay(activity.startDate, activityDrag.dayDelta)),
                endDate: toIsoDay(shiftActivityDay(activity.endDate, activityDrag.dayDelta)),
              };
            }
            if (activityDrag.mode === 'resize-left') {
              return { ...activity, startDate: toIsoDay(shiftActivityDay(activity.startDate, clampLeft)) };
            }
            return { ...activity, endDate: toIsoDay(shiftActivityDay(activity.endDate, clampRight)) };
          });
          // ОН-конвейер: последующие работы строки и те же работы нижних этажей
          // сдвигаются на изменение окончания изменённой работы.
          const endDeltaDays = chainEndDeltaDays(activityDrag.mode, activityDrag.dayDelta, startInfo.durationDays);
          const chainShifts = endDeltaDays !== 0
            ? shiftActivityChain(allTasks ?? [], task.id, activityDrag.id, endDeltaDays)
            : [];
          const changedTasks: Task[] = [];
          let hostHandled = false;
          for (const shift of chainShifts) {
            if (shift.taskId === task.id) {
              hostHandled = true;
              changedTasks.push({
                ...normalizedTask,
                activities: shift.activities.map(activity => activity.id === activityDrag.id
                  ? (updatedActivities.find(item => item.id === activityDrag.id) ?? activity)
                  : activity),
              });
            } else {
              const source = (allTasks ?? []).find(candidate => candidate.id === shift.taskId);
              changedTasks.push({ ...(source ?? { id: shift.taskId }), activities: shift.activities } as Task);
            }
          }
          if (!hostHandled) {
            changedTasks.unshift({ ...normalizedTask, activities: updatedActivities });
          }
          onTasksChange?.(changedTasks);
        }
        setActivityDrag(null);
        activityDragStart.current = null;
        document.body.style.cursor = '';
      };
      document.body.style.cursor = activityDrag.mode === 'move' ? 'grabbing' : 'ew-resize';
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      return () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        document.body.style.cursor = '';
      };
    }, [activityDrag, activityPreviewStore, allTasks, dayWidth, normalizedTask, onTasksChange, publishChainPreview, task.activities]);

    const handleActivityPointerDown = (segment: ActivitySegment, mode: ActivityDragMode) => (event: React.MouseEvent) => {
      if (!activityDragEnabled) return;
      event.preventDefault();
      event.stopPropagation();
      activityDragStart.current = {
        x: event.clientX,
        durationDays: Math.max(1, Math.round(segment.width / dayWidth) - 1),
      };
      setActivityDrag({ id: segment.id, mode, dayDelta: 0 });
    };

    const liveActivityGeometry = (segment: ActivitySegment): { left: number; width: number } => {
      if (!activityDrag || activityDrag.id !== segment.id || activityDrag.dayDelta === 0) return segment;
      if (activityDrag.mode === 'move') {
        return { left: segment.left + activityDrag.dayDelta * dayWidth, width: segment.width };
      }
      if (activityDrag.mode === 'resize-left') {
        return { left: segment.left + activityDrag.dayDelta * dayWidth, width: segment.width - activityDrag.dayDelta * dayWidth };
      }
      return { left: segment.left, width: segment.width + activityDrag.dayDelta * dayWidth };
    };

    const activityTipData = useMemo(() => {
      if (!activityTipId || !activityTipPosition || !task.activities) return null;
      const activity = task.activities.find(item => item.id === activityTipId);
      if (!activity) return null;
      let start = parseUTCDate(activity.startDate);
      let end = parseUTCDate(activity.endDate);
      if (activityDrag && activityDrag.id === activity.id && activityDrag.dayDelta !== 0) {
        start = shiftActivityDay(start, activityDrag.dayDelta);
        end = shiftActivityDay(end, activityDrag.dayDelta);
      }
      return {
        name: activity.name,
        start,
        end,
        durationDays: activityDurationDays({ startDate: start, endDate: end }),
        fields: activity.tooltipFields,
        left: activityTipPosition.left,
        top: activityTipPosition.top,
      };
    }, [activityDrag, activityTipId, activityTipPosition, task.activities]);

    // Format date labels for display - update in real-time for direct drag and cascade preview.
    const currentStartDate = hasPreviewPosition
      ? pixelsToDate(displayLeft, monthStart, dayWidth)
      : taskStartDate;
    const currentEndDate = hasPreviewPosition
      ? (
        milestone
          ? pixelsToDate(displayLeft, monthStart, dayWidth)
          : pixelsToDate(displayLeft + displayWidth - dayWidth, monthStart, dayWidth)
      )
      : taskEndDate;

    const dateRangeLabel = formatDateRangeLabel(currentStartDate, currentEndDate);

    // Calculate duration in days (calendar or business)
    const durationDays = businessDays
      ? getBusinessDaysCount(currentStartDate, currentEndDate, weekendPredicate)
      : Math.round(
        (currentEndDate.getTime() - currentStartDate.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;

    // Format child count label for parent tasks (Russian plural)
    const getChildCountLabel = (count: number): string => {
      if (count === 1) return '1 работа';
      // For 2, 3, 4 tasks use "работы" (genitive singular)
      // For 5+ tasks use "работ" (genitive plural)
      const lastTwoDigits = count % 100;
      const lastDigit = count % 10;
      if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return `${count} работ`;
      if (lastDigit === 1) return `${count} работа`;
      if (lastDigit >= 2 && lastDigit <= 4) return `${count} работы`;
      return `${count} работ`;
    };

    // Determine if progress text fits inside the bar
    // Parent bars have overflow: visible (for bracket ears), so threshold must be stricter:
    // "X работ 100%" ≈ 60–70px text + 16px padding = ~110px
    // Regular: "15 д 100%" ≈ 76px, "1 д 100%" ≈ 62px
    const estimatedTextWidth = isVisualParent ? 120 : (durationDays >= 10 ? 76 : 62);
    const showProgressInside = !milestone && progressWidth > 0 && displayWidth > (compactDetail ? 28 : estimatedTextWidth);

    // Determine if duration fits inside the bar
    // For 1-day tasks: always show duration outside (too narrow)
    // Parent bars: child count label is longer — need more space
    const MIN_DURATION_WIDTH = isVisualParent ? 80 : task.composite ? 92 : 50;
    const showDurationInside = !compactDetail && !milestone && durationDays >= 2 && displayWidth > MIN_DURATION_WIDTH;
    return (
      <div
        data-filter-match={isFilterMatch ? 'true' : 'false'}
        data-gantt-task-row-id={task.id}
        className={`gantt-tr-row ${compactDetail ? 'gantt-tr-row-compositeDetail' : ''} ${isFilterMatch ? 'gantt-tr-row-filter-match' : ''}`}
        style={{
          height: `${rowHeight}px`,
          '--gantt-tr-composite-detail-color': compositeParentColor ?? 'var(--gantt-task-bar-default-color, #8b5cf6)',
        } as React.CSSProperties}
      >
        {taskDivider === 'top' && <div className="gantt-tr-divider gantt-tr-divider-top" />}
        <div className="gantt-tr-taskContainer">
          {shouldRenderBaseline && !renderActivities && (
            <div
              className={`gantt-tr-baseline ${isParent ? 'gantt-tr-baseline-parent' : ''} ${milestone ? 'gantt-tr-baseline-milestone' : ''}`}
              style={{
                left: `${milestone ? baselineGeometry!.left + (dayWidth / 2) : baselineGeometry!.left}px`,
                width: `${milestone ? 0 : baselineGeometry!.width}px`,
              }}
            />
          )}
          {renderActivities && activityLayout && (
            <div className="gantt-tr-activityLanes">
              {activityLayout.segments.map(segment => {
                const live = liveActivityGeometry(segment);
                // Чужой конвейерный drag: живой сдвиг полосы из preview-стора.
                const chainDelta = activityOverrides?.get(segment.id) ?? 0;
                const liveLeft = live.left + (chainDelta !== 0 ? chainDelta * dayWidth : 0);
                const isDraggingActivity = activityDrag?.id === segment.id;
                return (
                  <div
                    key={segment.id}
                    data-activity-id={segment.id}
                    className={`gantt-tr-activityBar${isDraggingActivity ? ' gantt-tr-activityBar-dragging' : ''}${activityDragEnabled ? '' : ' gantt-tr-activityBar-locked'}`}
                    style={{
                      left: `${liveLeft}px`,
                      width: `${live.width}px`,
                      top: `${activityTopOffset + segment.lane * ACTIVITY_LANE_STEP + (ACTIVITY_LANE_STEP - ACTIVITY_LANE_BAR_HEIGHT) / 2}px`,
                      height: `${ACTIVITY_LANE_BAR_HEIGHT}px`,
                      backgroundColor: segment.color || 'var(--gantt-task-bar-default-color)',
                    }}
                    onMouseDown={event => {
                      const target = event.target as HTMLElement;
                      const mode: ActivityDragMode = target.closest('.gantt-tr-resizeHandleLeft')
                        ? 'resize-left'
                        : target.closest('.gantt-tr-resizeHandleRight')
                          ? 'resize-right'
                          : 'move';
                      handleActivityPointerDown(segment, mode)(event);
                    }}
                    onMouseEnter={event => {
                      if (activityDrag) return;
                      const rect = event.currentTarget.getBoundingClientRect();
                      setActivityTipPosition({
                        left: Math.max(8, Math.min(rect.left, window.innerWidth - 200)),
                        top: rect.bottom + 54 < window.innerHeight ? rect.bottom + 6 : Math.max(8, rect.top - 54),
                      });
                      setActivityTipId(segment.id);
                    }}
                    onMouseLeave={() => {
                      if (!activityDrag) {
                        setActivityTipId(current => (current === segment.id ? null : current));
                        setActivityTipPosition(null);
                      }
                    }}
                  >
                    <span className="gantt-tr-activityName">{segment.name}</span>
                    {activityDragEnabled && (
                      <>
                        <div className="gantt-tr-resizeHandle gantt-tr-resizeHandleLeft" />
                        <div className="gantt-tr-resizeHandle gantt-tr-resizeHandleRight" />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {!renderActivities && (
          <div
            data-taskbar
            role={task.composite ? 'button' : undefined}
            tabIndex={task.composite ? 0 : undefined}
            aria-label={task.composite ? `${task.name}: ${compositeExpanded ? 'свернуть' : 'раскрыть'} детали` : undefined}
            aria-expanded={task.composite ? compositeExpanded : undefined}
            className={`gantt-tr-taskBar ${isDragging ? 'gantt-tr-dragging' : ''} ${task.locked ? 'gantt-tr-locked' : ''} ${task.synced === false ? 'gantt-tr-unsynced' : ''} ${isVisualParent ? 'gantt-tr-parentBar' : ''} ${task.composite ? 'gantt-tr-compositeBar' : ''} ${milestone ? 'gantt-tr-milestone' : ''} ${isCritical ? 'gantt-tr-critical' : ''}`}
            style={{
              left: `${visualLeft}px`,
              ...barStyle,
              ...(milestone
                ? {
                  height: `${displayMilestoneGeometry.size}px`,
                  width: `${displayMilestoneGeometry.size}px`,
                  padding: 0,
                }
                : {
                  width: `${visualWidth}px`,
                  height: compactDetail ? '18px' : isVisualParent ? 'var(--gantt-parent-bar-height, 14px)' : 'var(--gantt-task-bar-height)',
                }),
              cursor: dragHandleProps.style.cursor,
              userSelect: dragHandleProps.style.userSelect,
            }}
            onMouseDown={dragHandleProps.onMouseDown}
            onMouseMove={dragHandleProps.onMouseMove}
            onMouseLeave={() => { dragHandleProps.onMouseLeave(); setShowCompositePreview(false); }}
            onMouseEnter={task.composite ? event => {
              const rect = event.currentTarget.getBoundingClientRect();
              const previewWidth = 220;
              const previewHeight = Math.min(340, 68 + Math.min(compositeChildren.length, 12) * 20);
              setCompositePreviewPosition({
                left: Math.max(8, Math.min(rect.left, window.innerWidth - previewWidth - 8)),
                top: rect.bottom + previewHeight + 8 < window.innerHeight
                  ? rect.bottom + 6
                  : Math.max(8, rect.top - previewHeight - 6),
              });
              setShowCompositePreview(true);
            } : undefined}
            onMouseDownCapture={task.composite ? event => {
              suppressCompositeClick.current = Boolean((event.target as HTMLElement).closest('.gantt-tr-resizeHandle'));
              pointerStart.current = { x: event.clientX, y: event.clientY };
            } : undefined}
            onMouseMoveCapture={task.composite ? event => {
              const start = pointerStart.current;
              if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) >= 4) {
                suppressCompositeClick.current = true;
              }
            } : undefined}
            onMouseUpCapture={task.composite ? event => {
              const start = pointerStart.current;
              if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) >= 4) {
                suppressCompositeClick.current = true;
              }
              pointerStart.current = null;
            } : undefined}
            onClick={task.composite ? () => {
              if (!isDragging && !suppressCompositeClick.current) {
                setShowCompositePreview(false);
                onCompositeToggle?.('click');
              }
              suppressCompositeClick.current = false;
            } : undefined}
            onKeyDown={task.composite ? event => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onCompositeToggle?.('keyboard');
              }
            } : undefined}
          >
            {!milestone && progressWidth > 0 && progressWidth < 100 && (
              <div
                className="gantt-tr-progressBar"
                style={{
                  width: `${progressWidth}%`,
                  backgroundColor: progressColor,
                  ...(isVisualParent && {
                    borderRadius: 'var(--gantt-parent-bar-radius, 8px) 0 0 0',
                  }),
                }}
              />
            )}
            {/* Parents are resizable: the resize scales the whole subtree proportionally. */}
            {!milestone && <div className="gantt-tr-resizeHandle gantt-tr-resizeHandleLeft" />}
            {shouldRenderCompositeSegments && (
              <span className="gantt-tr-compositeSegments" aria-hidden="true">
                {compositeSegments.map(segment => (
                  <span
                    key={segment.id}
                    className="gantt-tr-compositeSegment"
                    style={{
                      left: `${segment.left}%`,
                      width: `${segment.width}%`,
                      top: `${segment.lane / compositeLaneCount * 100}%`,
                      height: `${100 / compositeLaneCount}%`,
                    }}
                  />
                ))}
                {compositeSegments.map(segment => (
                  segment.cut
                    ? (
                      <span
                        key={`${segment.id}-cut`}
                        className="gantt-tr-compositeSegmentCut"
                        style={{
                          left: `${segment.left}%`,
                          top: `${segment.lane / compositeLaneCount * 100}%`,
                          height: `${100 / compositeLaneCount}%`,
                        }}
                      />
                    )
                    : null
                ))}
              </span>
            )}
            {task.composite && (
              <span className="gantt-tr-compositeHoverChevron" aria-hidden="true">
                <svg className={`gantt-tr-compositeChevron${compositeExpanded ? ' gantt-tr-compositeChevron-open' : ''}`} viewBox="0 0 20 20">
                  <path d="m7 4 6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            )}
            {showDurationInside && (
              <span className="gantt-tr-taskDuration">
                {isVisualParent ? getChildCountLabel(childCount) : `${durationDays} д`}
              </span>
            )}
            {progressWidth > 0 && showProgressInside && (
              <span className="gantt-tr-progressText">
                {progressWidth}%
              </span>
            )}
            {!milestone && <div className="gantt-tr-resizeHandle gantt-tr-resizeHandleRight" />}
          </div>
          )}
          {task.composite && showCompositePreview && compositePreviewPosition && compositeChildren.length > 0 && !isDragging && typeof document !== 'undefined' && createPortal(
            <div
              className="gantt-tr-compositePreview"
              style={{ left: `${compositePreviewPosition.left}px`, top: `${compositePreviewPosition.top}px` }}
              role="tooltip"
            >
              <div className="gantt-tr-compositePreviewAxis">
                <span>{formatCompositePreviewDate(currentStartDate)}</span>
                <span>{formatCompositePreviewDate(currentEndDate)}</span>
              </div>
              {compositeChildren.slice(0, 12).map(child => (
                <div key={child.id} className="gantt-tr-compositePreviewRow">
                  <span>{child.name}</span>
                  <span className="gantt-tr-compositePreviewTrack">
                    <span
                      className="gantt-tr-compositePreviewBar"
                      style={{
                        left: `${Math.max(0, (parseUTCDate(child.startDate).getTime() - taskStartDate.getTime()) / (taskEndDate.getTime() - taskStartDate.getTime() + 86400000) * 100)}%`,
                        width: `${Math.max(2, (parseUTCDate(child.endDate).getTime() - parseUTCDate(child.startDate).getTime() + 86400000) / (taskEndDate.getTime() - taskStartDate.getTime() + 86400000) * 100)}%`,
                        backgroundColor: barColor,
                      }}
                    />
                  </span>
                </div>
              ))}
              {compositeChildren.length > 12 && <div>+{compositeChildren.length - 12}</div>}
            </div>,
            document.body
          )}
          {activityTipData && typeof document !== 'undefined' && createPortal(
            <div
              className="gantt-tr-activityTip"
              style={{ left: `${activityTipData.left}px`, top: `${activityTipData.top}px` }}
              role="tooltip"
            >
              <div className="gantt-tr-activityTipName">{activityTipData.name}</div>
              <div className="gantt-tr-activityTipDates">
                {formatDateRangeLabel(activityTipData.start, activityTipData.end)} · {activityTipData.durationDays} д
              </div>
              {(activityTipData.fields ?? []).map(field => (
                <div key={field.label} className="gantt-tr-activityTipField">
                  <span className="gantt-tr-activityTipFieldLabel">{field.label}</span>
                  <span className="gantt-tr-activityTipFieldValue">{field.value}</span>
                </div>
              ))}
            </div>,
            document.body
          )}
          {!disableDependencyEditing && onDependencyPortPointerDown && !renderActivities && (
            <>
              <button
                type="button"
                data-gantt-dependency-port
                data-task-id={task.id}
                data-port-side="left"
                className={`gantt-tr-dependencyPort gantt-tr-dependencyPortLeft ${milestone ? 'gantt-tr-dependencyPortMilestone' : ''} ${isVisualParent ? 'gantt-tr-dependencyPortParent' : ''} ${isDependencyDragActive ? 'gantt-tr-dependencyPortDragActive' : ''}`}
                style={{ left: `${visualLeft - 24}px` }}
                aria-label={`Начать связь от левого края: ${task.name}`}
                title="Потяните к краю другой полосы, чтобы создать связь"
                onPointerDown={(event) => onDependencyPortPointerDown(task.id, 'left', event)}
              />
              <button
                type="button"
                data-gantt-dependency-port
                data-task-id={task.id}
                data-port-side="right"
                className={`gantt-tr-dependencyPort gantt-tr-dependencyPortRight ${milestone ? 'gantt-tr-dependencyPortMilestone' : ''} ${isVisualParent ? 'gantt-tr-dependencyPortParent' : ''} ${isDependencyDragActive ? 'gantt-tr-dependencyPortDragActive' : ''}`}
                style={{ left: `${visualLeft + visualWidth}px` }}
                aria-label={`Начать связь от правого края: ${task.name}`}
                title="Потяните к краю другой полосы, чтобы создать связь"
                onPointerDown={(event) => onDependencyPortPointerDown(task.id, 'right', event)}
              />
            </>
          )}
          {showTaskDateLabels && !renderActivities && (
            <div
              className={`gantt-tr-leftLabels ${task.locked ? 'gantt-tr-leftLabels-locked' : ''}`}
              style={{
                left: `${visualLeft}px`
              }}
            >
              <span className="gantt-tr-dateLabel gantt-tr-dateLabelLeft">
                {dateRangeLabel}
              </span>
            </div>
          )}
          {task.locked && !renderActivities && (
            <svg
              className="gantt-tr-lockIcon"
              style={{
                position: 'absolute',
                left: `${visualLeft - 16}px`,
                top: '50%',
                transform: 'translateY(-50%)',
                width: '12px',
                height: '12px',
                color: '#444',
                pointerEvents: 'none',
              }}
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-label="Locked"
              aria-hidden="false"
            >
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
            </svg>
          )}
          {!showDurationInside && !milestone && !renderActivities && (
            <span
              className={`gantt-tr-externalDuration gantt-tr-durationBeforeBar${compactDetail ? ' gantt-tr-compositeDuration' : ''}`}
              style={{ left: `${visualLeft - 46}px`, color: isParent ? (task.color || defaultParentBarColor) : barColor }}
            >
              {isVisualParent ? getChildCountLabel(childCount) : `${durationDays} д`}
            </span>
          )}
          {!renderActivities && (
          <div
            className="gantt-tr-rightLabels"
            style={{
              left: `${visualLeft + Math.max(visualWidth, 20) - Math.min(6, Math.max(visualWidth, 20) / 2) + 8}px`,
              color: isParent ? (task.color || defaultParentBarColor) : barColor,
            }}
          >
            {progressWidth > 0 && !showProgressInside && (
              <span className="gantt-tr-externalProgress">
                {progressWidth}%
              </span>
            )}
            {showTaskNames && (
              <span
                className="gantt-tr-externalTaskName"
                style={{ color: externalTaskNameColor }}
              >
                {task.name}
              </span>
            )}
          </div>
          )}
        </div>
        {taskDivider === 'bottom' && <div className="gantt-tr-divider gantt-tr-divider-bottom" />}
      </div>
    );
  },
  arePropsEqual
);

TaskRow.displayName = 'TaskRow';

export default TaskRow;

