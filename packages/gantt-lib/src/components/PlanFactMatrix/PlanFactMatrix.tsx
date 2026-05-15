'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { parseUTCDate } from '../../utils/dateUtils';
import TimeScaleHeader from '../TimeScaleHeader';
import type { Task } from '../GanttChart';
import './PlanFactMatrix.css';

export type PlanFactCellKind = 'plan' | 'fact';

export interface PlanFactCellCommitContext<TTask extends Task = Task> {
  task: TTask;
  date: Date;
  dateKey: string;
  kind: PlanFactCellKind;
  value: number | undefined;
}

export interface PlanFactMatrixProps<TTask extends Task = Task> {
  tasks: TTask[];
  allTasks?: TTask[];
  dateRange: Date[];
  dayWidth: number;
  rowHeight: number;
  headerHeight: number;
  bodyMinHeight?: number | string;
  selectedTaskId?: string | null;
  onTaskSelect?: (taskId: string | null) => void;
  onTasksChange?: (tasks: TTask[]) => void;
  onCellCommit?: (context: PlanFactCellCommitContext<TTask>) => void;
  highlightedTaskIds?: Set<string>;
  filterMode?: 'highlight' | 'hide';
  visibleRowIndices?: number[];
  visibleDateIndices?: number[];
  todayDateIndex?: number;
}

type ActiveCell = {
  taskId: string;
  dateIndex: number;
  kind: PlanFactCellKind;
};

type CellRange = {
  anchor: ActiveCell;
  focus: ActiveCell;
};

type RangeBounds = {
  fromDateIndex: number;
  toDateIndex: number;
  fromSubrowIndex: number;
  toSubrowIndex: number;
};

type EditingCell = ActiveCell & {
  startValue?: string;
};

type OverflowTooltip = {
  label: string;
  left: number;
  top: number;
};

type PlannedIndexRange = {
  startIndex: number;
  endIndex: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

function formatDateKey(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function escapeAttributeValue(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function parseNumberInput(value: string): number | null | undefined {
  const trimmed = value.trim();
  if (trimmed === '') return undefined;

  const normalized = trimmed.replace(/\s+/g, '').replace(',', '.');
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
}

function getDateOnlyMs(date: Date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function getPlannedIndexRange(task: Task, rangeStartMs: number, rangeLength: number): PlannedIndexRange | null {
  if (rangeLength <= 0) return null;
  const start = parseUTCDate(task.startDate);
  const end = parseUTCDate(task.endDate);
  const startIndex = Math.ceil((getDateOnlyMs(start) - rangeStartMs) / DAY_MS);
  const endIndex = Math.floor((getDateOnlyMs(end) - rangeStartMs) / DAY_MS);
  const clampedStartIndex = Math.max(0, startIndex);
  const clampedEndIndex = Math.min(rangeLength - 1, endIndex);

  if (clampedStartIndex > clampedEndIndex) return null;
  return {
    startIndex: clampedStartIndex,
    endIndex: clampedEndIndex,
  };
}

function isDateIndexWithinPlannedRange(dateIndex: number, range: PlannedIndexRange | null) {
  return !!range && range.startIndex <= dateIndex && dateIndex <= range.endIndex;
}

function formatValue(value: number | undefined) {
  if (value === undefined) return '';
  const absoluteValue = Math.abs(value);

  if (absoluteValue >= 1_000_000) {
    const compactValue = value / 1_000_000;
    const fractionDigits = absoluteValue >= 10_000_000 ? 0 : 1;
    return `${compactValue.toLocaleString('ru-RU', {
      minimumFractionDigits: 0,
      maximumFractionDigits: fractionDigits,
      useGrouping: false,
    })}m`;
  }

  if (absoluteValue >= 10_000) {
    const compactValue = value / 1_000;
    const fractionDigits = absoluteValue >= 100_000 ? 0 : 1;
    return `${compactValue.toLocaleString('ru-RU', {
      minimumFractionDigits: 0,
      maximumFractionDigits: fractionDigits,
      useGrouping: false,
    })}k`;
  }

  return Number.isInteger(value) ? String(value) : String(value).replace('.', ',');
}

function formatTooltipValue(value: number | undefined) {
  if (value === undefined) return '';
  return value.toLocaleString('ru-RU', { maximumFractionDigits: 20 });
}

function getSubrowIndex(taskIndex: number, kind: PlanFactCellKind) {
  return taskIndex * 2 + (kind === 'plan' ? 0 : 1);
}

function findEditableTaskIndex(
  tasks: Task[],
  parentTaskIds: Set<string>,
  startIndex: number,
  step: 1 | -1
) {
  let index = startIndex;
  while (index >= 0 && index < tasks.length) {
    if (!parentTaskIds.has(tasks[index].id)) {
      return index;
    }
    index += step;
  }
  return null;
}

function PlanFactCellEditor({
  value,
  startValue,
  onCommit,
  onCommitRange,
  onCancel,
}: {
  value: number | undefined;
  startValue?: string;
  onCommit: (value: number | undefined) => void;
  onCommitRange?: (value: number | undefined) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(startValue ?? (value === undefined ? '' : String(value)));
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    if (startValue === undefined) {
      inputRef.current?.select();
    } else {
      inputRef.current?.setSelectionRange(startValue.length, startValue.length);
    }
  }, [startValue]);

  const commit = useCallback(() => {
    const parsed = parseNumberInput(draft);
    if (parsed === null) {
      onCancel();
      return;
    }
    onCommit(parsed);
  }, [draft, onCancel, onCommit]);

  return (
    <input
      ref={inputRef}
      value={draft}
      className="gantt-pf-editor"
      inputMode="decimal"
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          onCancel();
          return;
        }
        if (event.key === 'Enter') {
          event.preventDefault();
          if (event.ctrlKey || event.metaKey) {
            const parsed = parseNumberInput(draft);
            if (parsed === null) {
              onCancel();
              return;
            }
            onCommitRange?.(parsed);
          } else {
            commit();
          }
        }
      }}
    />
  );
}

