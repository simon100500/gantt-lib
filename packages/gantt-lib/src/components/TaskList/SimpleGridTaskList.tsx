// START_MODULE_CONTRACT
// PURPOSE: Render the native SimpleGrid as GanttChart's task list with the full gantt-lib visual layer restored on top.
// SCOPE: Present visible task rows, shared geometry, hierarchy connector lines, dependency chips, duration/progress/date displays and editable fields; delegate mutations to GanttChart.
// INPUTS: Visible tasks and row geometry, collapsed tree state, selected dependency chip and host callbacks.
// OUTPUTS: SimpleGrid row changes, dependency edits and expand/collapse events; no scheduling side effects beyond task updates.
// DEPENDS: SimpleGridVendor, TaskList visuals (DepChip, DepIcons, TaskList.css), GanttChart task types.
// END_MODULE_CONTRACT
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Task, TaskDependency } from '../GanttChart';
import type { LinkType } from '../../types';
import type { CustomDayConfig } from '../../utils/dateUtils';
import { parseUTCDate, createCustomDayPredicate } from '../../utils/dateUtils';
import {
  addBusinessDays,
  areTasksHierarchicallyRelated,
  buildTaskRangeFromEnd,
  buildTaskRangeFromStart,
  calculateSuccessorDate,
  getBusinessDaysCount,
  getDependencyLag,
  getTaskDuration,
  normalizeDependencyLag,
  subtractBusinessDays,
  validateDependencies,
} from '../../core/scheduling';
import { SimpleGrid } from '../SimpleGridVendor/runtime.js';
import type { SimpleGridColumn } from '../SimpleGridVendor/types';
import { buildTaskNumberMap } from './taskNumbering';
import { LINK_TYPE_ICONS, LINK_TYPE_LABELS } from './DepIcons';
import { DepChip } from './TaskListRow';
import './TaskList.css';
import './SimpleGridTaskList.css';

const NO_FILTERS: [] = [];
const LINK_TYPE_ORDER: LinkType[] = ['FS', 'SS', 'FF', 'SF'];
const DAY_MS = 24 * 60 * 60 * 1000;

type DependencyChipKey = { successorId: string; predecessorId: string; linkType: string };

const toISODate = (value: string | Date): string => {
  if (value instanceof Date) return value.toISOString().split('T')[0];
  return typeof value === 'string' && value.includes('T') ? value.split('T')[0] : value;
};

/** The legacy TaskList displayed dates as dd.MM.yy via its DatePicker. */
const formatDateLabel = (value: string | Date): string => {
  const iso = toISODate(value);
  const [year, month, day] = iso.split('-');
  if (!year || !month || !day) return iso;
  return `${day}.${month}.${year.slice(2)}`;
};

