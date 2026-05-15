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

type EditingCell = ActiveCell & {
  startValue?: string;
};

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

function isDateWithinTask(task: Task, date: Date) {
  const start = parseUTCDate(task.startDate);
  const end = parseUTCDate(task.endDate);
  const dateMs = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const startMs = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const endMs = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  return startMs <= dateMs && dateMs <= endMs;
}

function formatValue(value: number | undefined) {
  if (value === undefined) return '';
  return Number.isInteger(value) ? String(value) : String(value).replace('.', ',');
}

function getSubrowIndex(taskIndex: number, kind: PlanFactCellKind) {
  return taskIndex * 2 + (kind === 'plan' ? 0 : 1);
}

function PlanFactCellEditor({
  value,
  startValue,
  onCommit,
  onCancel,
}: {
  value: number | undefined;
  startValue?: string;
  onCommit: (value: number | undefined) => void;
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
          commit();
        }
      }}
    />
  );
}

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
}: PlanFactMatrixProps<TTask>) {
  const [activeCell, setActiveCell] = useState<ActiveCell | null>(null);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [selectedRange, setSelectedRange] = useState<CellRange | null>(null);
  const isSelectingRef = useRef(false);
  const didDragSelectRef = useRef(false);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  const totalWidth = dateRange.length * dayWidth;
  const subrowHeight = rowHeight / 2;
  const parentTaskIds = useMemo(() => {
    const ids = new Set<string>();
    for (const task of allTasks) {
      if (task.parentId) ids.add(task.parentId);
    }
    return ids;
  }, [allTasks]);

  const dateKeys = useMemo(() => dateRange.map(formatDateKey), [dateRange]);
  const taskIndexById = useMemo(() => {
    const indexById = new Map<string, number>();
    tasks.forEach((task, index) => indexById.set(task.id, index));
    return indexById;
  }, [tasks]);

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

  const selectSingleCell = useCallback((cell: ActiveCell) => {
    setActiveCell(cell);
    setSelectedRange({ anchor: cell, focus: cell });
  }, []);

  const isCellInSelectedRange = useCallback((cell: ActiveCell) => {
    if (!selectedRange) return false;

    const anchorTaskIndex = taskIndexById.get(selectedRange.anchor.taskId);
    const focusTaskIndex = taskIndexById.get(selectedRange.focus.taskId);
    const cellTaskIndex = taskIndexById.get(cell.taskId);
    if (anchorTaskIndex === undefined || focusTaskIndex === undefined || cellTaskIndex === undefined) {
      return false;
    }

    const fromDateIndex = Math.min(selectedRange.anchor.dateIndex, selectedRange.focus.dateIndex);
    const toDateIndex = Math.max(selectedRange.anchor.dateIndex, selectedRange.focus.dateIndex);
    const fromSubrowIndex = Math.min(
      getSubrowIndex(anchorTaskIndex, selectedRange.anchor.kind),
      getSubrowIndex(focusTaskIndex, selectedRange.focus.kind)
    );
    const toSubrowIndex = Math.max(
      getSubrowIndex(anchorTaskIndex, selectedRange.anchor.kind),
      getSubrowIndex(focusTaskIndex, selectedRange.focus.kind)
    );
    const cellSubrowIndex = getSubrowIndex(cellTaskIndex, cell.kind);

    return cell.dateIndex >= fromDateIndex
      && cell.dateIndex <= toDateIndex
      && cellSubrowIndex >= fromSubrowIndex
      && cellSubrowIndex <= toSubrowIndex;
  }, [selectedRange, taskIndexById]);

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

  const clearSelectedCells = useCallback(() => {
    if (!selectedRange) {
      if (!activeCell) return;
      const task = tasks.find((candidate) => candidate.id === activeCell.taskId);
      if (!task || parentTaskIds.has(task.id)) return;
      commitCell(task, activeCell.dateIndex, activeCell.kind, undefined);
      return;
    }

    const changedTasksById = new Map<string, TTask>();
    for (const task of tasks) {
      if (parentTaskIds.has(task.id)) continue;

      let nextPlanByDate = task.planByDate;
      let nextFactByDate = task.factByDate;
      let didChange = false;

      for (let dateIndex = 0; dateIndex < dateKeys.length; dateIndex += 1) {
        const dateKey = dateKeys[dateIndex];
        const planCell = { taskId: task.id, dateIndex, kind: 'plan' as const };
        if (isCellInSelectedRange(planCell) && nextPlanByDate?.[dateKey] !== undefined) {
          nextPlanByDate = { ...(nextPlanByDate ?? {}) };
          delete nextPlanByDate[dateKey];
          didChange = true;
        }

        const factCell = { taskId: task.id, dateIndex, kind: 'fact' as const };
        if (isCellInSelectedRange(factCell) && nextFactByDate?.[dateKey] !== undefined) {
          nextFactByDate = { ...(nextFactByDate ?? {}) };
          delete nextFactByDate[dateKey];
          didChange = true;
        }
      }

      if (didChange) {
        changedTasksById.set(task.id, {
          ...task,
          ...(nextPlanByDate !== task.planByDate ? { planByDate: nextPlanByDate ?? {} } : {}),
          ...(nextFactByDate !== task.factByDate ? { factByDate: nextFactByDate ?? {} } : {}),
        } as TTask);
      }
    }

    const changedTasks = Array.from(changedTasksById.values());
    if (changedTasks.length > 0) {
      onTasksChange?.(changedTasks);
    }
  }, [activeCell, commitCell, dateKeys, isCellInSelectedRange, onTasksChange, parentTaskIds, selectedRange, tasks]);

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
        const previousTask = tasks[Math.max(0, taskIndex - 1)];
        nextCell = { taskId: previousTask.id, dateIndex: cell.dateIndex, kind: 'fact' };
      }
    } else if (direction === 'down') {
      if (cell.kind === 'plan') {
        nextCell.kind = 'fact';
      } else {
        const nextTask = tasks[Math.min(tasks.length - 1, taskIndex + 1)];
        nextCell = { taskId: nextTask.id, dateIndex: cell.dateIndex, kind: 'plan' };
      }
    }

    setActiveCell(nextCell);
    setSelectedRange({ anchor: nextCell, focus: nextCell });
    onTaskSelect?.(nextCell.taskId);
    focusCell(nextCell);
  }, [dateRange.length, focusCell, onTaskSelect, tasks]);

  useEffect(() => {
    const endSelection = () => {
      isSelectingRef.current = false;
    };

    window.addEventListener('mouseup', endSelection);
    return () => {
      window.removeEventListener('mouseup', endSelection);
    };
  }, []);

  return (
    <div className="gantt-pf-root" style={{ width: `${totalWidth}px` }}>
      <div className="gantt-pf-header" style={{ width: `${totalWidth}px`, height: `${headerHeight}px` }}>
        <TimeScaleHeader
          days={dateRange}
          dayWidth={dayWidth}
          headerHeight={headerHeight - 1}
          viewMode="day"
        />
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
        {tasks.map((task, rowIndex) => {
          const isParent = parentTaskIds.has(task.id);
          const isHighlighted = filterMode === 'highlight' && !!highlightedTaskIds?.has(task.id);
          return (
            <div
              key={task.id}
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
              }}
              onClick={() => onTaskSelect?.(task.id)}
            >
              {dateRange.map((date, dateIndex) => {
                const dateKey = dateKeys[dateIndex];
                const planned = isDateWithinTask(task, date);
                return (['plan', 'fact'] as const).map((kind) => {
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
                  const isSelected = !isParent && isCellInSelectedRange(currentCell);

                  return (
                    <div
                      key={`${task.id}:${dateKey}:${kind}`}
                      data-plan-fact-task-id={task.id}
                      data-plan-fact-date-index={dateIndex}
                      data-plan-fact-kind={kind}
                      className={joinClasses(
                        'gantt-pf-cell',
                        `gantt-pf-cell-${kind}`,
                        planned && kind === 'plan' && !isParent && 'gantt-pf-cell-planned',
                        value !== undefined && 'gantt-pf-cell-hasValue',
                        kind === 'fact' && factStatus === 'success' && 'gantt-pf-cell-factSuccess',
                        kind === 'fact' && factStatus === 'warning' && 'gantt-pf-cell-factWarning',
                        isSelected && 'gantt-pf-cell-selected',
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
                        if (isParent || !isSelectingRef.current) return;
                        didDragSelectRef.current = true;
                        setActiveCell(currentCell);
                        setSelectedRange((currentRange) => ({
                          anchor: currentRange?.anchor ?? currentCell,
                          focus: currentCell,
                        }));
                        onTaskSelect?.(task.id);
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
                          moveActiveCell(currentCell, direction);
                          return;
                        }
                        if (event.key === 'Enter' || event.key === 'F2') {
                          event.preventDefault();
                          event.stopPropagation();
                          setEditingCell(currentCell);
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
                            setActiveCell(nextActiveCell);
                            focusCell(nextActiveCell);
                          }}
                          onCancel={() => {
                            setEditingCell(null);
                            const nextActiveCell = { taskId: task.id, dateIndex, kind };
                            setActiveCell(nextActiveCell);
                            focusCell(nextActiveCell);
                          }}
                        />
                      ) : (
                        <span className="gantt-pf-cellValue">{isParent ? '' : formatValue(value)}</span>
                      )}
                    </div>
                  );
                });
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
