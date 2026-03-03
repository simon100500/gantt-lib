'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { Task } from '../GanttChart';
import type { LinkType } from '../../types';
import { parseUTCDate } from '../../utils/dateUtils';
import { computeLagFromDates } from '../../utils/dependencyUtils';
import { Input } from '../ui/Input';
import { DatePicker } from '../ui/DatePicker';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/Popover';
import { LINK_TYPE_ICONS } from './DepIcons';

// ---------------------------------------------------------------------------
// DepChip — local unified component used in both single-chip cell and popover
// ---------------------------------------------------------------------------
interface DepChipProps {
  lag?: number;
  dep: { taskId: string; type: LinkType };
  taskId: string;
  predecessorName?: string;
  selectedChip: TaskListRowProps['selectedChip'];
  disableDependencyEditing: boolean;
  onChipSelect: TaskListRowProps['onChipSelect'];
  onRowClick: TaskListRowProps['onRowClick'];
  onScrollToTask: TaskListRowProps['onScrollToTask'];
  onRemoveDependency: TaskListRowProps['onRemoveDependency'];
  onChipSelectClear: () => void;
}

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <path d="M3 6h18" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

function formatDepDescription(type: LinkType, lag: number | undefined): string {
  const effectiveLag = lag ?? 0;

  if (type === 'FS') {
    if (effectiveLag > 0) return `Начать через ${effectiveLag} дн. после окончания`;
    if (effectiveLag < 0) return `Начать за ${Math.abs(effectiveLag)} дн. до окончания`;
    return `Начать сразу после окончания`;
  }
  if (type === 'FF') {
    if (effectiveLag > 0) return `Завершить через ${effectiveLag} дн. после окончания`;
    if (effectiveLag < 0) return `Завершить за ${Math.abs(effectiveLag)} дн. до окончания`;
    return `Завершить после окончания`;
  }
  if (type === 'SS') {
    if (effectiveLag > 0) return `Начать через ${effectiveLag} дн. после начала`;
    if (effectiveLag < 0) return `Начать за ${Math.abs(effectiveLag)} дн. до начала`;
    return `Начать вместе с началом`;
  }
  if (type === 'SF') {
    if (effectiveLag > 0) return `Завершить через ${effectiveLag} дн. после начала`;
    if (effectiveLag < 0) return `Завершить за ${Math.abs(effectiveLag)} дн. до начала`;
    return `Завершить до начала`;
  }
  return '';
}

const DepChip: React.FC<DepChipProps> = ({
  lag,
  dep,
  taskId,
  predecessorName,
  selectedChip,
  disableDependencyEditing,
  onChipSelect,
  onRowClick,
  onScrollToTask,
  onRemoveDependency,
  onChipSelectClear,
}) => {
  const isSelected =
    selectedChip?.successorId === taskId &&
    selectedChip?.predecessorId === dep.taskId &&
    selectedChip?.linkType === dep.type;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disableDependencyEditing) return;
    onChipSelect?.(isSelected ? null : { successorId: taskId, predecessorId: dep.taskId, linkType: dep.type });
    if (!isSelected) {
      onRowClick?.(taskId);
      onScrollToTask?.(taskId);
    }
  };

  const handleTrashClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemoveDependency?.(taskId, dep.taskId, dep.type);
    onChipSelectClear();
  };

  const Icon = LINK_TYPE_ICONS[dep.type];
  const depPrefix = formatDepDescription(dep.type, lag);
  const depName = predecessorName ?? dep.taskId;

  return (
    <Popover open={isSelected} onOpenChange={(open) => { if (!open) onChipSelectClear(); }}>
      <span className="gantt-tl-dep-chip-wrapper">
        <PopoverTrigger asChild>
          <span
            className={`gantt-tl-dep-chip${isSelected ? ' gantt-tl-dep-chip-selected' : ''}`}

            onClick={handleClick}
          >
            <><Icon />{lag != null && lag !== 0 ? (lag > 0 ? `+${lag}` : `${lag}`) : ''}</>
          </span>
        </PopoverTrigger>
        {!disableDependencyEditing && (
          <button
            type="button"
            className="gantt-tl-dep-chip-trash"
            aria-label="Удалить связь"
            onClick={handleTrashClick}
          >
            <TrashIcon />
          </button>
        )}
      </span>
      <PopoverContent portal={true} side="bottom" align="start" className="gantt-tl-dep-info-popover">
        <span className="gantt-tl-dep-info-prefix">{depPrefix}</span>
        <span className="gantt-tl-dep-info-name">{depName}</span>
      </PopoverContent>
    </Popover>
  );
};

