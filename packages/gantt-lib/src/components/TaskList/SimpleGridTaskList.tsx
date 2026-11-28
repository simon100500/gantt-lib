// START_MODULE_CONTRACT
// PURPOSE: Render the native SimpleGrid as GanttChart's task list with the full gantt-lib visual layer restored on top.
// SCOPE: Present visible task rows, shared geometry, hierarchy connector lines, dependency chips, duration/progress/date displays and editable fields; delegate mutations to GanttChart.
// INPUTS: Visible tasks and row geometry, collapsed tree state, selected dependency chip and host callbacks.
// OUTPUTS: SimpleGrid row changes, dependency edits and expand/collapse events; no scheduling side effects beyond task updates.
// DEPENDS: SimpleGridVendor, TaskList visuals (DepChip, DepIcons, TaskList.css), GanttChart task types.
// END_MODULE_CONTRACT
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Task, TaskDependency } from '../GanttChart';
import type { TaskListActionContext, TaskListMenuCommand } from '../GanttChart/GanttChart';
import type { LinkType, TaskDateChangeMode } from '../../types';
import type { CustomDayConfig } from '../../utils/dateUtils';
import { parseUTCDate, createCustomDayPredicate } from '../../utils/dateUtils';
import {
  addBusinessDays,
  alignToWorkingDay,
  areTasksHierarchicallyRelated,
  buildTaskRangeFromEnd,
  buildTaskRangeFromStart,
  calculateSuccessorDate,
  clampTaskRangeForIncomingFS,
  getDependencyLag,
  getTaskDuration,
  normalizeDependencyLag,
  recalculateIncomingLags,
  subtractBusinessDays,
  validateDependencies,
} from '../../core/scheduling';
import { SimpleGrid } from '../SimpleGridVendor/SimpleGrid';
import type { SimpleGridColumn, SimpleGridEditorProps, SimpleGridRowDropPlacement } from '../SimpleGridVendor/types';
import { GenerationSkeletonRows } from '../GenerationSkeleton';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/Popover';
import { getVisibleReorderPlan } from '../../utils/taskListReorder';
import { NewTaskRow } from './NewTaskRow';
import { buildDefaultTaskDateRange, getTodayISODate } from './defaultTaskDates';
import { duplicateTaskSubtree } from './TaskList';
import { resolveTaskListColumns } from './columns/resolveTaskListColumns';
import type { TaskListColumn, TaskListColumnContext, TaskListColumnId, TaskListColumnWidthMap } from './columns/types';
import { buildTaskNumberMap } from './taskNumbering';
import { LINK_TYPE_ICONS, LINK_TYPE_LABELS } from './DepIcons';
import { DepChip } from './TaskListRow';
import { getFixedTaskDate, getTaskDatePin, taskDateISO as toISODate } from './taskDatePin';
import './TaskList.css';
import './SimpleGridTaskList.css';

const NO_FILTERS: [] = [];
const EMPTY_COLUMNS: [] = [];
const taskKey = (task: Task) => task.id;
const LINK_TYPE_ORDER: LinkType[] = ['FS', 'SS', 'FF', 'SF'];
const wrappedTextEditorStyle: React.CSSProperties = {
  paddingBlock: 0,
  whiteSpace: 'pre-wrap',
  overflowWrap: 'break-word',
  overflowY: 'auto',
};

type CustomEditorData<TTask extends Task> = {
  column: TaskListColumn<TTask>;
  updateTask: (task: TTask, patch: Partial<TTask>) => void;
};

function CustomColumnEditor<TTask extends Task>({ row, rowIndex, value, cancel, editorData }: SimpleGridEditorProps) {
  const { column, updateTask } = editorData as CustomEditorData<TTask>;
  const task = row as TTask;
  const render = column.renderEditor ?? column.renderCell;
  return <div className="gantt-simple-grid-custom" data-sg-editor="" data-custom-column-editor={column.id}
    onMouseDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}>
    {render({
      task, rowIndex: rowIndex ?? 0, isEditing: true, editStartValue: value,
      openEditor: () => {}, closeEditor: cancel,
      updateTask: patch => updateTask(task, patch),
    })}
  </div>;
}

type DependencyChipKey = { successorId: string; predecessorId: string; linkType: string };

/** The legacy TaskList displayed dates as dd.MM.yy via its DatePicker. */
const formatDateLabel = (value: string | Date): string => {
  const iso = toISODate(value);
  const [year, month, day] = iso.split('-');
  if (!year || !month || !day) return iso;
  return `${day}.${month}.${year.slice(2)}`;
};

const ChevronRightIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m9 18 6-6-6-6" />
  </svg>
);

interface Props<TTask extends Task> {
  tasks: TTask[];
  allTasks: TTask[];
  rowHeight: number;
  rowHeights: number[];
  headerHeight: number;
  width: number;
  show: boolean;
  hasRightShadow?: boolean;
  bodyMinHeight?: number | string;
  skeletonRowCount?: number;
  rowContentLines?: number;
  visibleRowIndices?: readonly number[];
  onRevealRow?: (index: number) => void;
  getRowScrollContainer?: () => HTMLElement | null;
  collapsed: Set<string>;
  onToggleCollapse: (id: string) => void;
  onChange: (rows: Task[], editedColumnId?: string) => boolean;
  onPasteOverflow?: () => void;
  nameReadOnly: boolean;
  readOnly: boolean;
  hiddenColumns?: readonly TaskListColumnId[];
  onHiddenColumnsChange?: (ids: TaskListColumnId[]) => void;
  columnWidths?: TaskListColumnWidthMap;
  onColumnWidthsChange?: (widths: TaskListColumnWidthMap) => void;
  additionalColumns?: TaskListColumn<TTask>[];
  error: string;
  onTaskSelect: (id: string | null) => void;
  selectedTaskId?: string | null;
  enableTaskMultiSelect?: boolean;
  selectedTaskIds?: Set<string>;
  onSelectedTaskIdsChange?: (ids: Set<string>) => void;
  /** Edits that SimpleGrid's rectangular change channel cannot express (dependencies, lags, link types). */
  onTaskEdit?: (updatedTasks: Task[]) => void;
  onFixedDateChange?: (updatedTasks: TTask[]) => void;
  /** Legacy scheduling boundary for duration edits (GanttChart.handleTaskDurationChange). */
  onReorder?: (tasks: Task[], movedTaskId?: string, parentId?: string) => void;
  disableReorder?: boolean;
  onAdd?: (task: Task) => void;
  enableAddTask?: boolean;
  addTaskLabel?: string;
  onInsertAfter?: (id: string, task: Task) => void;
  onDelete?: (id: string) => void;
  onPromote?: (id: string) => void;
  onDemote?: (id: string, parentId: string) => void;
  onUngroup?: (id: string) => void;
  defaultTaskDurationDays?: number;
  menuCommands?: TaskListMenuCommand<TTask>[];
  renderActions?: (context: TaskListActionContext<TTask>) => React.ReactNode;
  renderMenu?: (context: TaskListActionContext<TTask>, commands: React.ReactNode) => React.ReactNode;
  renderTaskDateAction?: (task: TTask, boundary: 'start' | 'end') => React.ReactNode;
  hideActions?: boolean;
  getRowClassName?: (task: TTask) => string | undefined;
  dateChangeMode?: TaskDateChangeMode;
  onDateChangeModeChange?: (mode: TaskDateChangeMode) => void;
  /** Selected dependency chip shared with the chart arrows. */
  selectedChip?: DependencyChipKey | null;
  onSelectedChipChange?: (chip: DependencyChipKey | null) => void;
  onScrollToTask?: (taskId: string) => void;
  businessDays?: boolean;
  customDays?: CustomDayConfig[];
  isWeekend?: (date: Date) => boolean;
  /** Task IDs highlighted by the active filter (yellow row tint, like the legacy TaskList). */
  highlightedTaskIds?: Set<string>;
  /** Fill parent rows with background in the task list. */
  fillParentRows?: boolean | ((task: TTask) => boolean);
  disableDependencyEditing?: boolean;
  /** Render dependencies as compact text for print/export layouts instead of interactive chips. */
  printDependencyLabels?: boolean;
  /** Optional icon rendered before the task name inside rows. */
  getTaskListNamePrefixIcon?: (task: TTask) => React.ReactNode;
}