type PlanFactRowProps<TTask extends Task = Task> = {
  task: TTask;
  rowIndex: number;
  dateRange: Date[];
  dateKeys: string[];
  renderedDateIndices: number[];
  rowHeight: number;
  subrowHeight: number;
  dayWidth: number;
  plannedRange: PlannedIndexRange | null;
  todayDateIndex?: number;
  isParent: boolean;
  isHighlighted: boolean;
  selectedTaskId?: string | null;
  activeCell: ActiveCell | null;
  editingCell: EditingCell | null;
  selectedRange: CellRange | null;
  renderedRangeBounds: RangeBounds | null;
  didDragSelectRef: React.MutableRefObject<boolean>;
  isSelectingRef: React.MutableRefObject<boolean>;
  isFillDraggingRef: React.MutableRefObject<boolean>;
  onTaskSelect?: (taskId: string | null) => void;
  selectSingleCell: (cell: ActiveCell) => void;
  queueHoverCellUpdate: (cell: ActiveCell) => void;
  setActiveCell: React.Dispatch<React.SetStateAction<ActiveCell | null>>;
  setEditingCell: React.Dispatch<React.SetStateAction<EditingCell | null>>;
  setFillRange: React.Dispatch<React.SetStateAction<CellRange | null>>;
  clearSelectedCells: () => void;
  commitCell: (task: TTask, dateIndex: number, kind: PlanFactCellKind, value: number | undefined) => void;
  commitSelectedCells: (value: number | undefined) => void;
  moveActiveCell: (cell: ActiveCell, direction: 'left' | 'right' | 'up' | 'down') => void;
  extendSelectedRange: (cell: ActiveCell, direction: 'left' | 'right' | 'up' | 'down') => void;
  focusCell: (cell: ActiveCell) => void;
  showOverflowTooltip: (target: HTMLElement, label: string, force?: boolean) => void;
  hideOverflowTooltip: () => void;
};

function getCellSignatureForTask(cell: ActiveCell | null, taskId: string) {
  return cell?.taskId === taskId ? `${cell.dateIndex}:${cell.kind}` : '';
}

function getEditingCellSignatureForTask(cell: EditingCell | null, taskId: string) {
  return cell?.taskId === taskId ? `${cell.dateIndex}:${cell.kind}:${cell.startValue ?? ''}` : '';
}

function getRangeAnchorSignatureForTask(range: CellRange | null, taskId: string) {
  return range?.anchor.taskId === taskId ? `${range.anchor.dateIndex}:${range.anchor.kind}` : '';
}

function doesRangeTouchRow(bounds: RangeBounds | null, rowIndex: number) {
  if (!bounds) return false;
  const firstSubrowIndex = rowIndex * 2;
  const lastSubrowIndex = firstSubrowIndex + 1;
  return bounds.fromSubrowIndex <= lastSubrowIndex && bounds.toSubrowIndex >= firstSubrowIndex;
}

function areRangeBoundsEqual(left: RangeBounds | null, right: RangeBounds | null) {
  if (left === right) return true;
  if (!left || !right) return false;
  return left.fromDateIndex === right.fromDateIndex
    && left.toDateIndex === right.toDateIndex
    && left.fromSubrowIndex === right.fromSubrowIndex
    && left.toSubrowIndex === right.toSubrowIndex;
}