export interface TaskListRowProps {
  /** Task data to render */
  task: Task;
  /** Index of the task row (for display in № column) */
  rowIndex: number;
  /** Height of the task row in pixels */
  rowHeight: number;
  /** Callback when task is modified via inline edit */
  onTaskChange?: (task: Task) => void;
  /** ID of currently selected task */
  selectedTaskId?: string;
  /** Callback when task row is clicked */
  onRowClick?: (taskId: string) => void;
  /** Disable task name editing (default: false) */
  disableTaskNameEditing?: boolean;
  /** Disable dependency editing (default: false) */
  disableDependencyEditing?: boolean;
  /** All tasks (for dependency picker) */
  allTasks?: Task[];
  /** Currently active link type for new dependencies */
  activeLinkType?: LinkType;
  /** Task ID currently in predecessor-picking mode (null if not picking) */
  selectingPredecessorFor?: string | null;
  /** Callback to set the task currently in predecessor-picking mode */
  onSetSelectingPredecessorFor?: (taskId: string | null) => void;
  /** Callback to add a dependency link */
  onAddDependency?: (successorTaskId: string, predecessorTaskId: string, linkType: LinkType) => void;
  /** Callback to remove a dependency link */
  onRemoveDependency?: (taskId: string, predecessorTaskId: string, linkType: LinkType) => void;
  /** Currently selected chip (for predecessor-side delete) */
  selectedChip?: { successorId: string; predecessorId: string; linkType: string } | null;
  /** Callback when a chip is clicked (selects it) */
  onChipSelect?: (chip: { successorId: string; predecessorId: string; linkType: LinkType } | null) => void;
  /** Callback to scroll the chart grid to center this task (called when № cell is clicked) */
  onScrollToTask?: (taskId: string) => void;
}

const toISODate = (value: string | Date): string => {
  if (value instanceof Date) return value.toISOString().split('T')[0];
  // Handle full ISO strings like "2026-02-12T00:00:00.000Z"
  if (typeof value === 'string' && value.includes('T')) return value.split('T')[0];
  return value as string;
};