const getInclusiveDurationDays = (startDate: string | Date, endDate: string | Date): number => {
  const start = parseUTCDate(startDate);
  const end = parseUTCDate(endDate);
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1);
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
  collapsed: Set<string>;
  onToggleCollapse: (id: string) => void;
  onChange: (rows: Task[]) => void;
  nameReadOnly: boolean;
  readOnly: boolean;
  hiddenColumns?: readonly string[];
  columnWidths?: Record<string, number | undefined>;
  error: string;
  onTaskSelect: (id: string | null) => void;
  enableTaskMultiSelect?: boolean;
  selectedTaskIds?: Set<string>;
  onSelectedTaskIdsChange?: (ids: Set<string>) => void;
  /** Edits that SimpleGrid's rectangular change channel cannot express (dependencies, lags, link types). */
  onTaskEdit?: (updatedTasks: Task[]) => void;
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
  nameReadOnly, readOnly, hiddenColumns, columnWidths, error, onTaskSelect, enableTaskMultiSelect,
  selectedTaskIds, onSelectedTaskIdsChange, onTaskEdit, selectedChip, onSelectedChipChange, onScrollToTask,
  businessDays, customDays, isWeekend, highlightedTaskIds, fillParentRows, disableDependencyEditing,
  printDependencyLabels, getTaskListNamePrefixIcon,
}: Props<TTask>) {
  const overlayRef = useRef<HTMLDivElement>(null);
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
    () => Object.fromEntries(buildTaskNumberMap(tasks)) as Record<string, string>,
    [tasks],
  );

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
    const fillParent = typeof fillParentRows === 'function' ? fillParentRows(task as TTask) : fillParentRows;
    if (fillParent && parents.has(task.id)) {
      return 'var(--gantt-plan-fact-parent-row-background, rgba(148, 163, 184, 0.22))';
    }
    if (selectingPredecessorFor != null) return 'rgba(59, 130, 246, 0.04)';
    return undefined;
  }, [selectedChip, highlightedTaskIds, fillParentRows, parents, selectingPredecessorFor]);
  const rowHeaderLabel = useCallback((task: Task) => (
    <span
      data-gantt-row-parent={parents.has(task.id) || undefined}
      data-gantt-row-filter-match={highlightedTaskIds?.has(task.id) || undefined}
      className="gantt-tl-num-label"
    >
      {numberMap[task.id] || ''}
    </span>
  ), [parents, highlightedTaskIds, numberMap]);

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
    if (areTasksHierarchicallyRelated(successorTaskId, predecessorTaskId, tasks)) {
      reportDependencyError('Связи между родителем и потомком запрещены');
      setSelectingPredecessorFor(null);
      return;
    }
    const successor = tasks.find(task => task.id === successorTaskId);
    if (!successor) return;
    const alreadyExists = (successor.dependencies ?? []).some(
      dep => dep.taskId === predecessorTaskId && dep.type === linkType,
    );
    if (alreadyExists) {
      setSelectingPredecessorFor(null);
      return;
    }

    const newDep: TaskDependency = { taskId: predecessorTaskId, type: linkType, lag: 0 };
    const hypothetical = tasks.map(task =>
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
    const predecessor = tasks.find(task => task.id === predecessorTaskId);
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
      const origSuccessor = tasks.find(task => task.id === successorTaskId)!;
      const duration = getTaskDuration(
        origSuccessor.startDate,
        origSuccessor.endDate,
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
  }, [tasks, businessDays, weekendPredicate, onTaskEdit, reportDependencyError]);

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

  const renderNameCell = useCallback((task: Task) => {
    const depth = depthMap.get(task.id) ?? 0;
    const isParent = parents.has(task.id);
    const isChild = depth > 0;
    const isCollapsed = collapsed.has(task.id);
    const rowHeightPx = heights[task.id] ?? rowHeight;
    const modes = ancestorLineModesMap.get(task.id) ?? [];
    const isLastChild = lastChildIds.has(task.id);
    const hasVisibleChildren = visibleParentIds.has(task.id);
    const paddingLeft = task.composite
      ? depth * 20 + 30
      : isParent
        ? depth * 20 + 28
        : depth > 0
          ? depth * 20 + 8
          : 4;
    const prefixIcon = getTaskListNamePrefixIcon?.(task as TTask) ?? null;
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
                    height: mode === 'half' ? rowHeightPx / 2 : rowHeightPx,
                    width: '1.5px', background: hierarchyLineColor(index),
                    borderRadius: '1px', pointerEvents: 'none',
                  }}
                />
                {mode === 'half' && (
                  <span
                    data-testid={`gantt-tl-ancestor-connector-cap-${index}`}
                    style={{
                      position: 'absolute', left: index * 20 + 9,
                      top: rowHeightPx / 2 - 0.75, width: '5px', height: '1.5px',
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
                  height: isLastChild && !hasVisibleChildren ? rowHeightPx / 2 : rowHeightPx,
                  width: '1.5px', background: hierarchyLineColor(depth - 1),
                  borderRadius: '1px', pointerEvents: 'none',
                }}
              />
            )}
            <span
              style={{
                position: 'absolute', left: (depth - 1) * 20 + 9,
                top: rowHeightPx / 2 - 0.75, width: '8px', height: '1.5px',
                background: hierarchyLineColor(depth - 1), borderRadius: '1px', pointerEvents: 'none',
              }}
            />
            <span
              style={{
                position: 'absolute', left: (depth - 1) * 20 + 15,
                top: rowHeightPx / 2 - 2, width: '4px', height: '4px',
                borderRadius: '50%', background: hierarchyLineColor(depth - 1), pointerEvents: 'none',
              }}
            />
            {task.composite && !isCollapsed && (
              <span
                data-testid="gantt-tl-parent-connector-tail"
                style={{
                  position: 'absolute', left: depth * 20 + 9, top: rowHeightPx / 2 + 7,
                  height: rowHeightPx / 2 - 7, width: '1.5px',
                  background: hierarchyLineColor(depth), borderRadius: '1px', pointerEvents: 'none',
                }}
              />
            )}
          </>
        )}
        {!isChild && isParent && !task.composite && !isCollapsed && (
          <span
            data-testid="gantt-tl-parent-connector-tail"
            style={{
              position: 'absolute', left: depth * 20 + 9, top: rowHeightPx / 2 + 7,
              height: rowHeightPx / 2 - 7, width: '1.5px',
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
            onMouseDown={event => event.stopPropagation()}
            onClick={event => { event.stopPropagation(); onToggleCollapse(task.id); }}
          >
            <ChevronRightIcon />
          </button>
        ) : null}
        <span
          className="gantt-tl-name-trigger-text"
          style={{
            display: 'flex', alignItems: 'center', gap: 6, height: rowHeightPx,
            paddingLeft, fontSize: '0.8rem', color: '#374151', minWidth: 0, boxSizing: 'border-box',
          }}
        >
          {prefixIcon ? (
            <span className="gantt-tl-name-trigger-icon" aria-hidden="true">{prefixIcon}</span>
          ) : null}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: '1 1 auto', minWidth: 0 }}>
            {task.name}
          </span>
        </span>
        {task.color && (
          <span className="gantt-tl-name-color-stripe" style={{ backgroundColor: task.color }} aria-hidden="true" />
        )}
      </>
    );
  }, [depthMap, parents, collapsed, heights, rowHeight, ancestorLineModesMap, lastChildIds, visibleParentIds, onToggleCollapse, getTaskListNamePrefixIcon]);

  const getDurationFor = useCallback((task: Task) => (
    businessDays
      ? getBusinessDaysCount(task.startDate, task.endDate, weekendPredicate)
      : getInclusiveDurationDays(task.startDate, task.endDate)
  ), [businessDays, weekendPredicate]);

  const renderDateCell = useCallback((task: Task) => (
    <span className="gantt-tl-date-display">{formatDateLabel(task.startDate)}</span>
  ), []);

  const renderEndDateCell = useCallback((task: Task) => (
    <span className="gantt-tl-date-display">{formatDateLabel(task.endDate)}</span>
  ), []);

  const renderDurationCell = useCallback((task: Task) => {
    const isMilestone = task.type === 'milestone';
    return (
      <span style={{ display: 'block', textAlign: 'center' }}>
        <span className="gantt-tl-duration-display">
          {isMilestone ? '◆' : `${getDurationFor(task)}д`}
        </span>
      </span>
    );
  }, [getDurationFor]);

  const renderProgressCell = useCallback((task: Task) => {
    const progress = task.progress ?? 0;
    return (
      <span style={{ display: 'block', textAlign: 'center' }}>
        <span
          className="gantt-tl-progress-display"
          style={progress === 100
            ? { backgroundColor: '#17c864', borderRadius: '4px', padding: '2px 4px', color: '#ffffff' }
            : undefined}
        >
          {progress
            ? Math.round(progress) === 100 ? '100' : `${Math.round(progress)}%`
            : '-'}
        </span>
      </span>
    );
  }, []);

  const handleSearchPick = useCallback((pickedTaskId: string, taskId: string) => {
    if (dependencyPickMode === 'predecessor') {
      handleAddDependency(taskId, pickedTaskId, activeLinkType);
    } else {
      handleAddDependency(pickedTaskId, taskId, activeLinkType);
    }
  }, [dependencyPickMode, handleAddDependency, activeLinkType]);

  const handleSearchRemove = useCallback((pickedTaskId: string, task: Task) => {
    const matchingTypes = dependencyPickMode === 'predecessor'
      ? (task.dependencies ?? [])
        .filter(dep => dep.taskId === pickedTaskId)
        .map(dep => dep.type)
      : ((allTasks.find(candidate => candidate.id === pickedTaskId)?.dependencies ?? []))
        .filter(dep => dep.taskId === task.id)
        .map(dep => dep.type);
    for (const linkType of matchingTypes) {
      if (dependencyPickMode === 'predecessor') {
        handleRemoveDependency(task.id, pickedTaskId, linkType);
      } else {
        handleRemoveDependency(pickedTaskId, task.id, linkType);
      }
    }
  }, [allTasks, dependencyPickMode, handleRemoveDependency]);

  const renderSourcePicker = useCallback((task: Task) => {
    const normalizedQuery = dependencySearchQuery.trim().toLowerCase();
    const candidates = allTasks
      .filter(candidate => candidate.id !== task.id)
      .map(candidate => {
        const number = numberMap[candidate.id];
        const label = `${number ? `${number}. ` : ''}${candidate.name}`;
        const matchingDependencies = dependencyPickMode === 'predecessor'
          ? (task.dependencies ?? []).filter(dep => dep.taskId === candidate.id)
          : (candidate.dependencies ?? []).filter(dep => dep.taskId === task.id);
        return {
          task: candidate,
          label,
          isAlreadyLinked: matchingDependencies.length > 0,
          searchable: `${number ?? ''} ${candidate.name}`.toLowerCase(),
        };
      })
      .filter(candidate => normalizedQuery === '' ? true : candidate.searchable.includes(normalizedQuery));

    return (
      <div className="gantt-tl-dep-source-picker" onClick={event => event.stopPropagation()}>
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

  const renderDependenciesCell = useCallback((task: Task) => {
    const isSourceRow = selectingPredecessorFor === task.id;
    const isPicking = selectingPredecessorFor != null;
    const dependencyEditingDisabled = disableDependencyEditing || !onTaskEdit;
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
      <span
        className="gantt-tl-cell-deps"
        onClick={isSourceRow
          ? (event => { if (event.target === event.currentTarget) setSelectingPredecessorFor(null); })
          : isPicking
            ? (event => {
              event.stopPropagation();
              if (dependencyPickMode === 'predecessor') {
                handleAddDependency(task.id, selectingPredecessorFor!, activeLinkType);
              } else {
                handleAddDependency(selectingPredecessorFor!, task.id, activeLinkType);
              }
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
      </span>
    );
  }, [
    selectingPredecessorFor, disableDependencyEditing, onTaskEdit, byId, numberMap, selectedChip,
    handleChipSelect, onTaskSelect, onScrollToTask, handleRemoveDependency, onSelectedChipChange,
    allTasks, businessDays, weekendPredicate, printDependencyLabels, overflowOpenTaskId,
    dependencyPickMode, activeLinkType, handleAddDependency, renderSourcePicker,
  ]);

  const columns = useMemo<SimpleGridColumn<TTask>[]>(() => {
    const list: SimpleGridColumn<Task>[] = [      {
        id: 'name', title: 'Имя', width: columnWidths?.name ?? 220, readOnly: nameReadOnly,
        isDisabled: task => !!task.locked,
        getValue: task => task.name,
        setValue: (task, value) => ({ ...task, name: value }),
        renderValue: renderNameCell,
      },
      ...(['startDate', 'endDate'] as const).map(id => ({
        id,
        title: id === 'startDate' ? 'Начало' : 'Окончание',
        width: columnWidths?.[id] ?? 120,
        validation: { type: 'date' as const },
        format: { kind: 'date' as const },
        datePicker: true,
        isDisabled: (task: Task) => !!task.locked,
        getValue: (task: Task) => toISODate(task[id]),
        setValue: (task: Task, value: string) => ({ ...task, [id]: value }),
        renderValue: id === 'startDate' ? renderDateCell : renderEndDateCell,
      })),
      {
        id: 'duration', title: businessDays ? 'Дн. (р)' : 'Дн.', width: columnWidths?.duration ?? 60,
        readOnly: true, getValue: () => '',
        renderValue: renderDurationCell,
      },
      {
        id: 'progress', title: '%', width: columnWidths?.progress ?? 65, readOnly: true,
        getValue: task => String(task.progress ?? 0),
        renderValue: renderProgressCell,
      },
      {
        id: 'dependencies', title: 'Связи', width: columnWidths?.dependencies ?? 100, readOnly: true,
        getValue: task => (task.dependencies ?? []).map(dep => dep.taskId).join(', '),
        renderValue: renderDependenciesCell,
      },
    ] as SimpleGridColumn<Task>[];
    return list.filter(column => !hiddenColumns?.includes(column.id)) as unknown as SimpleGridColumn<TTask>[];
  }, [
    columnWidths, hiddenColumns, nameReadOnly, businessDays,
    renderNameCell, renderDateCell, renderEndDateCell, renderDurationCell, renderProgressCell, renderDependenciesCell,
  ]);

  return <div ref={overlayRef} className={`gantt-tl-overlay gantt-simple-grid${show ? '' : ' gantt-tl-hidden'}`} style={{ '--tasklist-width': `${width}px`, '--gantt-grid-header-height': `${headerHeight + 1}px` } as React.CSSProperties}>
    <div onClickCapture={event => {
      const target = event.target as HTMLElement;
      if (target.closest('button, input')) return;
      const row = target.closest<HTMLElement>('[data-row-index]');
      if (row && target.closest('[data-testid^="sg-cell-"]')) onTaskSelect(tasks[Number(row.dataset.rowIndex)]?.id ?? null);
    }}>
    {error && <div role="status" className="gantt-simple-grid-error">{error}</div>}
    {dependencyError && (
      <div className="gantt-tl-dep-error" style={{ top: headerHeight + 8, left: 8 }} role="alert">
        {dependencyError}
      </div>
    )}
    <SimpleGrid
      rows={tasks}
      columns={columns}
      rowKey={task => task.id}
      onChange={onChange}
      createRow={() => ({ id: '', name: '', startDate: '', endDate: '' } as TTask)}
      readOnly={readOnly}
      rowHeight={rowHeight}
      rowHeights={heights}
      showRowHeaders={!hiddenColumns?.includes('number')}
      rowSelectionMode={enableTaskMultiSelect}
      allowRowReorder={false}
      columnFilters={NO_FILTERS}
      sort={null}
      rowFill={rowFillFor}
      rowHeaderLabel={rowHeaderLabel}
      selectedRowKeys={selectedTaskIds ? Array.from(selectedTaskIds) : undefined}
      onSelectedRowKeysChange={onSelectedTaskIdsChange ? keys => onSelectedTaskIdsChange(new Set(keys)) : undefined} />
    </div>
  </div>;
}