function PlanFactRowInner<TTask extends Task = Task>({
  task,
  rowIndex,
  dateRange,
  dateKeys,
  renderedDateIndices,
  rowHeight,
  subrowHeight,
  dayWidth,
  plannedRange,
  todayDateIndex,
  isParent,
  isHighlighted,
  selectedTaskId,
  activeCell,
  editingCell,
  selectedRange,
  renderedRangeBounds,
  didDragSelectRef,
  isSelectingRef,
  isFillDraggingRef,
  onTaskSelect,
  selectSingleCell,
  queueHoverCellUpdate,
  setActiveCell,
  setEditingCell,
  setFillRange,
  clearSelectedCells,
  commitCell,
  commitSelectedCells,
  moveActiveCell,
  extendSelectedRange,
  focusCell,
  showOverflowTooltip,
  hideOverflowTooltip,
}: PlanFactRowProps<TTask>) {
  return (
    <div
      data-gantt-task-row-id={task.id}
      className={joinClasses(
        'gantt-pf-row',
        isParent && 'gantt-pf-row-parent',
        selectedTaskId === task.id && 'gantt-pf-row-selected',
        isHighlighted && 'gantt-pf-row-highlighted'
      )}
      style={{
        top: `${rowIndex * rowHeight}px`,
        height: `${rowHeight}px`,
        gridTemplateColumns: `repeat(${dateRange.length}, ${dayWidth}px)`,
        ['--gantt-pf-today-left' as string]: todayDateIndex !== undefined && todayDateIndex >= 0
          ? `${todayDateIndex * dayWidth}px`
          : undefined,
      }}
      onClick={() => onTaskSelect?.(task.id)}
    >
      {renderedDateIndices.map((dateIndex) => {
        const dateKey = dateKeys[dateIndex];
        if (dateKey === undefined) return null;
        const planned = isDateIndexWithinPlannedRange(dateIndex, plannedRange);
        return (['plan', 'fact'] as const).map((kind) => {
          const subrowIndex = getSubrowIndex(rowIndex, kind);
          const isInRenderedRange = !!renderedRangeBounds
            && dateIndex >= renderedRangeBounds.fromDateIndex
            && dateIndex <= renderedRangeBounds.toDateIndex
            && subrowIndex >= renderedRangeBounds.fromSubrowIndex
            && subrowIndex <= renderedRangeBounds.toSubrowIndex;
          const planValue = task.planByDate?.[dateKey];
          const factValue = task.factByDate?.[dateKey];
          const value = kind === 'plan' ? planValue : factValue;
          const factStatus = factValue === undefined || planValue === undefined
            ? null
            : factValue >= planValue
              ? 'success'
              : 'warning';
          const isActive = activeCell?.taskId === task.id
            && activeCell.dateIndex === dateIndex
            && activeCell.kind === kind;
          const isEditing = editingCell?.taskId === task.id
            && editingCell.dateIndex === dateIndex
            && editingCell.kind === kind;
          const currentCell = { taskId: task.id, dateIndex, kind };
          const isSelected = !isParent && isInRenderedRange;
          const showFillHandle = !isParent
            && !isEditing
            && isInRenderedRange
            && renderedRangeBounds !== null
            && dateIndex === renderedRangeBounds.toDateIndex
            && subrowIndex === renderedRangeBounds.toSubrowIndex;
          const isRangeAnchor = !showFillHandle
            && !isParent
            && selectedRange?.anchor.taskId === task.id
            && selectedRange.anchor.dateIndex === dateIndex
            && selectedRange.anchor.kind === kind;

          return (
            <div
              key={`${task.id}:${dateKey}:${kind}`}
              data-plan-fact-task-id={task.id}
              data-plan-fact-date-index={dateIndex}
              data-plan-fact-kind={kind}
              className={joinClasses(
                'gantt-pf-cell',
                `gantt-pf-cell-${kind}`,
                planned && kind === 'plan' && 'gantt-pf-cell-planned',
                value !== undefined && 'gantt-pf-cell-hasValue',
                kind === 'fact' && factStatus === 'success' && 'gantt-pf-cell-factSuccess',
                kind === 'fact' && factStatus === 'warning' && 'gantt-pf-cell-factWarning',
                isSelected && 'gantt-pf-cell-selected',
                isInRenderedRange && renderedRangeBounds !== null && dateIndex === renderedRangeBounds.fromDateIndex && 'gantt-pf-cell-rangeLeft',
                isInRenderedRange && renderedRangeBounds !== null && dateIndex === renderedRangeBounds.toDateIndex && 'gantt-pf-cell-rangeRight',
                isInRenderedRange && renderedRangeBounds !== null && subrowIndex === renderedRangeBounds.fromSubrowIndex && 'gantt-pf-cell-rangeTop',
                isInRenderedRange && renderedRangeBounds !== null && subrowIndex === renderedRangeBounds.toSubrowIndex && 'gantt-pf-cell-rangeBottom',
                isRangeAnchor && 'gantt-pf-cell-rangeAnchor',
                isActive && 'gantt-pf-cell-active',
                isEditing && 'gantt-pf-cell-editing',
                isParent && 'gantt-pf-cell-readonly'
              )}
              style={{
                gridColumn: dateIndex + 1,
                gridRow: kind === 'plan' ? 1 : 2,
                height: `${subrowHeight}px`,
              }}
              tabIndex={isParent ? -1 : 0}
              onMouseDown={(event) => {
                if (isParent) return;
                event.preventDefault();
                event.stopPropagation();
                didDragSelectRef.current = false;
                isSelectingRef.current = true;
                selectSingleCell(currentCell);
                onTaskSelect?.(task.id);
                (event.currentTarget as HTMLDivElement).focus();
              }}
              onMouseEnter={() => {
                if (isParent) return;
                if (!isFillDraggingRef.current && !isSelectingRef.current) return;
                queueHoverCellUpdate(currentCell);
              }}
              onFocus={() => {
                if (isParent) return;
                setActiveCell({ taskId: task.id, dateIndex, kind });
              }}
              onClick={(event) => {
                event.stopPropagation();
                if (didDragSelectRef.current) {
                  didDragSelectRef.current = false;
                  return;
                }
                onTaskSelect?.(task.id);
                if (isParent) return;
                selectSingleCell(currentCell);
                (event.currentTarget as HTMLDivElement).focus();
              }}
              onDoubleClick={(event) => {
                event.stopPropagation();
                if (isParent) return;
                setEditingCell({ taskId: task.id, dateIndex, kind });
              }}
              onKeyDown={(event) => {
                if (isParent || isEditing) return;
                if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                  event.preventDefault();
                  event.stopPropagation();
                  const direction = event.key.replace('Arrow', '').toLowerCase() as 'left' | 'right' | 'up' | 'down';
                  if (event.shiftKey) {
                    extendSelectedRange(selectedRange?.focus ?? currentCell, direction);
                  } else {
                    moveActiveCell(currentCell, direction);
                  }
                  return;
                }
                if (event.key === 'Enter' || event.key === 'F2') {
                  event.preventDefault();
                  event.stopPropagation();
                  setEditingCell(selectedRange?.anchor ?? currentCell);
                  return;
                }
                if (event.key === 'Backspace' || event.key === 'Delete') {
                  event.preventDefault();
                  event.stopPropagation();
                  clearSelectedCells();
                  return;
                }
                if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
                  event.preventDefault();
                  event.stopPropagation();
                  setEditingCell({ ...currentCell, startValue: event.key });
                }
              }}
            >
              {isEditing ? (
                <PlanFactCellEditor
                  value={value}
                  startValue={editingCell.startValue}
                  onCommit={(nextValue) => {
                    commitCell(task, dateIndex, kind, nextValue);
                    setEditingCell(null);
                    const nextActiveCell = { taskId: task.id, dateIndex, kind };
                    selectSingleCell(nextActiveCell);
                    focusCell(nextActiveCell);
                  }}
                  onCommitRange={(nextValue) => {
                    commitSelectedCells(nextValue);
                    setEditingCell(null);
                    const nextActiveCell = { taskId: task.id, dateIndex, kind };
                    selectSingleCell(nextActiveCell);
                    focusCell(nextActiveCell);
                  }}
                  onCancel={() => {
                    setEditingCell(null);
                    const nextActiveCell = { taskId: task.id, dateIndex, kind };
                    selectSingleCell(nextActiveCell);
                    focusCell(nextActiveCell);
                  }}
                />
              ) : (
                <span
                  className="gantt-pf-cellValue"
                  onMouseEnter={(event) => {
                    if (isParent || value === undefined) return;
                    const compactValue = formatValue(value);
                    const fullValue = formatTooltipValue(value);
                    showOverflowTooltip(event.currentTarget, fullValue, compactValue !== fullValue);
                  }}
                  onMouseLeave={hideOverflowTooltip}
                >
                  {isParent ? '' : formatValue(value)}
                </span>
              )}
              {showFillHandle && (
                <span
                  className="gantt-pf-fillHandle"
                  aria-hidden="true"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    isSelectingRef.current = false;
                    isFillDraggingRef.current = true;
                    setFillRange(selectedRange);
                  }}
                />
              )}
            </div>
          );
        });
      })}
    </div>
  );
}