export const TaskListRow: React.FC<TaskListRowProps> = React.memo(
  ({
    task,
    rowIndex,
    rowHeight,
    onTaskChange,
    selectedTaskId,
    onRowClick,
    disableTaskNameEditing = false,
    disableDependencyEditing = false,
    allTasks = [],
    activeLinkType,
    selectingPredecessorFor,
    onSetSelectingPredecessorFor,
    onAddDependency,
    onRemoveDependency,
    selectedChip,
    onChipSelect,
    onScrollToTask,
  }) => {
    const [editingName, setEditingName] = useState(false);
    const [nameValue, setNameValue] = useState('');
    const nameInputRef = useRef<HTMLInputElement>(null);
    const [overflowOpen, setOverflowOpen] = useState(false);

    const isSelected = selectedTaskId === task.id;

    // Picker mode flags for this row
    const isPicking = selectingPredecessorFor != null;
    const isSourceRow = isPicking && selectingPredecessorFor === task.id;

    // Chip data: compute effective lag from actual dates (always correct, even on initial load)
    const chips = useMemo(() => {
      const succStart = new Date(task.startDate as string);
      const succEnd = new Date(task.endDate as string);
      const taskById = new Map((allTasks ?? []).map(t => [t.id, t]));
      return (task.dependencies ?? []).map(dep => {
        const pred = taskById.get(dep.taskId);
        const lag = pred
          ? computeLagFromDates(
            dep.type,
            new Date(pred.startDate as string),
            new Date(pred.endDate as string),
            succStart,
            succEnd
          )
          : (dep.lag ?? 0);
        return { dep, lag, predecessorName: pred?.name ?? dep.taskId };
      });
    }, [task.dependencies, task.startDate, task.endDate, allTasks]);

    const linkWord = chips.length <= 4 ? 'связи' : 'связей';

    useEffect(() => {
      if (editingName && nameInputRef.current) {
        nameInputRef.current.focus();
      }
    }, [editingName]);

    const handleNameClick = useCallback((e: React.MouseEvent) => {
      if (disableTaskNameEditing) return;
      e.stopPropagation();
      setNameValue(task.name);
      setEditingName(true);
    }, [task.name, disableTaskNameEditing]);

    const handleNameSave = useCallback(() => {
      if (nameValue.trim()) {
        onTaskChange?.({ ...task, name: nameValue.trim() });
      }
      setEditingName(false);
    }, [nameValue, task, onTaskChange]);

    const handleNameCancel = useCallback(() => {
      setEditingName(false);
    }, []);

    const handleNameKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') handleNameSave();
      else if (e.key === 'Escape') handleNameCancel();
    }, [handleNameSave, handleNameCancel]);

    // Both date pickers shift the whole task (preserving duration), same as drag-move
    const handleStartDateChange = useCallback((newDateISO: string) => {
      if (!newDateISO) return;
      const origStart = parseUTCDate(task.startDate);
      const origEnd = parseUTCDate(task.endDate);
      const durationMs = origEnd.getTime() - origStart.getTime();
      const newStart = new Date(newDateISO + 'T00:00:00Z');
      const newEnd = new Date(newStart.getTime() + durationMs);
      onTaskChange?.({ ...task, startDate: newDateISO, endDate: newEnd.toISOString().split('T')[0] });
    }, [task, onTaskChange]);

    const handleEndDateChange = useCallback((newDateISO: string) => {
      if (!newDateISO) return;
      const origStart = parseUTCDate(task.startDate);
      const origEnd = parseUTCDate(task.endDate);
      const durationMs = origEnd.getTime() - origStart.getTime();
      const newEnd = new Date(newDateISO + 'T00:00:00Z');
      const newStart = new Date(newEnd.getTime() - durationMs);
      onTaskChange?.({ ...task, startDate: newStart.toISOString().split('T')[0], endDate: newDateISO });
    }, [task, onTaskChange]);

    const handleRowClickInternal = useCallback(() => {
      onRowClick?.(task.id);
    }, [task.id, onRowClick]);

    const handleNumberClick = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      onRowClick?.(task.id);
      onScrollToTask?.(task.id);
    }, [task.id, onRowClick, onScrollToTask]);

    // Dependency handlers
    const handleAddClick = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      onSetSelectingPredecessorFor?.(task.id);
    }, [task.id, onSetSelectingPredecessorFor]);

    const handlePredecessorPick = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      if (!isPicking || isSourceRow) return;
      if (!selectingPredecessorFor || !activeLinkType) return;
      onAddDependency?.(task.id, selectingPredecessorFor, activeLinkType);
    }, [isPicking, isSourceRow, selectingPredecessorFor, task.id, activeLinkType, onAddDependency]);

    // True when this row is the predecessor for the currently selected chip
    const isSelectedPredecessor = selectedChip != null && selectedChip.predecessorId === task.id;

    // Delete the selected dependency from the predecessor row's "Удалить" button
    const handleDeleteSelected = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      if (!selectedChip) return;
      onRemoveDependency?.(selectedChip.successorId, selectedChip.predecessorId, selectedChip.linkType as LinkType);
      onChipSelect?.(null);
    }, [selectedChip, onRemoveDependency, onChipSelect]);

    const startDateISO = toISODate(task.startDate);
    const endDateISO = toISODate(task.endDate);

    return (
      <div
        className={[
          'gantt-tl-row',
          isSelected ? 'gantt-tl-row-selected' : '',
          isPicking && !isSourceRow ? 'gantt-tl-row-picking' : '',
          isSourceRow ? 'gantt-tl-row-picking-self' : '',
        ].filter(Boolean).join(' ')}
        style={{ minHeight: `${rowHeight}px` }}
        onClick={handleRowClickInternal}
      >
        {/* Number column — click selects the row and scrolls the grid to this task */}
        <div
          className="gantt-tl-cell gantt-tl-cell-number"
          onClick={handleNumberClick}
          title="Перейти к работе"
        >
          <span className="gantt-tl-num-label">{rowIndex + 1}</span>
          <svg className="gantt-tl-num-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 12H3" />
            <path d="m11 18 6-6-6-6" />
            <path d="M21 5v14" />
          </svg>
        </div>

        {/* Name column — styled Input overlay on edit */}
        <div className="gantt-tl-cell gantt-tl-cell-name">
          {editingName && (
            <Input
              ref={nameInputRef}
              type="text"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={handleNameSave}
              onKeyDown={handleNameKeyDown}
              className="gantt-tl-name-input"
              onClick={(e) => e.stopPropagation()}
            />
          )}
          <button
            type="button"
            className={`gantt-tl-name-trigger ${disableTaskNameEditing ? 'gantt-tl-name-locked' : ''}`}
            onClick={handleNameClick}
            style={editingName ? { visibility: 'hidden', pointerEvents: 'none' } : undefined}
          >
            {task.name}
          </button>
        </div>

        {/* Start Date — DatePicker component */}
        <div className="gantt-tl-cell gantt-tl-cell-date" onClick={(e) => e.stopPropagation()}>
          <DatePicker
            value={startDateISO}
            onChange={handleStartDateChange}
            format="dd.MM.yy"
            portal={true}
            disabled={task.locked}
          />
        </div>

        {/* End Date — DatePicker component */}
        <div className="gantt-tl-cell gantt-tl-cell-date" onClick={(e) => e.stopPropagation()}>
          <DatePicker
            value={endDateISO}
            onChange={handleEndDateChange}
            format="dd.MM.yy"
            portal={true}
            disabled={task.locked}
          />
        </div>

        {/* Dependencies column */}
        <div
          className="gantt-tl-cell gantt-tl-cell-deps"
          onClick={isPicking && !isSourceRow ? handlePredecessorPick : undefined}
        >
          {isSourceRow ? (
            <span className="gantt-tl-dep-source-hint">Выберите задачу</span>
          ) : isSelectedPredecessor && !disableDependencyEditing ? (
            /* Full-replacement: "Зависит от [name]" → hover → "Удалить" */
            <button
              type="button"
              className="gantt-tl-dep-delete-label"
              onClick={handleDeleteSelected}
              aria-label="Удалить связь"
            >
              <span className="gantt-tl-dep-delete-label-default">Связано с</span>
              <span className="gantt-tl-dep-delete-label-hover">Удалить связь</span>
            </button>
          ) : (
            <>
              {chips.length >= 2 ? (
                /* 2+ deps — show only "N связей" summary chip that opens a popover */
                <Popover open={overflowOpen} onOpenChange={setOverflowOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="gantt-tl-dep-summary-chip"
                      onClick={(e) => { e.stopPropagation(); setOverflowOpen(v => !v); }}
                    >
                      {chips.length} {linkWord}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent portal={true} align="start">
                    <div className="gantt-tl-dep-overflow-list" onClick={(e) => e.stopPropagation()}>
                      {chips.map(({ dep, lag, predecessorName }) => (
                        <DepChip
                          key={`${dep.taskId}-${dep.type}`}
                          lag={lag}
                          dep={dep}
                          taskId={task.id}
                          predecessorName={predecessorName}
                          selectedChip={selectedChip}
                          disableDependencyEditing={disableDependencyEditing}
                          onChipSelect={onChipSelect}
                          onRowClick={onRowClick}
                          onScrollToTask={onScrollToTask}
                          onRemoveDependency={onRemoveDependency}
                          onChipSelectClear={() => onChipSelect?.(null)}
                        />
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              ) : chips.length === 1 ? (
                /* Single chip — unified DepChip */
                <DepChip
                  lag={chips[0].lag}
                  dep={chips[0].dep}
                  taskId={task.id}
                  predecessorName={chips[0].predecessorName}
                  selectedChip={selectedChip}
                  disableDependencyEditing={disableDependencyEditing}
                  onChipSelect={onChipSelect}
                  onRowClick={onRowClick}
                  onScrollToTask={onScrollToTask}
                  onRemoveDependency={onRemoveDependency}
                  onChipSelectClear={() => onChipSelect?.(null)}
                />
              ) : null}

              {/* "+" add dependency button — hidden in picker mode and when editing disabled */}
              {!disableDependencyEditing && !isPicking && (
                <button
                  type="button"
                  className="gantt-tl-dep-add"
                  onClick={handleAddClick}
                  aria-label="Добавить связь"
                >
                  +
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  }
);

TaskListRow.displayName = 'TaskListRow';
export default TaskListRow;