function formatDependencyPrintLabel(
  dep: { taskId: string; type: LinkType },
  predecessorTaskNumber: string | undefined,
  lag: number | undefined,
): string {
  const effectiveLag = lag ?? 0;
  const lagSuffix = effectiveLag === 0 ? '' : effectiveLag > 0 ? `+${effectiveLag}` : String(effectiveLag);
  return `[${predecessorTaskNumber ?? dep.taskId}]${LINK_TYPE_LABELS[dep.type]}${lagSuffix}`;
}

export function SimpleGridTaskList<TTask extends Task>({
  tasks, allTasks, rowHeight, rowHeights, headerHeight, width, show, collapsed, onToggleCollapse, onChange,
  nameReadOnly, readOnly, hiddenColumns: controlledHiddenColumns, onHiddenColumnsChange,
  columnWidths, onColumnWidthsChange, additionalColumns = EMPTY_COLUMNS,
  error, onTaskSelect, selectedTaskId, enableTaskMultiSelect,
  selectedTaskIds, onSelectedTaskIdsChange, onTaskEdit, onFixedDateChange, selectedChip, onSelectedChipChange, onScrollToTask,
  businessDays, customDays, isWeekend, highlightedTaskIds, fillParentRows, disableDependencyEditing,
  printDependencyLabels, getTaskListNamePrefixIcon, hasRightShadow, visibleRowIndices, onRevealRow,
  onPasteOverflow, getRowScrollContainer,
  bodyMinHeight, skeletonRowCount = 0, rowContentLines = 1,
  onReorder, disableReorder, onAdd, enableAddTask, addTaskLabel = 'Добавить задачу', onInsertAfter,
  onDelete, onPromote, onDemote, onUngroup, defaultTaskDurationDays, menuCommands, renderActions, renderMenu,
  hideActions, getRowClassName, dateChangeMode, onDateChangeModeChange, renderTaskDateAction,
}: Props<TTask>) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [internalHiddenColumns, setInternalHiddenColumns] = useState<TaskListColumnId[]>([]);
  const [columnMenuAnchor, setColumnMenuAnchor] = useState<TaskListColumnId | null>();
  const hiddenColumns = controlledHiddenColumns ?? internalHiddenColumns;
  const weekendPredicate = useMemo(
    () => createCustomDayPredicate({ customDays, isWeekend }),
    [customDays, isWeekend],
  );
  const byId = useMemo(() => new Map(allTasks.map(task => [task.id, task])), [allTasks]);
  const parents = useMemo(
    () => new Set(allTasks.flatMap(task => task.parentId ? [task.parentId] : [])),
    [allTasks],
  );
  const heights = useMemo(
    () => Object.fromEntries(tasks.map((task, index) => [task.id, rowHeights[index] ?? rowHeight])),
    [tasks, rowHeights, rowHeight],
  );
  const numberMap = useMemo(
    () => Object.fromEntries(buildTaskNumberMap(allTasks)) as Record<string, string>,
    [allTasks],
  );
  const [actionMenuTaskId, setActionMenuTaskId] = useState<string | null>(null);
  const [newTaskAnchor, setNewTaskAnchor] = useState<Task | 'root' | null>(null);
  const [durationPreview, setDurationPreview] = useState<TTask | null>(null);
  const canReorder = !!onReorder && !disableReorder;
  const resolveRowDrop = useCallback((moved: TTask, target: TTask, placement: SimpleGridRowDropPlacement) => {
    if (!onReorder || moved.locked || (moved.id === target.id && placement !== 'end')) return;
    if (placement === 'inside' && target.type === 'milestone') return;
    const targetIndex = tasks.indexOf(target);
    const plan = getVisibleReorderPlan(allTasks, tasks, moved.id, {
      index: targetIndex, placement, allowExistingParent: true,
    });
    if (!plan || (plan.originOrderedIndex === plan.insertIndex && (moved.parentId || undefined) === plan.inferredParentId)) return;
    const subtree = new Set([moved.id]);
    for (const task of allTasks) {
      if (task.parentId && subtree.has(task.parentId)) subtree.add(task.id);
    }
    const reordered = allTasks.filter(task => !subtree.has(task.id));
    reordered.splice(plan.insertIndex, 0, ...allTasks.filter(task => subtree.has(task.id)));
    return () => {
      onReorder(reordered, moved.id, plan.inferredParentId);
      onTaskSelect(moved.id);
    };
  }, [allTasks, tasks, onReorder, onTaskSelect]);

  // --- Dependency editing state (ported from TaskList) ---
  const [activeLinkType, setActiveLinkType] = useState<LinkType>('FS');
  const [dependencyPickMode, setDependencyPickMode] = useState<'predecessor' | 'successor'>('successor');
  const [selectingPredecessorFor, setSelectingPredecessorFor] = useState<string | null>(null);
  const [dependencyError, setDependencyError] = useState<string | null>(null);
  const [overflowOpenTaskId, setOverflowOpenTaskId] = useState<string | null>(null);
  const [dependencySearchQuery, setDependencySearchQuery] = useState('');
  const [highlightedDependencyIndex, setHighlightedDependencyIndex] = useState(0);
  const dependencySearchListRef = useRef<HTMLDivElement>(null);
  const reportDependencyError = useCallback((message: string) => {
    setDependencyError(message);
    window.setTimeout(() => setDependencyError(null), 3000);
  }, []);

  const rowFillFor = useCallback((task: Task): string | undefined => {
    if (selectedChip && (selectedChip.successorId === task.id || selectedChip.predecessorId === task.id)) {
      return 'rgba(37, 99, 235, 0.12)';
    }
    if (highlightedTaskIds?.has(task.id)) return 'rgba(250, 204, 21, 0.24)';
    if (task.id === selectedTaskId) return 'var(--gantt-row-selected-background, rgba(59, 130, 246, 0.10))';
    const fillParent = typeof fillParentRows === 'function' ? fillParentRows(task as TTask) : fillParentRows;
    if (fillParent && parents.has(task.id)) {
      return 'var(--gantt-plan-fact-parent-row-background, rgba(148, 163, 184, 0.22))';
    }
    if (selectingPredecessorFor != null) return 'rgba(59, 130, 246, 0.04)';
    return undefined;
  }, [selectedChip, highlightedTaskIds, selectedTaskId, fillParentRows, parents, selectingPredecessorFor]);
  const rowHeaderLabel = useCallback((task: Task) => (
    <span
      data-sg-row-drag-handle={canReorder && !task.locked ? '' : undefined}
      className="gantt-simple-grid-number"
      title={canReorder && !task.locked ? 'Перетащить задачу' : undefined}
    >
      {numberMap[task.id] || ''}
    </span>
  ), [canReorder, numberMap]);

  const handleRemoveDependency = useCallback((taskId: string, predecessorTaskId: string, linkType: LinkType) => {
    const task = allTasks.find(item => item.id === taskId);
    if (!task) return;
    onTaskEdit?.([{
      ...task,
      dependencies: (task.dependencies ?? []).filter(
        dep => !(dep.taskId === predecessorTaskId && dep.type === linkType),
      ),
    }]);
  }, [allTasks, onTaskEdit]);

  const handleAddDependency = useCallback((
    successorTaskId: string,
    predecessorTaskId: string,
    linkType: LinkType,
  ) => {
    if (successorTaskId === predecessorTaskId) return;
    if (areTasksHierarchicallyRelated(successorTaskId, predecessorTaskId, allTasks)) {
      reportDependencyError('Связи между родителем и потомком запрещены');
      setSelectingPredecessorFor(null);
      return;
    }
    const successor = byId.get(successorTaskId);
    if (!successor) return;
    const alreadyExists = (successor.dependencies ?? []).some(
      dep => dep.taskId === predecessorTaskId && dep.type === linkType,
    );
    if (alreadyExists) {
      setSelectingPredecessorFor(null);
      return;
    }

    const newDep: TaskDependency = { taskId: predecessorTaskId, type: linkType, lag: 0 };
    const hypothetical = allTasks.map(task =>
      task.id === successorTaskId
        ? { ...task, dependencies: [...(task.dependencies ?? []), newDep] }
        : task,
    );
    const validation = validateDependencies(hypothetical);
    if (!validation.isValid) {
      const hasHierarchyConstraint = validation.errors.some(item => item.type === 'constraint');
      reportDependencyError(
        hasHierarchyConstraint
          ? 'Связи между родителем и потомком запрещены'
          : 'Цикл зависимостей!',
      );
      return;
    }

    const updatedTask = hypothetical.find(task => task.id === successorTaskId)!;
    const predecessor = byId.get(predecessorTaskId);
    if (predecessor) {
      const predStart = new Date(predecessor.startDate as string);
      const predEnd = predecessor.type === 'milestone' ? predStart : new Date(predecessor.endDate as string);
      const constraintDate = calculateSuccessorDate(
        predStart,
        predEnd,
        linkType,
        0,
        businessDays ?? true,
        weekendPredicate,
        updatedTask.type,
      );
      const duration = getTaskDuration(
        successor.startDate,
        successor.endDate,
        businessDays ?? true,
        weekendPredicate,
      );
      let newStart: Date;
      let newEnd: Date;
      if (linkType === 'FS' || linkType === 'SS') {
        ({ start: newStart, end: newEnd } = buildTaskRangeFromStart(
          constraintDate,
          duration,
          businessDays ?? true,
          weekendPredicate,
        ));
      } else {
        ({ start: newStart, end: newEnd } = buildTaskRangeFromEnd(
          constraintDate,
          duration,
          businessDays ?? true,
          weekendPredicate,
        ));
      }
      onTaskEdit?.([{
        ...updatedTask,
        startDate: newStart.toISOString().split('T')[0],
        endDate: newEnd.toISOString().split('T')[0],
      }]);
    } else {
      onTaskEdit?.([updatedTask]);
    }
    setSelectingPredecessorFor(null);
  }, [allTasks, byId, businessDays, weekendPredicate, onTaskEdit, reportDependencyError]);

  const handleChipSelect = useCallback((chip: DependencyChipKey | null) => {
    onSelectedChipChange?.(chip);
  }, [onSelectedChipChange]);

  // Escape / outside-click cancel for picker mode and chip selection (ported from TaskList).
  useEffect(() => {
    if (!selectingPredecessorFor && !selectedChip) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectingPredecessorFor(null);
        onSelectedChipChange?.(null);
      }
    };
    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as Element;
      if (overlayRef.current?.contains(target)) return;
      if (target.closest?.('[data-taskbar]')) return;
      if (target.closest?.('.gantt-popover')) return;
      setSelectingPredecessorFor(null);
      onSelectedChipChange?.(null);
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown, true);
    };
  }, [selectingPredecessorFor, selectedChip, onSelectedChipChange]);

  useEffect(() => {
    if (selectingPredecessorFor == null && dependencySearchQuery !== '') {
      setDependencySearchQuery('');
    }
  }, [selectingPredecessorFor, dependencySearchQuery]);

  useEffect(() => {
    setHighlightedDependencyIndex(0);
  }, [dependencySearchQuery, selectingPredecessorFor, dependencyPickMode]);

  // --- Hierarchy geometry (ported from TaskList/TaskListRow) ---
  const depthMap = useMemo(() => {
    const depths = new Map<string, number>();
    for (const task of tasks) {
      let depth = 0;
      let current = byId.get(task.id);
      const seen = new Set<string>([task.id]);
      while (current?.parentId && byId.has(current.parentId) && !seen.has(current.parentId)) {
        seen.add(current.parentId);
        depth += 1;
        current = byId.get(current.parentId);
      }
      depths.set(task.id, depth);
    }
    return depths;
  }, [tasks, byId]);

  const lastChildIds = useMemo(() => {
    const last = new Set<string>();
    const seenParents = new Set<string>();
    for (let index = tasks.length - 1; index >= 0; index -= 1) {
      const task = tasks[index];
      if (task.parentId && !seenParents.has(task.parentId)) {
        last.add(task.id);
        seenParents.add(task.parentId);
      }
    }
    return last;
  }, [tasks]);

  const visibleParentIds = useMemo(
    () => new Set(tasks.map(task => task.parentId).filter((parentId): parentId is string => Boolean(parentId))),
    [tasks],
  );

  const ancestorLineModesMap = useMemo(() => {
    const isDescendantOf = (taskId: string, ancestorId: string): boolean => {
      let current = byId.get(taskId);
      while (current?.parentId && byId.has(current.parentId)) {
        if (current.parentId === ancestorId) return true;
        current = byId.get(current.parentId);
      }
      return false;
    };
    const map = new Map<string, ('full' | 'half')[]>();
    for (let index = 0; index < tasks.length; index += 1) {
      const task = tasks[index];
      const ancestorIds: string[] = [];
      let current = byId.get(task.id);
      while (current?.parentId && byId.has(current.parentId)) {
        ancestorIds.unshift(current.parentId);
        current = byId.get(current.parentId);
      }
      const ancestorsAboveParent = ancestorIds.slice(0, -1);
      const modes = ancestorsAboveParent.map(ancestorId => {
        const hasLaterVisibleDescendant = tasks
          .slice(index + 1)
          .some(laterTask => isDescendantOf(laterTask.id, ancestorId));
        return hasLaterVisibleDescendant ? 'full' as const : 'half' as const;
      });
      map.set(task.id, modes);
    }
    return map;
  }, [tasks, byId]);

  // --- Cell renderers ---
  const hierarchyLineColor = (columnDepth: number) => (
    columnDepth % 2 === 0 ? '#93c5fd' : 'var(--gantt-hierarchy-line-color)'
  );

  const nameInset = useCallback((task: Task) => {
    const depth = depthMap.get(task.id) ?? 0;
    if (task.composite) return depth * 20 + 30;
    if (parents.has(task.id)) return depth * 20 + 28;
    return depth * 20 + 8;
  }, [depthMap, parents]);
  const renderNameCell = useCallback((task: TTask, actions: React.ReactNode) => {
    const depth = depthMap.get(task.id) ?? 0;
    const isParent = parents.has(task.id);
    const isChild = depth > 0;
    const isCollapsed = collapsed.has(task.id);
    const rowHeightPx = heights[task.id] ?? rowHeight;
    const lineCenter = Math.min(rowHeightPx, rowHeight) / 2;
    const modes = ancestorLineModesMap.get(task.id) ?? [];
    const isLastChild = lastChildIds.has(task.id);
    const hasVisibleChildren = visibleParentIds.has(task.id);
    const prefixIcon = getTaskListNamePrefixIcon?.(task);
    return (
      <>
        {isChild && (
          <>
            {modes.map((mode, index) => mode ? (
              <React.Fragment key={index}>
                <span
                  data-testid={`gantt-tl-ancestor-connector-${index}`}
                  style={{
                    position: 'absolute', left: index * 20 + 9, top: 0,
                    height: mode === 'half' ? lineCenter : rowHeightPx,
                    width: '1.5px', background: hierarchyLineColor(index),
                    borderRadius: '1px', pointerEvents: 'none',
                  }}
                />
                {mode === 'half' && (
                  <span
                    data-testid={`gantt-tl-ancestor-connector-cap-${index}`}
                    style={{
                      position: 'absolute', left: index * 20 + 9,
                      top: lineCenter - 0.75, width: '5px', height: '1.5px',
                      background: hierarchyLineColor(index), borderRadius: '1px', pointerEvents: 'none',
                    }}
                  />
                )}
              </React.Fragment>
            ) : null)}
            {depth > 0 && (
              <span
                data-testid="gantt-tl-child-connector-vertical"
                style={{
                  position: 'absolute', left: (depth - 1) * 20 + 9, top: 0,
                  height: isLastChild && !hasVisibleChildren ? lineCenter : rowHeightPx,
                  width: '1.5px', background: hierarchyLineColor(depth - 1),
                  borderRadius: '1px', pointerEvents: 'none',
                }}
              />
            )}
            <span
              style={{
                position: 'absolute', left: (depth - 1) * 20 + 9,
                top: lineCenter - 0.75, width: '8px', height: '1.5px',
                background: hierarchyLineColor(depth - 1), borderRadius: '1px', pointerEvents: 'none',
              }}
            />
            <span
              style={{
                position: 'absolute', left: (depth - 1) * 20 + 15,
                top: lineCenter - 2, width: '4px', height: '4px',
                borderRadius: '50%', background: hierarchyLineColor(depth - 1), pointerEvents: 'none',
              }}
            />
          </>
        )}
        {hasVisibleChildren && !isCollapsed && (task.composite ? isChild : isParent) && (
          <span
            data-testid="gantt-tl-parent-connector-tail"
            style={{
              position: 'absolute', left: depth * 20 + 9, top: lineCenter + 7,
              height: Math.max(0, rowHeightPx - lineCenter - 7), width: '1.5px',
              background: hierarchyLineColor(depth), borderRadius: '1px', pointerEvents: 'none',
            }}
          />
        )}
        {task.composite ? (
          <button
            type="button"
            className="gantt-tl-compositeToggle"
            style={{ left: depth * 20 - 3 }}
            aria-label={`${isCollapsed ? 'Раскрыть' : 'Свернуть'} ${task.name}`}
            aria-expanded={!isCollapsed}
            title={isCollapsed ? 'Раскрыть этажи' : 'Свернуть этажи'}
            onMouseDown={event => event.stopPropagation()}
            onClick={event => { event.stopPropagation(); onToggleCollapse(task.id); }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {isCollapsed
                ? <><path d="M21 5H11" /><path d="M21 12H11" /><path d="M21 19H11" /><path d="m3 8 4 4-4 4" /></>
                : <path d="m6 9 6 6 6-6" />}
            </svg>
          </button>
        ) : isParent ? (
          <button
            type="button"
            className={`gantt-tl-collapse-btn${isCollapsed ? ' gantt-tl-collapse-btn-collapsed' : ''}`}
            style={{ left: depth * 20 - 2 }}
            aria-label={`${isCollapsed ? 'Раскрыть' : 'Свернуть'} ${task.name}`}
            aria-expanded={!isCollapsed}
            onMouseDown={event => event.stopPropagation()}
            onClick={event => { event.stopPropagation(); onToggleCollapse(task.id); }}
          >
            <ChevronRightIcon />
          </button>
        ) : null}
        <div
          className="gantt-simple-grid-name"
          style={{ paddingLeft: nameInset(task) }}
        >
          {prefixIcon ? (
            <span className="gantt-tl-name-trigger-icon" aria-hidden="true">{prefixIcon}</span>
          ) : null}
          <span className="gantt-tl-name-trigger-text" title={task.name}>
            {task.name}
          </span>
          {actions}
          {task.color && (
            <span className="gantt-tl-name-color-stripe" style={{ backgroundColor: task.color }} aria-hidden="true" />
          )}
        </div>
      </>
    );
  }, [depthMap, parents, collapsed, heights, rowHeight, ancestorLineModesMap, lastChildIds, visibleParentIds, onToggleCollapse, getTaskListNamePrefixIcon, nameInset]);

  const getDurationFor = useCallback((task: Task) => (
    task.type === 'milestone' ? 0 : getTaskDuration(task.startDate, task.endDate, businessDays, weekendPredicate)
  ), [businessDays, weekendPredicate]);

  const getDatePin = useCallback((task: TTask, boundary: 'start' | 'end', hasAction: boolean) => getTaskDatePin({
    task, boundary, isParent: parents.has(task.id), mode: dateChangeMode, businessDays, isWeekend: weekendPredicate,
    canToggle: !renderTaskDateAction || hasAction,
    onChange: onFixedDateChange ? update => onFixedDateChange([update]) : undefined,
  }), [parents, dateChangeMode, businessDays, weekendPredicate, renderTaskDateAction, onFixedDateChange]);

  const renderDateCell = useCallback((task: TTask, boundary: 'start' | 'end') => {
    const action = renderTaskDateAction?.(task, boundary);
    const fixedDate = getFixedTaskDate(task, boundary);
    const displayDate = fixedDate ?? (boundary === 'start' ? task.startDate
      : durationPreview?.id === task.id ? durationPreview.endDate : task.endDate);
    return <>
      <span className="gantt-tl-date-display">{formatDateLabel(displayDate)}</span>
      {action && <span className="gantt-simple-grid-date-action" onMouseDown={event => event.stopPropagation()}
        onClick={event => event.stopPropagation()} onDoubleClick={event => event.stopPropagation()}
        onKeyDown={event => event.stopPropagation()}>{action}</span>}
    </>;
  }, [renderTaskDateAction, durationPreview]);

  const renderDurationCell = useCallback((task: Task) => {
    const isMilestone = task.type === 'milestone';
    return <span className="gantt-tl-duration-display">{isMilestone ? '◆' : `${getDurationFor(task)} д`}</span>;
  }, [getDurationFor]);

  const renderProgressCell = useCallback((task: Task) => {
    const progress = task.progress ?? 0;
    return <span className="gantt-tl-progress-display" data-complete={progress === 100 || undefined}>
      {progress ? `${Math.round(progress)}%` : '–'}
    </span>;
  }, []);

  const handleSearchPick = useCallback((pickedTaskId: string, taskId: string) => {
    if (dependencyPickMode === 'predecessor') {
      handleAddDependency(taskId, pickedTaskId, activeLinkType);
    } else {
      handleAddDependency(pickedTaskId, taskId, activeLinkType);
    }
  }, [dependencyPickMode, handleAddDependency, activeLinkType]);

  const handleSearchRemove = useCallback((pickedTaskId: string, task: Task) => {
    const successor = dependencyPickMode === 'predecessor' ? task : byId.get(pickedTaskId);
    const predecessorId = dependencyPickMode === 'predecessor' ? pickedTaskId : task.id;
    if (!successor) return;
    onTaskEdit?.([{
      ...successor,
      dependencies: (successor.dependencies ?? []).filter(dep => dep.hidden || dep.taskId !== predecessorId),
    }]);
  }, [byId, dependencyPickMode, onTaskEdit]);

  const renderSourcePicker = useCallback((task: Task) => {
    const normalizedQuery = dependencySearchQuery.trim().toLowerCase();
    const candidates = allTasks
      .filter(candidate => candidate.id !== task.id)
      .map(candidate => {
        const number = numberMap[candidate.id];
        const label = `${number ? `${number}. ` : ''}${candidate.name}`;
        const matchingDependencies = dependencyPickMode === 'predecessor'
          ? (task.dependencies ?? []).filter(dep => !dep.hidden && dep.taskId === candidate.id)
          : (candidate.dependencies ?? []).filter(dep => !dep.hidden && dep.taskId === task.id);
        return {
          task: candidate,
          label,
          isAlreadyLinked: matchingDependencies.length > 0,
          searchable: `${number ?? ''} ${candidate.name}`.toLowerCase(),
        };
      })
      .filter(candidate => normalizedQuery === '' ? true : candidate.searchable.includes(normalizedQuery));

    return (
      <div className="gantt-tl-dep-source-picker" onClick={event => event.stopPropagation()}
        onMouseDown={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}>
        <div className="gantt-tl-dep-source-direction">
          <button
            type="button"
            className={`gantt-tl-dep-source-direction-btn${dependencyPickMode === 'successor' ? ' gantt-tl-dep-source-direction-btn-active' : ''}`}
            onClick={() => setDependencyPickMode('successor')}
          >
            Последователь
          </button>
          <button
            type="button"
            className={`gantt-tl-dep-source-direction-btn${dependencyPickMode === 'predecessor' ? ' gantt-tl-dep-source-direction-btn-active' : ''}`}
            onClick={() => setDependencyPickMode('predecessor')}
          >
            Предшественник
          </button>
        </div>
        <div className="gantt-tl-dep-source-types">
          {LINK_TYPE_ORDER.map(linkType => {
            const Icon = LINK_TYPE_ICONS[linkType];
            return (
              <button
                key={linkType}
                type="button"
                className={`gantt-tl-dep-source-type-btn${activeLinkType === linkType ? ' gantt-tl-dep-source-type-btn-active' : ''}`}
                onClick={() => setActiveLinkType(linkType)}
                aria-label={`Выбрать тип связи ${linkType}`}
                title={linkType}
              >
                <Icon />
                <span>{LINK_TYPE_LABELS[linkType]}</span>
              </button>
            );
          })}
        </div>
        <div className="gantt-tl-dep-source-picker-head">
          <input
            autoFocus
            type="text"
            className="gantt-tl-dep-source-input"
            placeholder={dependencyPickMode === 'predecessor' ? 'Укажите предшественника' : 'Укажите последователя'}
            value={dependencySearchQuery}
            onChange={event => setDependencySearchQuery(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Escape') {
                setSelectingPredecessorFor(null);
                return;
              }
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                if (candidates.length > 0) {
                  setHighlightedDependencyIndex(current => Math.min(current + 1, candidates.length - 1));
                }
                return;
              }
              if (event.key === 'ArrowUp') {
                event.preventDefault();
                if (candidates.length > 0) {
                  setHighlightedDependencyIndex(current => Math.max(current - 1, 0));
                }
                return;
              }
              if (event.key === 'Enter' && candidates[highlightedDependencyIndex]) {
                event.preventDefault();
                const activeCandidate = candidates[highlightedDependencyIndex];
                if (activeCandidate.isAlreadyLinked) {
                  handleSearchRemove(activeCandidate.task.id, task);
                } else {
                  handleSearchPick(activeCandidate.task.id, task.id);
                }
              }
            }}
          />
        </div>
        <div ref={dependencySearchListRef} className="gantt-tl-dep-source-list">
          {candidates.length > 0 ? (
            candidates.map(({ task: candidate, label, isAlreadyLinked }, index) => (
              <button
                key={candidate.id}
                type="button"
                data-index={index}
                className={`gantt-tl-dep-source-option${index === highlightedDependencyIndex ? ' gantt-tl-dep-source-option-active' : ''}${isAlreadyLinked ? ' gantt-tl-dep-source-option-linked' : ''}`}
                onClick={() => {
                  if (!isAlreadyLinked) {
                    handleSearchPick(candidate.id, task.id);
                  }
                }}
                onMouseEnter={() => setHighlightedDependencyIndex(index)}
                onKeyDown={event => {
                  if (isAlreadyLinked && (event.key === 'Delete' || event.key === 'Backspace')) {
                    event.preventDefault();
                    handleSearchRemove(candidate.id, task);
                  }
                }}
                title={label}
              >
                <span className="gantt-tl-dep-source-option-label">{label}</span>
                {isAlreadyLinked && (
                  <span
                    className="gantt-tl-dep-source-option-remove"
                    onClick={event => {
                      event.stopPropagation();
                      handleSearchRemove(candidate.id, task);
                    }}
                    aria-label={`Удалить связь с ${label}`}
                  >
                    ×
                  </span>
                )}
              </button>
            ))
          ) : (
            <span className="gantt-tl-dep-source-hint">Ничего не найдено</span>
          )}
        </div>
      </div>
    );
  }, [allTasks, numberMap, dependencyPickMode, dependencySearchQuery, highlightedDependencyIndex, activeLinkType, handleSearchPick, handleSearchRemove]);

  const dependencyEditingDisabled = disableDependencyEditing || !onTaskEdit;
  const renderDependenciesCell = useCallback((task: Task) => {
    const isSourceRow = selectingPredecessorFor === task.id;
    const isPicking = selectingPredecessorFor != null;
    const chips = (task.dependencies ?? [])
      .filter(dep => !dep.hidden)
      .map(dep => {
        const predecessor = byId.get(dep.taskId);
        return { dep, lag: getDependencyLag(dep), predecessorName: predecessor?.name ?? dep.taskId };
      });
    const linkWord = chips.length <= 4 ? 'связи' : 'связей';
    const chipProps = ({ dep, lag, predecessorName }: { dep: TaskDependency; lag: number | undefined; predecessorName: string }) => ({
      lag,
      dep,
      taskId: task.id,
      taskNumber: numberMap[task.id],
      taskNumberMap: numberMap,
      predecessorName,
      predecessorTaskNumber: numberMap[dep.taskId],
      selectedChip,
      disableDependencyEditing: dependencyEditingDisabled,
      onChipSelect: handleChipSelect,
      onRowClick: (rowTaskId: string) => onTaskSelect?.(rowTaskId),
      onScrollToTask,
      onRemoveDependency: handleRemoveDependency,
      onChipSelectClear: () => onSelectedChipChange?.(null),
      task,
      allTasks,
      onTasksChange: onTaskEdit,
      businessDays,
      weekendPredicate,
    });
    return (
      <div
        className="gantt-tl-cell-deps"
        onClick={isSourceRow
          ? (event => { if (event.target === event.currentTarget) setSelectingPredecessorFor(null); })
          : isPicking
            ? (event => {
              event.stopPropagation();
              handleSearchPick(task.id, selectingPredecessorFor!);
            })
            : undefined}
      >
        {isSourceRow ? (
          <>
            <span className="gantt-tl-dep-source-hint" onClick={() => setSelectingPredecessorFor(null)}>
              Отменить
            </span>
            {renderSourcePicker(task)}
          </>
        ) : (
          <>
            {printDependencyLabels ? (
              <span className="gantt-tl-dependency-print-labels">
                {chips.map(({ dep, lag }) => formatDependencyPrintLabel(dep, numberMap[dep.taskId], lag)).join(', ')}
              </span>
            ) : chips.length >= 2 ? (
              <button
                type="button"
                className="gantt-tl-dep-summary-chip"
                onClick={event => {
                  event.stopPropagation();
                  setOverflowOpenTaskId(current => current === task.id ? null : task.id);
                }}
              >
                {chips.length} {linkWord}
              </button>
            ) : chips.length === 1 ? (
              <DepChip {...chipProps(chips[0])} />
            ) : null}
            {chips.length >= 2 && overflowOpenTaskId === task.id && (
              <span
                className="gantt-tl-dep-overflow-list"
                onClick={event => event.stopPropagation()}
                onMouseDown={event => event.stopPropagation()}
              >
                {chips.map(({ dep, lag, predecessorName }, chipIndex) => (
                  <DepChip key={`${dep.taskId}-${chipIndex}`} {...chipProps({ dep, lag, predecessorName })} />
                ))}
                <button
                  type="button"
                  className="gantt-tl-dep-source-hint"
                  style={{ background: 'transparent', border: 0, cursor: 'pointer', textAlign: 'left', padding: 0, fontFamily: 'inherit' }}
                  onClick={() => setOverflowOpenTaskId(null)}
                >
                  Закрыть
                </button>
              </span>
            )}
            {!printDependencyLabels && !dependencyEditingDisabled && !isPicking && (
              <button
                type="button"
                className={`gantt-tl-dep-add gantt-tl-dep-add-hover${selectedChip ? ' gantt-tl-dep-add-hidden' : ''}`}
                onClick={event => {
                  event.stopPropagation();
                  setOverflowOpenTaskId(null);
                  setSelectingPredecessorFor(task.id);
                }}
                aria-label="Добавить связь"
              >
                +
              </button>
            )}
          </>
        )}
      </div>
    );
  }, [
    selectingPredecessorFor, dependencyEditingDisabled, onTaskEdit, byId, numberMap, selectedChip,
    handleChipSelect, onTaskSelect, onScrollToTask, handleRemoveDependency, onSelectedChipChange,
    allTasks, businessDays, weekendPredicate, printDependencyLabels, overflowOpenTaskId,
    handleSearchPick, renderSourcePicker,
  ]);

  const submitNewTask = (name: string) => {
    if (!newTaskAnchor) return;
    const task = {
      id: crypto.randomUUID(), name,
      ...buildDefaultTaskDateRange(getTodayISODate(), { businessDays, defaultTaskDurationDays, weekendPredicate }),
    };
    if (newTaskAnchor === 'root') onAdd?.(task);
    else onInsertAfter?.(newTaskAnchor.id, { ...task, parentId: newTaskAnchor.parentId });
    setNewTaskAnchor(null);
  };

  const renderRowActions = useCallback((task: TTask, rowIndex: number) => {
    const isParent = parents.has(task.id);
    const previous = tasks[rowIndex - 1];
    let demoteTarget: TTask | undefined;
    for (let index = rowIndex - 1; index >= 0; index--) {
      if (tasks[index].parentId === task.parentId) {
        demoteTarget = tasks[index];
        break;
      }
    }
    const canCreateSection = rowIndex === 0 && !task.parentId && !!onReorder;
    const canDemote = !!onDemote && (canCreateSection || !!demoteTarget && previous?.id !== task.parentId);
    const closeMenu = () => setActionMenuTaskId(null);
    const context: TaskListActionContext<TTask> = {
      task, isParent, closeMenu,
      canPromote: !!task.parentId && !!onPromote,
      canDemote,
      insertAfter: onInsertAfter ? () => { closeMenu(); setNewTaskAnchor(task); } : undefined,
      promote: task.parentId && onPromote ? () => onPromote(task.id) : undefined,
      demote: canDemote ? () => {
        if (demoteTarget) {
          onDemote(task.id, demoteTarget.id);
          return;
        }
        const section = { id: crypto.randomUUID(), name: 'Новый раздел', startDate: task.startDate, endDate: task.endDate };
        onReorder?.([section, ...allTasks], task.id, section.id);
      } : undefined,
      duplicate: onReorder ? () => onReorder(duplicateTaskSubtree(task.id, allTasks)) : undefined,
      delete: onDelete ? () => onDelete(task.id) : undefined,
      ungroup: isParent && onUngroup ? () => onUngroup(task.id) : undefined,
    };
    const commands = menuCommands?.filter(command => {
      if (command.scope === 'group' && !isParent) return false;
      if (command.scope === 'linear' && (isParent || task.type === 'milestone')) return false;
      if (command.scope === 'milestone' && task.type !== 'milestone') return false;
      return command.isVisible?.(task) ?? true;
    }).map(command => (
      <React.Fragment key={command.id}>
        {command.divider === 'top' && <hr className="gantt-tl-context-menu-divider" />}
        <button type="button" className={`gantt-tl-context-menu-item${command.danger ? ' gantt-tl-context-menu-item-danger' : ''}`}
          disabled={command.isDisabled?.(task)} onClick={() => {
            if (command.closeOnSelect !== false) closeMenu();
            command.onSelect(task);
          }}>{command.icon}{command.label}</button>
        {command.divider === 'bottom' && <hr className="gantt-tl-context-menu-divider" />}
      </React.Fragment>
    ));
    const commandContent = commands?.length ? commands : null;
    const menu = renderMenu ? renderMenu(context, commandContent) : commandContent;
    const actions = renderActions?.(context);
    if (!menu && !actions) return null;
    return <div className="gantt-simple-grid-actions"
      onMouseDown={event => event.stopPropagation()}
      onClick={event => event.stopPropagation()}
      onDoubleClick={event => event.stopPropagation()}
      onKeyDown={event => event.stopPropagation()}>
      {actions}
      {menu && <Popover open={actionMenuTaskId === task.id} onOpenChange={open => setActionMenuTaskId(open ? task.id : null)}>
        <PopoverTrigger asChild>
          <button type="button" className="gantt-simple-grid-action" aria-label={`Действия: ${task.name}`}>⋯</button>
        </PopoverTrigger>
        <PopoverContent className="gantt-simple-grid-menu" align="end">{menu}</PopoverContent>
      </Popover>}
    </div>;
  }, [actionMenuTaskId, allTasks, menuCommands, onDelete, onDemote, onInsertAfter, onPromote, onReorder, onUngroup, parents, renderActions, renderMenu, tasks]);

  const updateCustomTask = useCallback((task: TTask, patch: Partial<TTask>) => {
    const latest = byId.get(task.id);
    if (latest && !latest.locked) onTaskEdit?.([{ ...latest, ...patch, id: latest.id }]);
  }, [byId, onTaskEdit]);

  const availableColumns = useMemo<SimpleGridColumn<TTask>[]>(() => {
    const showRowActions = !hideActions && !hiddenColumns?.includes('actions')
      && (renderActions || renderMenu || menuCommands?.length);
    const dateColumns = (['startDate', 'endDate'] as const).map<SimpleGridColumn<TTask>>(id => ({
        id,
        title: id === 'startDate' ? 'Начало' : 'Окончание',
        width: 90,
        minWidth: 76,
        align: 'right' as const,
        editorStyle: () => ({ paddingInline: 6 }),
        validation: { type: 'date' as const },
        format: { kind: 'date' as const },
        datePicker: true,
        isDisabled: (task: TTask) => !!task.locked || (!onFixedDateChange && !!getFixedTaskDate(task, id === 'startDate' ? 'start' : 'end')),
        getValue: (task: TTask) => getFixedTaskDate(task, id === 'startDate' ? 'start' : 'end') ?? toISODate(task[id]),
        getDatePickerContext: (task: TTask) => {
          const boundary = id === 'startDate' ? 'start' : 'end';
          const pin = getDatePin(task, boundary, !!renderTaskDateAction?.(task, boundary));
          return {
            range: { start: toISODate(task.startDate), end: toISODate(task.endDate) },
            isWeekend: (date: string) => weekendPredicate(parseUTCDate(date)),
            shiftDate: (iso: string, days: number) => {
              const date = parseUTCDate(iso);
              date.setUTCDate(date.getUTCDate() + (businessDays ? Math.sign(days) : days));
              if (!businessDays) return toISODate(date);
              return toISODate(days > 0 ? addBusinessDays(date, days, weekendPredicate)
                : subtractBusinessDays(date, -days, weekendPredicate));
            },
            duration: {
              days: getDurationFor(task), businessDays, linked: dateChangeMode === 'preserve-duration',
              onToggle: !pin.disableDuration && onDateChangeModeChange ? () =>
                onDateChangeModeChange(dateChangeMode === 'preserve-duration' ? 'free' : 'preserve-duration') : undefined,
            },
            footer: pin.note ? <div className="gantt-datepicker-fixed-note">{pin.note}</div> : undefined,
            fixedDateEdit: pin.fixedDateEdit,
            pinAction: pin.pinAction,
          };
        },
        setValue: (task: TTask, value: string, source?: 'editor') => {
          if (!value) return task;
          const isStart = id === 'startDate';
          const boundary = isStart ? 'start' : 'end';
          if (getFixedTaskDate(task, boundary)) {
            return source === 'editor' ? getDatePin(task, boundary, false).updateFixedDate(value) : task;
          }
          if (source !== 'editor') return { ...task, [id]: value };
          const date = businessDays ? alignToWorkingDay(parseUTCDate(value), isStart ? 1 : -1, weekendPredicate) : parseUTCDate(value);
          const duration = getDurationFor(task);
          const start = parseUTCDate(task.startDate);
          const end = parseUTCDate(task.endDate);
          const range = task.type === 'milestone' ? { start: date, end: date }
            : dateChangeMode === 'preserve-duration'
              ? isStart
                ? buildTaskRangeFromStart(date, duration, businessDays, weekendPredicate)
                : buildTaskRangeFromEnd(date, duration, businessDays, weekendPredicate)
              : isStart ? { start: date, end: end < date ? date : end } : { start: start > date ? date : start, end: date };
          const clamped = clampTaskRangeForIncomingFS(task, range.start, range.end, allTasks, businessDays, weekendPredicate);
          return {
            ...task, startDate: toISODate(clamped.start), endDate: toISODate(clamped.end),
            ...(task.dependencies && { dependencies: recalculateIncomingLags(task, clamped.start, clamped.end, allTasks, businessDays, weekendPredicate) }),
          };
        },
        renderValue: (task: TTask) => renderDateCell(task, id === 'startDate' ? 'start' : 'end'),
    }));
    const list: SimpleGridColumn<TTask>[] = [
      {
        id: 'name', title: 'Имя', width: 202, minWidth: 120, readOnly: nameReadOnly,
        editorStyle: task => ({
          ...wrappedTextEditorStyle,
          paddingLeft: nameInset(task) + (getTaskListNamePrefixIcon?.(task) ? 20 : 0),
          paddingRight: task.color ? 20 : 8,
        }),
        isDisabled: task => !!task.locked,
        getValue: task => task.name,
        setValue: (task, value) => ({ ...task, name: value.trim() || task.name }),
        onCellClick: onScrollToTask ? task => onScrollToTask(task.id) : undefined,
        renderValue: (task, rowIndex) => renderNameCell(task, showRowActions ? renderRowActions(task, rowIndex) : null),
      },
      ...dateColumns.map(column => ({ ...column, datePickerPair: dateColumns })),
      {
        id: 'duration', title: businessDays ? 'Дн. (р)' : 'Дн.', width: 60, minWidth: 46, align: 'center',
        isDisabled: task => !!task.locked,
        validation: { type: 'number', min: 0, integer: true },
        getValue: task => String(getDurationFor(task)),
        setValue: (task, value) => {
          if (!value) return task;
          const duration = Number(value);
          const type = duration === 0 ? 'milestone' : task.type === 'milestone' ? 'task' : task.type;
          const endDate = type === 'milestone' ? task.startDate : toISODate(
            buildTaskRangeFromStart(parseUTCDate(task.startDate), duration, businessDays, weekendPredicate).end
          );
          return { ...task, type, endDate };
        },
        renderValue: renderDurationCell,
      },
      {
        id: 'progress', title: '%', width: 50, align: 'center', readOnly: !onTaskEdit,
        isDisabled: task => !onTaskEdit || !!task.locked,
        validation: { type: 'number', min: 0, max: 100 },
        getValue: task => String(task.progress ?? 0),
        setValue: (task, value) => ({ ...task, progress: Number(value) }),
        renderValue: renderProgressCell,
      },
      {
        id: 'dependencies', title: 'Связи', width: 128, readOnly: true,
        getValue: task => (task.dependencies ?? []).map(dep => dep.taskId).join(', '),
        renderValue: renderDependenciesCell,
        columnActions: dependencyEditingDisabled ? undefined : LINK_TYPE_ORDER.map(linkType => ({
          id: `link-type-${linkType}`,
          label: `Тип связи ${LINK_TYPE_LABELS[linkType]}`,
          icon: React.createElement(LINK_TYPE_ICONS[linkType]),
          disabled: activeLinkType === linkType,
          onSelect: () => setActiveLinkType(linkType),
        })),
      },
    ];
    const byColumn = new Map(list.map(column => [column.id, column]));
    const builtIns = ['selection', 'number', ...list.map(column => column.id)].map(id => ({
      id, header: null, renderCell: () => null,
    }));
    return resolveTaskListColumns<TTask>(builtIns, additionalColumns)
      .filter(column => column.id !== 'number' && column.id !== 'selection')
      .map(column => {
        const native = byColumn.get(column.id);
        if (native) return native;
        const canEdit = !!column.editable && !!onTaskEdit;
        const textEditor = column.renderEditor ? undefined : column.textEditor;
        return {
          id: column.id, title: typeof column.header === 'string' ? column.header : column.id,
          headerContent: column.header, width: Math.max(column.minWidth ?? 40, column.width ?? 120),
          minWidth: column.minWidth,
          align: column.align, readOnly: !canEdit, isDisabled: task => !!task.locked,
          ...(textEditor ? {
            getValue: textEditor.getValue,
            setValue: (task: TTask, value: string) => ({ ...task, ...textEditor.setValue(task, value), id: task.id }),
            editorStyle: () => ({ ...wrappedTextEditorStyle, paddingInline: 8 }),
          } : canEdit && {
            getValue: () => '', setValue: (task: TTask) => task,
            editor: CustomColumnEditor<TTask>, editorData: { column, updateTask: updateCustomTask },
          }),
          renderValue: (task, rowIndex, openEditor) => {
            const context: TaskListColumnContext<TTask> = {
              task, rowIndex, isEditing: false, openEditor: canEdit && !task.locked ? openEditor : () => {}, closeEditor: () => {},
              updateTask: patch => updateCustomTask(task, patch),
            };
            return <div className="gantt-simple-grid-custom" data-custom-column={column.id}>{column.renderCell(context)}</div>;
          },
        };
      });
  }, [
    hiddenColumns, nameReadOnly, businessDays, additionalColumns, hideActions, menuCommands,
    renderActions, renderMenu, renderRowActions, onTaskEdit, updateCustomTask, onScrollToTask,
    activeLinkType, dependencyEditingDisabled, dateChangeMode, onDateChangeModeChange, allTasks, weekendPredicate, getDurationFor, nameInset,
    renderNameCell, renderDateCell, getDatePin, renderTaskDateAction, onFixedDateChange, renderDurationCell, renderProgressCell, renderDependenciesCell, getTaskListNamePrefixIcon,
  ]);

  const canChangeColumnVisibility = controlledHiddenColumns === undefined || !!onHiddenColumnsChange;
  const canShowRowActions = !hideActions && !!(renderActions || renderMenu || menuCommands?.length);
  const visibleColumns = useMemo(() => availableColumns.filter(column => !hiddenColumns.includes(column.id)), [availableColumns, hiddenColumns]);
  const renderVisibilityMenu = useCallback((anchor: TaskListColumnId | null) => canChangeColumnVisibility && (
    <Popover open={columnMenuAnchor === anchor} onOpenChange={open => setColumnMenuAnchor(current => (
      open ? anchor : current === anchor ? undefined : current
    ))}>
      <PopoverTrigger asChild>
        <button type="button" className="gantt-tl-column-menu-trigger" aria-label="Видимость столбцов"
          title="Видимость столбцов" onMouseDown={event => event.stopPropagation()}
          onClick={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}>
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M1 3h8L5 7z" fill="currentColor" /></svg>
        </button>
      </PopoverTrigger>
      {columnMenuAnchor === anchor && <PopoverContent className="gantt-tl-context-menu gantt-tl-column-menu" align="end">
        <div role="group" aria-label="Видимость столбцов" onMouseDown={event => event.stopPropagation()}
          onClick={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}>
          {[
            ...(enableTaskMultiSelect ? [{ id: 'selection', title: 'Выбор' }] : []),
            { id: 'number', title: '№' }, ...availableColumns,
            ...(canShowRowActions ? [{ id: 'actions', title: 'Действия' }] : []),
          ].map(({ id, title }) => (
            <label key={id} className="gantt-tl-context-menu-item">
              <input type="checkbox" checked={!hiddenColumns.includes(id)} onChange={event => {
                const checked = event.currentTarget.checked;
                const next = checked ? hiddenColumns.filter(hidden => hidden !== id) : [...hiddenColumns, id];
                if ((!checked && id === anchor) || (anchor === null && (id === 'number' || id === 'selection' || visibleColumns.length === 0))) {
                  setColumnMenuAnchor(undefined);
                }
                if (controlledHiddenColumns === undefined) setInternalHiddenColumns(next);
                onHiddenColumnsChange?.(next);
              }} />
              <span>{title}</span>
            </label>
          ))}
        </div>
      </PopoverContent>}
    </Popover>
  ), [canChangeColumnVisibility, enableTaskMultiSelect, availableColumns, canShowRowActions, hiddenColumns, controlledHiddenColumns,
    onHiddenColumnsChange, columnMenuAnchor, visibleColumns.length]);
  const columns = useMemo(() => canChangeColumnVisibility ? visibleColumns.map(column => ({
    ...column,
    headerContent: <span className="gantt-simple-grid-heading">
      <span className="gantt-simple-grid-heading-label">{column.headerContent ?? column.title}</span>
      {renderVisibilityMenu(column.id)}
    </span>,
  })) : visibleColumns, [canChangeColumnVisibility, visibleColumns, renderVisibilityMenu]);

  const configuredWidths = useMemo(() => columnWidths
    ? Object.fromEntries(Object.entries(columnWidths).filter((entry): entry is [string, number] => (
      typeof entry[1] === 'number' && Number.isFinite(entry[1]) && entry[1] > 0
    )))
    : undefined, [columnWidths]);
  const showNumbers = !hiddenColumns?.includes('number');
  const showSelection = !!enableTaskMultiSelect && !hiddenColumns?.includes('selection');
  const handleGridSelection = (selected: string[]) => {
    const next = new Set(selectedTaskIds);
    for (const task of tasks) next.delete(task.id);
    for (const key of selected) next.add(key);
    onSelectedTaskIdsChange?.(next);
  };

  return <div ref={overlayRef}
    className={`gantt-tl-overlay gantt-simple-grid${show ? '' : ' gantt-tl-hidden'}${hasRightShadow ? ' gantt-tl-overlay-shadowed' : ''}`}
    onContextMenuCapture={event => {
      if (!(event.target instanceof Element) || !event.target.closest('td[data-column-id="name"], [data-testid^="sg-rowheader-"]')) return;
      const row = event.target.closest('tr[data-gantt-task-row-id]');
      const trigger = row?.querySelector('.gantt-simple-grid-action');
      const taskId = row?.getAttribute('data-gantt-task-row-id');
      if (!trigger || !taskId || row?.querySelector('[data-editing="true"]')) return;
      event.preventDefault();
      event.stopPropagation();
      setActionMenuTaskId(taskId);
    }}
    style={{
      '--tasklist-width': `${width}px`,
      '--gantt-grid-header-height': `${headerHeight + 1}px`,
      '--gantt-row-content-lines': rowContentLines,
      '--gantt-grid-base-row-height': `${rowHeight}px`,
    } as React.CSSProperties}>
    {error && <div role="status" className="gantt-simple-grid-error">{error}</div>}
    {dependencyError && (
      <div className="gantt-tl-dep-error" style={{ top: headerHeight + 8, left: 8 }} role="alert">
        {dependencyError}
      </div>
    )}
    <SimpleGrid
      ariaLabel="Список задач"
      rows={tasks}
      columns={columns}
      rowKey={taskKey}
      onChange={onChange}
      onEditPreview={(task, columnId) => setDurationPreview(columnId === 'duration' ? task : null)}
      createRow={() => { throw new Error('Добавление задач выполняется через GanttChart'); }}
      allowRowInsert={false}
      onPasteOverflow={onPasteOverflow}
      contextMenu
      readOnly={readOnly}
      rowHeight={rowHeight}
      rowHeights={heights}
      visibleRowIndices={visibleRowIndices}
      onRevealRow={onRevealRow}
      showRowHeaders={showNumbers || showSelection || (canChangeColumnVisibility && columns.length === 0)}
      rowHeaderWidth={configuredWidths?.number ?? (showNumbers ? 40 : 24)}
      cornerContent={<>{showNumbers ? '№' : null}{renderVisibilityMenu(null)}</>}
      rowSelectionMode={showSelection}
      rowSelectionLabel={task => `Выбрать работу ${numberMap[task.id]}. ${task.name}`}
      selectAllRowsLabel="Выбрать все видимые работы"
      allowRowReorder={canReorder}
      rowDropTarget={resolveRowDrop}
      getRowScrollContainer={getRowScrollContainer}
      columnFilters={NO_FILTERS}
      sort={null}
      columnWidths={configuredWidths}
      onColumnWidthsChange={widths => onColumnWidthsChange?.({
        ...Object.fromEntries(Object.entries(configuredWidths ?? {}).filter(([id]) => !columns.some(column => column.id === id))),
        ...widths,
      })}
      selectionColor="var(--gantt-row-selected-border-color, #3974dc)"
      selectionFill="var(--gantt-row-selected-background, #eaf2ff)"
      rowFill={rowFillFor}
      rowClassName={getRowClassName}
      rowAttributes={(task, index) => ({
        'data-gantt-task-row-id': task.id,
        'data-gantt-row-hover-host': '',
        'data-gantt-row-parent': parents.has(task.id) ? '' : undefined,
        'data-gantt-row-filter-match': highlightedTaskIds?.has(task.id) ? '' : undefined,
        'data-gantt-row-selected': selectedTaskId === task.id ? '' : undefined,
        'data-gantt-row-tall': rowHeights[index] > rowHeight ? '' : undefined,
      })}
      onActiveRowChange={task => onTaskSelect(task.id)}
      rowHeaderLabel={showNumbers ? rowHeaderLabel : () => null}
      selectedRowKeys={selectedTaskIds ? Array.from(selectedTaskIds) : undefined}
      onSelectedRowKeysChange={onSelectedTaskIdsChange ? handleGridSelection : undefined} />
    {(bodyMinHeight !== undefined || skeletonRowCount > 0) && <div className="gantt-simple-grid-tail"
      style={{ minHeight: bodyMinHeight === undefined ? undefined : `max(0px, calc(${typeof bodyMinHeight === 'number' ? `${bodyMinHeight}px` : bodyMinHeight} - ${rowHeights.reduce((sum, height) => sum + height, 0)}px))` }}>
      <GenerationSkeletonRows variant="task-list" count={skeletonRowCount} rowHeight={rowHeight} startIndex={tasks.length} startTop={0} />
    </div>}
    {newTaskAnchor ? <NewTaskRow rowHeight={rowHeight} onConfirm={submitNewTask} onCancel={() => setNewTaskAnchor(null)} />
      : enableAddTask && onAdd && <button type="button" className="gantt-tl-add-btn" onClick={() => setNewTaskAnchor('root')}>+ {addTaskLabel}</button>}
  </div>;
}