function arePlanFactRowsEqual<TTask extends Task>(
  previous: PlanFactRowProps<TTask>,
  next: PlanFactRowProps<TTask>
) {
  const previousRangeTouchesRow = doesRangeTouchRow(previous.renderedRangeBounds, previous.rowIndex);
  const nextRangeTouchesRow = doesRangeTouchRow(next.renderedRangeBounds, next.rowIndex);

  return previous.task === next.task
    && previous.rowIndex === next.rowIndex
    && previous.dateRange === next.dateRange
    && previous.dateKeys === next.dateKeys
    && previous.renderedDateIndices === next.renderedDateIndices
    && previous.rowHeight === next.rowHeight
    && previous.subrowHeight === next.subrowHeight
    && previous.dayWidth === next.dayWidth
    && previous.plannedRange === next.plannedRange
    && previous.todayDateIndex === next.todayDateIndex
    && previous.isParent === next.isParent
    && previous.isHighlighted === next.isHighlighted
    && (previous.selectedTaskId === previous.task.id) === (next.selectedTaskId === next.task.id)
    && getCellSignatureForTask(previous.activeCell, previous.task.id) === getCellSignatureForTask(next.activeCell, next.task.id)
    && getEditingCellSignatureForTask(previous.editingCell, previous.task.id) === getEditingCellSignatureForTask(next.editingCell, next.task.id)
    && getRangeAnchorSignatureForTask(previous.selectedRange, previous.task.id) === getRangeAnchorSignatureForTask(next.selectedRange, next.task.id)
    && previousRangeTouchesRow === nextRangeTouchesRow
    && (!nextRangeTouchesRow || areRangeBoundsEqual(previous.renderedRangeBounds, next.renderedRangeBounds));
}

const PlanFactRow = React.memo(PlanFactRowInner, arePlanFactRowsEqual) as typeof PlanFactRowInner;

export default function PlanFactMatrix<TTask extends Task = Task>({
  tasks,
  allTasks = tasks,
  dateRange,
  dayWidth,
  rowHeight,
  headerHeight,
  bodyMinHeight,
  selectedTaskId,
  onTaskSelect,
  onTasksChange,
  onCellCommit,
  highlightedTaskIds,
  filterMode = 'highlight',
  visibleRowIndices,
  visibleDateIndices,
  todayDateIndex,
}: PlanFactMatrixProps<TTask>) {
  const [activeCell, setActiveCell] = useState<ActiveCell | null>(null);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [selectedRange, setSelectedRange] = useState<CellRange | null>(null);
  const [fillRange, setFillRange] = useState<CellRange | null>(null);
  const [overflowTooltip, setOverflowTooltip] = useState<OverflowTooltip | null>(null);
  const isSelectingRef = useRef(false);
  const isFillDraggingRef = useRef(false);
  const didDragSelectRef = useRef(false);
  const pendingHoverCellRef = useRef<ActiveCell | null>(null);
  const hoverFrameRef = useRef<number | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  const totalWidth = dateRange.length * dayWidth;
  const subrowHeight = rowHeight / 2;
  const renderedRowIndices = useMemo(
    () => visibleRowIndices ?? tasks.map((_, index) => index),
    [tasks, visibleRowIndices]
  );
  const renderedDateIndices = useMemo(
    () => visibleDateIndices ?? dateRange.map((_, index) => index),
    [dateRange, visibleDateIndices]
  );
  const parentTaskIds = useMemo(() => {
    const ids = new Set<string>();
    for (const task of allTasks) {
      if (task.parentId) ids.add(task.parentId);
    }
    return ids;
  }, [allTasks]);

  const dateKeys = useMemo(() => dateRange.map(formatDateKey), [dateRange]);
  const dateRangeStartMs = dateRange[0] ? getDateOnlyMs(dateRange[0]) : 0;
  const taskIndexById = useMemo(() => {
    const indexById = new Map<string, number>();
    tasks.forEach((task, index) => indexById.set(task.id, index));
    return indexById;
  }, [tasks]);
  const taskById = useMemo(
    () => new Map(tasks.map((task) => [task.id, task])),
    [tasks]
  );
  const monthSeparatorIndices = useMemo(() => {
    const indices: number[] = [];
    for (let index = 1; index < dateRange.length; index += 1) {
      if (dateRange[index].getUTCDate() === 1) {
        indices.push(index);
      }
    }
    return indices;
  }, [dateRange]);
  const plannedRangeByTaskId = useMemo(() => {
    const rangeByTaskId = new Map<string, PlannedIndexRange | null>();
    for (const task of tasks) {
      rangeByTaskId.set(task.id, getPlannedIndexRange(task, dateRangeStartMs, dateRange.length));
    }
    return rangeByTaskId;
  }, [dateRange.length, dateRangeStartMs, tasks]);

  const focusCell = useCallback((cell: ActiveCell) => {
    window.requestAnimationFrame(() => {
      const selector = [
        `[data-plan-fact-task-id="${escapeAttributeValue(cell.taskId)}"]`,
        `[data-plan-fact-date-index="${cell.dateIndex}"]`,
        `[data-plan-fact-kind="${cell.kind}"]`,
      ].join('');
      bodyRef.current?.querySelector<HTMLElement>(selector)?.focus();
    });
  }, []);

  const clearSelection = useCallback(() => {
    if (hoverFrameRef.current !== null) {
      window.cancelAnimationFrame(hoverFrameRef.current);
      hoverFrameRef.current = null;
    }
    pendingHoverCellRef.current = null;
    isSelectingRef.current = false;
    isFillDraggingRef.current = false;
    didDragSelectRef.current = false;
    setActiveCell(null);
    setEditingCell(null);
    setSelectedRange(null);
    setFillRange(null);
    setOverflowTooltip(null);
  }, []);

  const hideOverflowTooltip = useCallback(() => {
    setOverflowTooltip(null);
  }, []);

  const flushPendingHoverCell = useCallback(() => {
    hoverFrameRef.current = null;
    const currentCell = pendingHoverCellRef.current;
    if (!currentCell) return;

    if (isFillDraggingRef.current && selectedRange) {
      setFillRange({ anchor: selectedRange.anchor, focus: currentCell });
      setActiveCell(currentCell);
      onTaskSelect?.(currentCell.taskId);
      return;
    }

    if (!isSelectingRef.current) return;
    didDragSelectRef.current = true;
    setSelectedRange((currentRange) => ({
      anchor: currentRange?.anchor ?? currentCell,
      focus: currentCell,
    }));
    onTaskSelect?.(currentCell.taskId);
  }, [onTaskSelect, selectedRange]);

  const queueHoverCellUpdate = useCallback((cell: ActiveCell) => {
    pendingHoverCellRef.current = cell;
    if (hoverFrameRef.current !== null) return;
    hoverFrameRef.current = window.requestAnimationFrame(flushPendingHoverCell);
  }, [flushPendingHoverCell]);

  const showOverflowTooltip = useCallback((target: HTMLElement, label: string, force = false) => {
    if (!rootRef.current || !label) return;
    if (!force && target.scrollWidth <= target.clientWidth) {
      setOverflowTooltip(null);
      return;
    }

    const rootRect = rootRef.current.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    setOverflowTooltip({
      label,
      left: targetRect.left - rootRect.left + (targetRect.width / 2),
      top: targetRect.top - rootRect.top,
    });
  }, []);

  const selectSingleCell = useCallback((cell: ActiveCell) => {
    setActiveCell(cell);
    setSelectedRange({ anchor: cell, focus: cell });
    setFillRange(null);
  }, []);

  const getRangeBounds = useCallback((range: CellRange): RangeBounds | null => {
    const anchorTaskIndex = taskIndexById.get(range.anchor.taskId);
    const focusTaskIndex = taskIndexById.get(range.focus.taskId);
    if (anchorTaskIndex === undefined || focusTaskIndex === undefined) {
      return null;
    }

    return {
      fromDateIndex: Math.min(range.anchor.dateIndex, range.focus.dateIndex),
      toDateIndex: Math.max(range.anchor.dateIndex, range.focus.dateIndex),
      fromSubrowIndex: Math.min(
        getSubrowIndex(anchorTaskIndex, range.anchor.kind),
        getSubrowIndex(focusTaskIndex, range.focus.kind)
      ),
      toSubrowIndex: Math.max(
        getSubrowIndex(anchorTaskIndex, range.anchor.kind),
        getSubrowIndex(focusTaskIndex, range.focus.kind)
      ),
    };
  }, [taskIndexById]);

  const renderedRange = fillRange ?? selectedRange;
  const renderedRangeBounds = useMemo(
    () => (renderedRange ? getRangeBounds(renderedRange) : null),
    [getRangeBounds, renderedRange]
  );

  const getCellFromPosition = useCallback((subrowIndex: number, dateIndex: number): ActiveCell | null => {
    const task = tasks[Math.floor(subrowIndex / 2)];
    if (!task) return null;
    return {
      taskId: task.id,
      dateIndex,
      kind: subrowIndex % 2 === 0 ? 'plan' : 'fact',
    };
  }, [tasks]);

  const isCellInRange = useCallback((cell: ActiveCell, range: CellRange) => {
    const bounds = getRangeBounds(range);
    if (!bounds) return false;

    const cellTaskIndex = taskIndexById.get(cell.taskId);
    if (cellTaskIndex === undefined) {
      return false;
    }

    const cellSubrowIndex = getSubrowIndex(cellTaskIndex, cell.kind);

    return cell.dateIndex >= bounds.fromDateIndex
      && cell.dateIndex <= bounds.toDateIndex
      && cellSubrowIndex >= bounds.fromSubrowIndex
      && cellSubrowIndex <= bounds.toSubrowIndex;
  }, [getRangeBounds, taskIndexById]);

  const commitCell = useCallback((task: TTask, dateIndex: number, kind: PlanFactCellKind, value: number | undefined) => {
    const dateKey = dateKeys[dateIndex];
    const source = kind === 'plan' ? task.planByDate : task.factByDate;
    const nextValues = { ...(source ?? {}) };
    if (value === undefined) {
      delete nextValues[dateKey];
    } else {
      nextValues[dateKey] = value;
    }

    const changedTask = {
      ...task,
      [kind === 'plan' ? 'planByDate' : 'factByDate']: nextValues,
    } as TTask;

    onTasksChange?.([changedTask]);
    onCellCommit?.({
      task,
      date: dateRange[dateIndex],
      dateKey,
      kind,
      value,
    });
  }, [dateKeys, dateRange, onCellCommit, onTasksChange]);

  const commitRangeCells = useCallback((bounds: RangeBounds, value: number | undefined, mode: 'set' | 'clear') => {
    const changedTasksById = new Map<string, TTask>();

    for (let subrowIndex = bounds.fromSubrowIndex; subrowIndex <= bounds.toSubrowIndex; subrowIndex += 1) {
      const task = tasks[Math.floor(subrowIndex / 2)];
      if (!task || parentTaskIds.has(task.id)) continue;

      const kind: PlanFactCellKind = subrowIndex % 2 === 0 ? 'plan' : 'fact';
      const currentChangedTask = changedTasksById.get(task.id) ?? task;
      let nextPlanByDate = currentChangedTask.planByDate;
      let nextFactByDate = currentChangedTask.factByDate;
      let didChange = false;

      for (let dateIndex = bounds.fromDateIndex; dateIndex <= bounds.toDateIndex; dateIndex += 1) {
        const dateKey = dateKeys[dateIndex];
        if (dateKey === undefined) continue;

        const currentValues = kind === 'plan' ? nextPlanByDate : nextFactByDate;
        const currentValue = currentValues?.[dateKey];
        const nextValue = mode === 'clear' ? undefined : value;
        if (currentValue === nextValue) continue;

        if (kind === 'plan') {
          nextPlanByDate = { ...(nextPlanByDate ?? {}) };
          if (nextValue === undefined) {
            delete nextPlanByDate[dateKey];
          } else {
            nextPlanByDate[dateKey] = nextValue;
          }
        } else {
          nextFactByDate = { ...(nextFactByDate ?? {}) };
          if (nextValue === undefined) {
            delete nextFactByDate[dateKey];
          } else {
            nextFactByDate[dateKey] = nextValue;
          }
        }
        didChange = true;
      }

      if (didChange) {
        changedTasksById.set(task.id, {
          ...currentChangedTask,
          ...(nextPlanByDate !== currentChangedTask.planByDate ? { planByDate: nextPlanByDate ?? {} } : {}),
          ...(nextFactByDate !== currentChangedTask.factByDate ? { factByDate: nextFactByDate ?? {} } : {}),
        } as TTask);
      }
    }

    const changedTasks = Array.from(changedTasksById.values());
    if (changedTasks.length > 0) {
      onTasksChange?.(changedTasks);
    }
  }, [dateKeys, onTasksChange, parentTaskIds, tasks]);

  const clearSelectedCells = useCallback(() => {
    const activeRange = fillRange ?? selectedRange;
    if (!activeRange) {
      if (!activeCell) return;
      const task = taskById.get(activeCell.taskId);
      if (!task || parentTaskIds.has(task.id)) return;
      commitCell(task, activeCell.dateIndex, activeCell.kind, undefined);
      return;
    }

    const bounds = getRangeBounds(activeRange);
    if (bounds) {
      commitRangeCells(bounds, undefined, 'clear');
    }
  }, [activeCell, commitCell, commitRangeCells, fillRange, getRangeBounds, parentTaskIds, selectedRange, taskById]);

  const commitSelectedCells = useCallback((value: number | undefined) => {
    const activeRange = fillRange ?? selectedRange;
    if (!activeRange) {
      if (!activeCell) return;
      const task = taskById.get(activeCell.taskId);
      if (!task || parentTaskIds.has(task.id)) return;
      commitCell(task, activeCell.dateIndex, activeCell.kind, value);
      return;
    }

    const bounds = getRangeBounds(activeRange);
    if (bounds) {
      commitRangeCells(bounds, value, 'set');
    }
  }, [activeCell, commitCell, commitRangeCells, fillRange, getRangeBounds, parentTaskIds, selectedRange, taskById]);

  const getCellValue = useCallback((cell: ActiveCell) => {
    const task = taskById.get(cell.taskId);
    if (!task) return undefined;
    const dateKey = dateKeys[cell.dateIndex];
    return cell.kind === 'plan' ? task.planByDate?.[dateKey] : task.factByDate?.[dateKey];
  }, [dateKeys, taskById]);

  const applyFillRange = useCallback((nextFillRange?: CellRange | null) => {
    const targetRange = nextFillRange ?? fillRange;
    if (!selectedRange || !targetRange) return;

    const sourceBounds = getRangeBounds(selectedRange);
    const targetBounds = getRangeBounds(targetRange);
    if (!sourceBounds || !targetBounds) return;

    const sourceDateSpan = sourceBounds.toDateIndex - sourceBounds.fromDateIndex + 1;
    const sourceSubrowSpan = sourceBounds.toSubrowIndex - sourceBounds.fromSubrowIndex + 1;
    const changedTasksById = new Map<string, TTask>();

    for (let subrowIndex = targetBounds.fromSubrowIndex; subrowIndex <= targetBounds.toSubrowIndex; subrowIndex += 1) {
      const targetCellForRow = getCellFromPosition(subrowIndex, targetBounds.fromDateIndex);
      if (!targetCellForRow || parentTaskIds.has(targetCellForRow.taskId)) continue;

      const originalTask = taskById.get(targetCellForRow.taskId);
      if (!originalTask) continue;

      let changedTask = changedTasksById.get(originalTask.id) ?? originalTask;
      let nextPlanByDate = changedTask.planByDate;
      let nextFactByDate = changedTask.factByDate;
      let didChange = false;

      for (let dateIndex = targetBounds.fromDateIndex; dateIndex <= targetBounds.toDateIndex; dateIndex += 1) {
        const targetCell = getCellFromPosition(subrowIndex, dateIndex);
        if (!targetCell || isCellInRange(targetCell, selectedRange)) continue;

        const sourceSubrowIndex = sourceBounds.fromSubrowIndex
          + ((subrowIndex - sourceBounds.fromSubrowIndex) % sourceSubrowSpan + sourceSubrowSpan) % sourceSubrowSpan;
        const sourceDateIndex = sourceBounds.fromDateIndex
          + ((dateIndex - sourceBounds.fromDateIndex) % sourceDateSpan + sourceDateSpan) % sourceDateSpan;
        const sourceCell = getCellFromPosition(sourceSubrowIndex, sourceDateIndex);
        if (!sourceCell) continue;

        const nextValue = getCellValue(sourceCell);
        const dateKey = dateKeys[dateIndex];
        const currentValues = targetCell.kind === 'plan' ? nextPlanByDate : nextFactByDate;
        if (currentValues?.[dateKey] === nextValue) continue;

        if (targetCell.kind === 'plan') {
          nextPlanByDate = { ...(nextPlanByDate ?? {}) };
          if (nextValue === undefined) {
            delete nextPlanByDate[dateKey];
          } else {
            nextPlanByDate[dateKey] = nextValue;
          }
        } else {
          nextFactByDate = { ...(nextFactByDate ?? {}) };
          if (nextValue === undefined) {
            delete nextFactByDate[dateKey];
          } else {
            nextFactByDate[dateKey] = nextValue;
          }
        }
        didChange = true;
      }

      if (didChange) {
        changedTasksById.set(originalTask.id, {
          ...changedTask,
          ...(nextPlanByDate !== changedTask.planByDate ? { planByDate: nextPlanByDate ?? {} } : {}),
          ...(nextFactByDate !== changedTask.factByDate ? { factByDate: nextFactByDate ?? {} } : {}),
        } as TTask);
      }
    }

    const changedTasks = Array.from(changedTasksById.values());
    if (changedTasks.length > 0) {
      onTasksChange?.(changedTasks);
    }
    setSelectedRange(targetRange);
    setActiveCell(targetRange.anchor);
    setFillRange(null);
  }, [
    dateKeys,
    fillRange,
    getCellFromPosition,
    getCellValue,
    getRangeBounds,
    isCellInRange,
    onTasksChange,
    parentTaskIds,
    selectedRange,
    taskById,
  ]);

  const moveActiveCell = useCallback((cell: ActiveCell, direction: 'left' | 'right' | 'up' | 'down') => {
    const taskIndex = tasks.findIndex((task) => task.id === cell.taskId);
    if (taskIndex < 0) return;

    let nextCell = { ...cell };
    if (direction === 'left') {
      nextCell.dateIndex = Math.max(0, cell.dateIndex - 1);
    } else if (direction === 'right') {
      nextCell.dateIndex = Math.min(dateRange.length - 1, cell.dateIndex + 1);
    } else if (direction === 'up') {
      if (cell.kind === 'fact') {
        nextCell.kind = 'plan';
      } else {
        const previousEditableTaskIndex = findEditableTaskIndex(tasks, parentTaskIds, taskIndex - 1, -1);
        if (previousEditableTaskIndex === null) return;
        const previousTask = tasks[previousEditableTaskIndex];
        nextCell = { taskId: previousTask.id, dateIndex: cell.dateIndex, kind: 'fact' };
      }
    } else if (direction === 'down') {
      if (cell.kind === 'plan') {
        nextCell.kind = 'fact';
      } else {
        const nextEditableTaskIndex = findEditableTaskIndex(tasks, parentTaskIds, taskIndex + 1, 1);
        if (nextEditableTaskIndex === null) return;
        const nextTask = tasks[nextEditableTaskIndex];
        nextCell = { taskId: nextTask.id, dateIndex: cell.dateIndex, kind: 'plan' };
      }
    }

    setActiveCell(nextCell);
    setSelectedRange({ anchor: nextCell, focus: nextCell });
    onTaskSelect?.(nextCell.taskId);
    focusCell(nextCell);
  }, [dateRange.length, focusCell, onTaskSelect, parentTaskIds, tasks]);

  const extendSelectedRange = useCallback((cell: ActiveCell, direction: 'left' | 'right' | 'up' | 'down') => {
    const taskIndex = tasks.findIndex((task) => task.id === cell.taskId);
    if (taskIndex < 0) return;

    let nextCell = { ...cell };
    if (direction === 'left') {
      nextCell.dateIndex = Math.max(0, cell.dateIndex - 1);
    } else if (direction === 'right') {
      nextCell.dateIndex = Math.min(dateRange.length - 1, cell.dateIndex + 1);
    } else if (direction === 'up') {
      if (cell.kind === 'fact') {
        nextCell.kind = 'plan';
      } else {
        const previousEditableTaskIndex = findEditableTaskIndex(tasks, parentTaskIds, taskIndex - 1, -1);
        if (previousEditableTaskIndex === null) return;
        const previousTask = tasks[previousEditableTaskIndex];
        nextCell = { taskId: previousTask.id, dateIndex: cell.dateIndex, kind: 'fact' };
      }
    } else if (direction === 'down') {
      if (cell.kind === 'plan') {
        nextCell.kind = 'fact';
      } else {
        const nextEditableTaskIndex = findEditableTaskIndex(tasks, parentTaskIds, taskIndex + 1, 1);
        if (nextEditableTaskIndex === null) return;
        const nextTask = tasks[nextEditableTaskIndex];
        nextCell = { taskId: nextTask.id, dateIndex: cell.dateIndex, kind: 'plan' };
      }
    }

    setActiveCell((currentActiveCell) => currentActiveCell ?? cell);
    setFillRange(null);
    setSelectedRange((currentRange) => ({
      anchor: currentRange?.anchor ?? cell,
      focus: nextCell,
    }));
    onTaskSelect?.(nextCell.taskId);
    focusCell(selectedRange?.anchor ?? cell);
  }, [dateRange.length, focusCell, onTaskSelect, parentTaskIds, selectedRange, tasks]);

  useEffect(() => {
    const endSelection = () => {
      let pendingFillRange: CellRange | null = null;
      if (hoverFrameRef.current !== null) {
        window.cancelAnimationFrame(hoverFrameRef.current);
        hoverFrameRef.current = null;
        const pendingCell = pendingHoverCellRef.current;
        if (pendingCell && isFillDraggingRef.current && selectedRange) {
          pendingFillRange = { anchor: selectedRange.anchor, focus: pendingCell };
        }
        flushPendingHoverCell();
      }
      if (isFillDraggingRef.current) {
        isFillDraggingRef.current = false;
        applyFillRange(pendingFillRange);
      }
      isSelectingRef.current = false;
    };

    window.addEventListener('mouseup', endSelection);
    return () => {
      window.removeEventListener('mouseup', endSelection);
    };
  }, [applyFillRange, flushPendingHoverCell]);

  useEffect(() => () => {
    if (hoverFrameRef.current !== null) {
      window.cancelAnimationFrame(hoverFrameRef.current);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      clearSelection();
    };

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target;
      if (target instanceof Node && rootRef.current?.contains(target)) {
        return;
      }
      clearSelection();
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [clearSelection]);

  return (
    <div
      ref={rootRef}
      className="gantt-pf-root"
      style={{
        width: `${totalWidth}px`,
        ['--gantt-pf-day-width' as string]: `${dayWidth}px`,
      }}
    >
      <div className="gantt-pf-header" style={{ width: `${totalWidth}px`, height: `${headerHeight}px` }}>
        <TimeScaleHeader
          days={dateRange}
          dayWidth={dayWidth}
          headerHeight={headerHeight - 1}
          viewMode="day"
        />
        {todayDateIndex !== undefined && todayDateIndex >= 0 && (
          <span
            className="gantt-pf-headerTodayLine"
            aria-hidden="true"
            style={{
              left: `${todayDateIndex * dayWidth}px`,
              top: `${Math.max(0, headerHeight / 2)}px`,
            }}
          />
        )}
      </div>
      <div className="gantt-pf-monthSeparatorLayer" aria-hidden="true">
        {monthSeparatorIndices.map((dateIndex) => (
          <span
            key={`month-separator-${dateIndex}`}
            className="gantt-pf-monthSeparator"
            style={{
              left: `${Math.round(dateIndex * dayWidth)}px`,
              top: `${Math.max(0, headerHeight / 2)}px`,
            }}
          />
        ))}
      </div>
      <div
        ref={bodyRef}
        className="gantt-pf-body"
        style={{
          height: `${tasks.length * rowHeight}px`,
          minHeight: bodyMinHeight,
          width: `${totalWidth}px`,
        }}
      >
        {renderedRowIndices.map((rowIndex) => {
          const task = tasks[rowIndex];
          if (!task) return null;
          const isParent = parentTaskIds.has(task.id);
          const isHighlighted = filterMode === 'highlight' && !!highlightedTaskIds?.has(task.id);

          return (
            <PlanFactRow
              key={task.id}
              task={task}
              rowIndex={rowIndex}
              dateRange={dateRange}
              dateKeys={dateKeys}
              renderedDateIndices={renderedDateIndices}
              rowHeight={rowHeight}
              subrowHeight={subrowHeight}
              dayWidth={dayWidth}
              plannedRange={plannedRangeByTaskId.get(task.id) ?? null}
              todayDateIndex={todayDateIndex}
              isParent={isParent}
              isHighlighted={isHighlighted}
              selectedTaskId={selectedTaskId}
              activeCell={activeCell}
              editingCell={editingCell}
              selectedRange={selectedRange}
              renderedRangeBounds={renderedRangeBounds}
              didDragSelectRef={didDragSelectRef}
              isSelectingRef={isSelectingRef}
              isFillDraggingRef={isFillDraggingRef}
              onTaskSelect={onTaskSelect}
              selectSingleCell={selectSingleCell}
              queueHoverCellUpdate={queueHoverCellUpdate}
              setActiveCell={setActiveCell}
              setEditingCell={setEditingCell}
              setFillRange={setFillRange}
              clearSelectedCells={clearSelectedCells}
              commitCell={commitCell}
              commitSelectedCells={commitSelectedCells}
              moveActiveCell={moveActiveCell}
              extendSelectedRange={extendSelectedRange}
              focusCell={focusCell}
              showOverflowTooltip={showOverflowTooltip}
              hideOverflowTooltip={hideOverflowTooltip}
            />
          );
        })}
      </div>
      {overflowTooltip && (
        <div
          className="gantt-pf-overflowTooltip"
          role="tooltip"
          aria-hidden="true"
          style={{
            left: `${overflowTooltip.left}px`,
            top: `${overflowTooltip.top}px`,
          }}
        >
          {overflowTooltip.label}
        </div>
      )}
    </div>
  );
}
