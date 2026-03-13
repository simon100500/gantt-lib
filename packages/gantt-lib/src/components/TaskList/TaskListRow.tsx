'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { Task } from '../GanttChart';
import type { LinkType } from '../../types';
import { parseUTCDate, normalizeTaskDates } from '../../utils/dateUtils';
import { computeLagFromDates, isTaskParent, findParentId } from '../../utils/dependencyUtils';
import { Input } from '../ui/Input';
import { DatePicker } from '../ui/DatePicker';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/Popover';
import { LINK_TYPE_ICONS } from './DepIcons';

const DAY_MS = 24 * 60 * 60 * 1000;

const getInclusiveDurationDays = (startDate: string | Date, endDate: string | Date): number => {
  const start = parseUTCDate(startDate);
  const end = parseUTCDate(endDate);
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1);
};

const getEndDateFromDuration = (startDate: string | Date, durationDays: number): string => {
  const start = parseUTCDate(startDate);
  return new Date(start.getTime() + (durationDays - 1) * DAY_MS).toISOString().split('T')[0];
};

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

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const DragHandleIcon = () => (
  <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
    <circle cx="2" cy="2" r="1.5" />
    <circle cx="8" cy="2" r="1.5" />
    <circle cx="2" cy="7" r="1.5" />
    <circle cx="8" cy="7" r="1.5" />
    <circle cx="2" cy="12" r="1.5" />
    <circle cx="8" cy="12" r="1.5" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 18 6-6-6-6" />
  </svg>
);

// ---------------------------------------------------------------------------
// HierarchyButton — Single button with left/right arrows for hierarchy navigation
// ---------------------------------------------------------------------------
interface HierarchyButtonProps {
  /** Whether the task is a child (can be promoted) */
  isChild: boolean;
  /** Whether the task is a parent (has children) */
  isParent: boolean;
  /** Row index - first row cannot demote */
  rowIndex: number;
  /** Callback when promote is clicked (left arrow) */
  onPromote?: (e: React.MouseEvent) => void;
  /** Callback when demote is clicked (right arrow) */
  onDemote?: (e: React.MouseEvent) => void;
}

const HierarchyButton: React.FC<HierarchyButtonProps> = ({
  isChild,
  isParent,
  rowIndex,
  onPromote,
  onDemote,
}) => {
  // Can promote if task is a child
  const canPromote = isChild && onPromote;
  // Can demote if not a parent and not first row
  const canDemote = !isParent && onDemote && rowIndex > 0;

  // If neither action available, don't render
  if (!canPromote && !canDemote) {
    return null;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (canPromote) {
      onPromote!(e);
    } else if (canDemote) {
      onDemote!(e);
    }
  };

  const title = canPromote
    ? 'Повысить (сделать корневой)'
    : 'Понизить (сделать подчиненной)';

  const ArrowLeft = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 19-7-7 7-7"/>
      <path d="M19 12H5"/>
    </svg>
  );

  const ArrowRight = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14"/>
      <path d="m12 5 7 7-7 7"/>
    </svg>
  );

  return (
    <button
      type="button"
      className="gantt-tl-name-action-btn gantt-tl-action-hierarchy"
      onClick={handleClick}
      title={title}
    >
      {canPromote ? <ArrowLeft /> : <ArrowRight />}
    </button>
  );
};

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
    // When clicking on an already selected chip, prevent the PopoverTrigger from toggling
    if (isSelected) {
      e.preventDefault();
      onChipSelect?.(null);
      return;
    }
    onChipSelect?.({ successorId: taskId, predecessorId: dep.taskId, linkType: dep.type });
    onScrollToTask?.(dep.taskId);
  };

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      onChipSelect?.(null);
    }
  }, [onChipSelect]);

  const handleTrashClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemoveDependency?.(taskId, dep.taskId, dep.type);
    onChipSelectClear();
  };

  const Icon = LINK_TYPE_ICONS[dep.type];
  const depPrefix = formatDepDescription(dep.type, lag);
  const depName = predecessorName ?? dep.taskId;

  // TEMP: render without Popover to test click handler
  return (
    <span className="gantt-tl-dep-chip-wrapper">
      <span
        className={`gantt-tl-dep-chip${isSelected ? ' gantt-tl-dep-chip-selected' : ''}`}
        onClick={handleClick}
      >
        <><Icon />{lag != null && lag !== 0 ? (lag > 0 ? `+${lag}` : `${lag}`) : ''}</>
      </span>
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
  );
};

export interface TaskListRowProps {
  /** Task data to render */
  task: Task;
  /** Index of the task row (for display in № column) */
  rowIndex: number;
  /** Height of the task row in pixels */
  rowHeight: number;
  /** Callback when task is modified via inline edit. Receives array of changed tasks. */
  onTasksChange?: (tasks: Task[]) => void;
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
  /** Callback to scroll the chart grid to center this task (called when task name is clicked) */
  onScrollToTask?: (taskId: string) => void;
  /** Callback when task is deleted */
  onDelete?: (taskId: string) => void;
  /** Callback when a new task is inserted below this row */
  onAdd?: (task: Task) => void;
  /** Callback when a new task is inserted after this task */
  onInsertAfter?: (taskId: string, newTask: Task) => void;
  /** ID of task that should enter edit mode on mount (for auto-edit after insert) */
  editingTaskId?: string | null;
  /** Whether this row is currently being dragged (shows semi-transparent) */
  isDragging?: boolean;
  /** Whether this row is the current drag-over target (shows top border indicator) */
  isDragOver?: boolean;
  /** Called when drag starts on the handle for this row */
  onDragStart?: (index: number, e: React.DragEvent) => void;
  /** Called when something is dragged over this row */
  onDragOver?: (index: number, e: React.DragEvent) => void;
  /** Called when something is dropped on this row */
  onDrop?: (index: number, e: React.DragEvent) => void;
  /** Called when drag ends (drop or Escape) */
  onDragEnd?: (e: React.DragEvent) => void;
  /** Set of collapsed parent task IDs */
  collapsedParentIds?: Set<string>;
  /** Callback when collapse/expand button is clicked */
  onToggleCollapse?: (parentId: string) => void;
  /** Callback when task is promoted (parentId removed) */
  onPromoteTask?: (taskId: string) => void;
  /** Callback when task is demoted (parentId set to previous task) */
  onDemoteTask?: (taskId: string, newParentId: string) => void;
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
    onTasksChange,
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
    onDelete,
    onAdd,
    onInsertAfter,
    editingTaskId,
    isDragging = false,
    isDragOver = false,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
    collapsedParentIds = new Set(),
    onToggleCollapse,
    onPromoteTask,
    onDemoteTask,
  }) => {
    const [editingName, setEditingName] = useState(false);
    const [nameValue, setNameValue] = useState('');
    const nameInputRef = useRef<HTMLInputElement>(null);
    const [editingDuration, setEditingDuration] = useState(false);
    const [durationValue, setDurationValue] = useState(getInclusiveDurationDays(task.startDate, task.endDate));
    const durationInputRef = useRef<HTMLInputElement>(null);
    const [editingProgress, setEditingProgress] = useState(false);
    const [progressValue, setProgressValue] = useState(0);
    const progressInputRef = useRef<HTMLInputElement>(null);
    const [overflowOpen, setOverflowOpen] = useState(false);
    const nameConfirmedRef = useRef(false);  // Prevent double-save on Enter + blur
    const durationConfirmedRef = useRef(false);  // Prevent double-save on Enter + blur
    const progressConfirmedRef = useRef(false);  // Prevent double-save on Enter + blur
    const autoEditedForRef = useRef<string | null>(null);  // Track which editingTaskId we already auto-entered for
    const editTriggerRef = useRef<'keypress' | 'doubleclick' | 'autoedit'>('doubleclick');  // How editing was started
    const [deletePending, setDeletePending] = useState(false);
    const deleteButtonRef = useRef<HTMLButtonElement>(null);

    const isSelected = selectedTaskId === task.id;

    // Hierarchy computed values
    const isParent = useMemo(() => isTaskParent(task.id, allTasks), [task.id, allTasks]);
    const isChild = task.parentId !== undefined;
    const isCollapsed = collapsedParentIds.has(task.id);

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
        if (editTriggerRef.current === 'keypress') {
          // Cursor to end — the typed char is already in the input, don't select it
          const len = nameInputRef.current.value.length;
          nameInputRef.current.setSelectionRange(len, len);
        } else {
          // Double-click or auto-edit-on-insert: select all for easy replacement
          nameInputRef.current.select();
        }
      }
    }, [editingName]);

    // Reset delete confirmation when clicking elsewhere
    useEffect(() => {
      const handleMouseDownOutside = (event: MouseEvent) => {
        if (deletePending && deleteButtonRef.current && !deleteButtonRef.current.contains(event.target as Node)) {
          setDeletePending(false);
        }
      };

      if (deletePending) {
        document.addEventListener('mousedown', handleMouseDownOutside);
      }

      return () => {
        document.removeEventListener('mousedown', handleMouseDownOutside);
      };
    }, [deletePending]);

    // Auto-enter edit mode when this task is created via insert.
    // We track which editingTaskId we already reacted to (autoEditedForRef) so that
    // subsequent re-renders caused by saving the name (which changes task.name) do NOT
    // re-trigger edit mode. Without this guard, saving the name → onTasksChange → new task.name
    // → re-render → effect fires again → edit mode re-entered → user must press Enter twice.
    useEffect(() => {
      if (
        editingTaskId === task.id &&
        !disableTaskNameEditing &&
        autoEditedForRef.current !== editingTaskId
      ) {
        autoEditedForRef.current = editingTaskId;
        nameConfirmedRef.current = false;  // Reset stale flag from any previous Enter-key save
        editTriggerRef.current = 'autoedit';
        setNameValue(task.name);
        setEditingName(true);
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editingTaskId, task.id, disableTaskNameEditing]);

    const handleNameClick = useCallback((e: React.MouseEvent) => {
      if (disableTaskNameEditing) return;
      e.stopPropagation();
      onRowClick?.(task.id);
      onScrollToTask?.(task.id);
    }, [task.id, disableTaskNameEditing, onRowClick, onScrollToTask]);

    const handleNameDoubleClick = useCallback((e: React.MouseEvent) => {
      if (disableTaskNameEditing) return;
      e.stopPropagation();
      nameConfirmedRef.current = false;  // Reset stale flag from any previous Enter-key save
      editTriggerRef.current = 'doubleclick';
      setNameValue(task.name);
      setEditingName(true);
    }, [task.name, disableTaskNameEditing]);

    const handleRowKeyDown = useCallback((e: React.KeyboardEvent) => {
      // Don't handle row keyboard events when editing progress
      if (editingProgress) return;
      // F2: enter edit mode with cursor at end of existing name
      if (!editingName && !disableTaskNameEditing && e.key === 'F2') {
        e.preventDefault();
        nameConfirmedRef.current = false;  // Reset stale flag from any previous Enter-key save
        editTriggerRef.current = 'keypress';  // 'keypress' trigger = cursor at end (not select-all)
        setNameValue(task.name);
        setEditingName(true);
        return;
      }
      // If not editing and a printable key is pressed, start editing
      if (!editingName && !disableTaskNameEditing && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        nameConfirmedRef.current = false;  // Reset stale flag from any previous Enter-key save
        editTriggerRef.current = 'keypress';
        setNameValue(e.key);
        setEditingName(true);
        // Input will be focused by existing useEffect; cursor placed at end (not select-all)
      }
    }, [editingName, disableTaskNameEditing, task.name]);

    const handleNameSave = useCallback(() => {
      if (nameConfirmedRef.current) {
        // Already saved via Enter key, skip blur handler
        nameConfirmedRef.current = false;
        return;
      }
      if (nameValue.trim()) {
        onTasksChange?.([{ ...task, name: nameValue.trim() }]);
      }
      setEditingName(false);
    }, [nameValue, task, onTasksChange]);

    const handleNameCancel = useCallback(() => {
      setEditingName(false);
    }, []);

    const handleNameKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        nameConfirmedRef.current = true;  // Mark as saved to prevent blur from triggering again
        if (nameValue.trim()) {
          onTasksChange?.([{ ...task, name: nameValue.trim() }]);
        }
        setEditingName(false);
      } else if (e.key === 'Escape') {
        handleNameCancel();
      }
    }, [nameValue, task, onTasksChange, handleNameCancel]);

    const handleDurationClick = useCallback((e: React.MouseEvent) => {
      if (task.locked) return;
      e.stopPropagation();
      durationConfirmedRef.current = false;
      setDurationValue(getInclusiveDurationDays(task.startDate, task.endDate));
      setEditingDuration(true);
    }, [task.locked, task.startDate, task.endDate]);

    const applyDurationChange = useCallback((nextDuration: number) => {
      const normalizedDuration = Math.max(1, Math.round(nextDuration) || 1);
      setDurationValue(normalizedDuration);
    }, []);

    const handleDurationSave = useCallback(() => {
      if (durationConfirmedRef.current) {
        durationConfirmedRef.current = false;
        return;
      }
      const normalizedDuration = Math.max(1, Math.round(durationValue) || 1);
      onTasksChange?.([{ ...task, endDate: getEndDateFromDuration(task.startDate, normalizedDuration) }]);
      setEditingDuration(false);
    }, [durationValue, task, onTasksChange]);

    const handleDurationCancel = useCallback(() => {
      setDurationValue(getInclusiveDurationDays(task.startDate, task.endDate));
      setEditingDuration(false);
    }, [task.startDate, task.endDate]);

    const handleDurationAdjust = useCallback((delta: number) => {
      applyDurationChange(durationValue + delta);
    }, [applyDurationChange, durationValue]);

    const handleDurationKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        durationConfirmedRef.current = true;
        const normalizedDuration = Math.max(1, Math.round(durationValue) || 1);
        onTasksChange?.([{ ...task, endDate: getEndDateFromDuration(task.startDate, normalizedDuration) }]);
        setEditingDuration(false);
      } else if (e.key === 'Escape') {
        handleDurationCancel();
      }
    }, [durationValue, task, onTasksChange, handleDurationCancel]);

    const handleProgressClick = useCallback((e: React.MouseEvent) => {
      if (task.locked) return;
      e.stopPropagation();
      progressConfirmedRef.current = false;
      setProgressValue(task.progress ?? 0);
      setEditingProgress(true);
    }, [task.progress, task.locked]);

    const handleProgressSave = useCallback(() => {
      if (progressConfirmedRef.current) {
        progressConfirmedRef.current = false;
        return;
      }
      const clampedValue = Math.max(0, Math.min(100, progressValue));
      onTasksChange?.([{ ...task, progress: clampedValue }]);
      setEditingProgress(false);
    }, [progressValue, task, onTasksChange]);

    const handleProgressCancel = useCallback(() => {
      setEditingProgress(false);
    }, []);

    const handleProgressAdjust = useCallback((delta: number) => {
      setProgressValue((current) => Math.max(0, Math.min(100, current + delta)));
    }, []);

    const handleProgressKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
      e.stopPropagation(); // Prevent row-level keyboard handler from interfering
      if (e.key === 'Enter') {
        progressConfirmedRef.current = true;
        const clampedValue = Math.max(0, Math.min(100, progressValue));
        onTasksChange?.([{ ...task, progress: clampedValue }]);
        setEditingProgress(false);
      } else if (e.key === 'Escape') {
        handleProgressCancel();
      }
    }, [progressValue, task, onTasksChange, handleProgressCancel]);

    useEffect(() => {
      if (editingProgress && progressInputRef.current) {
        progressInputRef.current.focus();
        progressInputRef.current.select();
      }
    }, [editingProgress]);

    useEffect(() => {
      setDurationValue(getInclusiveDurationDays(task.startDate, task.endDate));
    }, [task.startDate, task.endDate]);

    useEffect(() => {
      if (editingDuration && durationInputRef.current) {
        durationInputRef.current.focus();
        durationInputRef.current.select();
      }
    }, [editingDuration]);

    // Both date pickers shift the whole task (preserving duration), same as drag-move
    // Also normalizes dates to ensure startDate is always before or equal to endDate
    const handleStartDateChange = useCallback((newDateISO: string) => {
      if (!newDateISO) return;
      const origStart = parseUTCDate(task.startDate);
      const origEnd = parseUTCDate(task.endDate);
      const durationMs = origEnd.getTime() - origStart.getTime();
      const newStart = new Date(newDateISO + 'T00:00:00Z');
      const newEnd = new Date(newStart.getTime() + durationMs);
      const { startDate: normalizedStart, endDate: normalizedEnd } = normalizeTaskDates(
        newDateISO,
        newEnd.toISOString().split('T')[0]
      );
      onTasksChange?.([{ ...task, startDate: normalizedStart, endDate: normalizedEnd }]);
    }, [task, onTasksChange]);

    const handleEndDateChange = useCallback((newDateISO: string) => {
      if (!newDateISO) return;
      const origStart = parseUTCDate(task.startDate);
      const origEnd = parseUTCDate(task.endDate);
      const durationMs = origEnd.getTime() - origStart.getTime();
      const newEnd = new Date(newDateISO + 'T00:00:00Z');
      const newStart = new Date(newEnd.getTime() - durationMs);
      const { startDate: normalizedStart, endDate: normalizedEnd } = normalizeTaskDates(
        newStart.toISOString().split('T')[0],
        newDateISO
      );
      onTasksChange?.([{ ...task, startDate: normalizedStart, endDate: normalizedEnd }]);
    }, [task, onTasksChange]);

    const handleRowClickInternal = useCallback(() => {
      onRowClick?.(task.id);
    }, [task.id, onRowClick]);

    const handleNumberClick = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      onRowClick?.(task.id);
    }, [task.id, onRowClick]);

    const handleToggleCollapse = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleCollapse?.(task.id);
    }, [task.id, onToggleCollapse]);

    // Hierarchy handlers - promote/demote
    const handlePromote = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      onPromoteTask?.(task.id);
    }, [task.id, onPromoteTask]);

    const handleDemote = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      // Find previous task in allTasks
      const currentIndex = allTasks.findIndex(t => t.id === task.id);
      if (currentIndex > 0) {
        const previousTask = allTasks[currentIndex - 1];
        // Smart demote: if previous task has a parent, use that parent (sibling behavior)
        // Otherwise, use previous task as parent (child behavior)
        const targetParentId = previousTask.parentId || previousTask.id;
        onDemoteTask?.(task.id, targetParentId);
      }
    }, [task.id, allTasks, onDemoteTask]);

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

    const handleCancelPicking = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      onSetSelectingPredecessorFor?.(null);
    }, [onSetSelectingPredecessorFor]);

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
    const endDateISO = editingDuration
      ? getEndDateFromDuration(task.startDate, durationValue)
      : toISODate(task.endDate);

    return (
      <div
        className={[
          'gantt-tl-row',
          isSelected ? 'gantt-tl-row-selected' : '',
          isPicking && !isSourceRow ? 'gantt-tl-row-picking' : '',
          isSourceRow ? 'gantt-tl-row-picking-self' : '',
          isDragging ? 'gantt-tl-row-dragging' : '',
          isDragOver ? 'gantt-tl-row-drag-over' : '',
          isChild ? 'gantt-tl-row-child' : '',
          isParent ? 'gantt-tl-row-parent' : '',
        ].filter(Boolean).join(' ')}
        style={{ minHeight: `${rowHeight}px`, position: 'relative' }}
        onClick={handleRowClickInternal}
        onKeyDown={handleRowKeyDown}
        onDragOver={(e) => onDragOver?.(rowIndex, e)}
        onDrop={(e) => onDrop?.(rowIndex, e)}
        onMouseLeave={() => {
          if (deletePending) {
            setDeletePending(false);
          }
        }}
        tabIndex={isSelected ? 0 : -1}
      >
        {/* Number column — click selects the row */}
        <div
          className="gantt-tl-cell gantt-tl-cell-number"
          onClick={handleNumberClick}
        >
          <span
            className="gantt-tl-drag-handle"
            draggable={true}
            onDragStart={(e) => {
              e.stopPropagation();
              onDragStart?.(rowIndex, e);
            }}
            onDragEnd={(e) => onDragEnd?.(e)}
            onClick={(e) => e.stopPropagation()}
          >
            <DragHandleIcon />
          </span>
          <span className="gantt-tl-num-label">{rowIndex + 1}</span>
        </div>

        {/* Name column — styled Input overlay on edit */}
        <div className="gantt-tl-cell gantt-tl-cell-name">
          {isParent && !editingName && (
            <button
              type="button"
              className={`gantt-tl-collapse-btn ${isCollapsed ? 'gantt-tl-collapse-btn-collapsed' : ''}`}
              onClick={handleToggleCollapse}
              aria-label={isCollapsed ? 'Expand children' : 'Collapse children'}
            >
              <ChevronRightIcon />
            </button>
          )}
          {editingName && (
            <Input
              ref={nameInputRef}
              type="text"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={handleNameSave}
              onKeyDown={handleNameKeyDown}
              className={['gantt-tl-name-input', isChild ? 'gantt-tl-name-input-child' : ''].filter(Boolean).join(' ')}
              onClick={(e) => e.stopPropagation()}
            />
          )}
          <button
            type="button"
            className={[
              'gantt-tl-name-trigger',
              disableTaskNameEditing ? 'gantt-tl-name-locked' : '',
              isParent ? 'gantt-tl-name-trigger-parent' : '',
              isChild ? 'gantt-tl-name-trigger-child' : '',
            ].filter(Boolean).join(' ')}
            title={task.name}
            onClick={handleNameClick}
            onDoubleClick={handleNameDoubleClick}
            style={editingName ? { visibility: 'hidden', pointerEvents: 'none' } : undefined}
          >
            {task.name}
          </button>
          {!editingName && (
            <div className="gantt-tl-name-actions">
              {onInsertAfter && (
                <button
                  type="button"
                  className="gantt-tl-name-action-btn gantt-tl-action-insert"
                  onClick={(e) => {
                    e.stopPropagation();
                    const now = new Date();
                    const todayISO = new Date(Date.UTC(
                      now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()
                    )).toISOString().split('T')[0];
                    const endISO = new Date(Date.UTC(
                      now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 7
                    )).toISOString().split('T')[0];
                    const newTask: Task = {
                      id: crypto.randomUUID(),
                      name: 'Новая задача',
                      startDate: todayISO,
                      endDate: endISO,
                    };
                    onInsertAfter(task.id, newTask);
                  }}
                  aria-label="Вставить задачу после этой"
                >
                  <PlusIcon />
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  ref={deleteButtonRef}
                  className={`gantt-tl-name-action-btn gantt-tl-action-delete${deletePending ? ' gantt-tl-action-delete-confirm' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!deletePending) {
                      setDeletePending(true);
                    } else {
                      setDeletePending(false);
                      onDelete(task.id);
                    }
                  }}
                  aria-label="Удалить задачу"
                >
                  {deletePending ? 'Удалить?' : <TrashIcon />}
                </button>
              )}
              <HierarchyButton
                isChild={isChild}
                isParent={isParent}
                rowIndex={rowIndex}
                onPromote={onPromoteTask ? handlePromote : undefined}
                onDemote={onDemoteTask ? handleDemote : undefined}
              />
            </div>
          )}
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

        {/* Duration column */}
        <div className="gantt-tl-cell gantt-tl-cell-duration" onClick={handleDurationClick}>
          {editingDuration && (
            <div className="gantt-tl-number-editor" onClick={(e) => e.stopPropagation()}>
              <Input
                ref={durationInputRef}
                type="number"
                min={1}
                step={1}
                value={durationValue}
                onChange={(e) => applyDurationChange(parseInt(e.target.value, 10) || 1)}
                onBlur={handleDurationSave}
                onKeyDown={handleDurationKeyDown}
                className="gantt-tl-number-input"
              />
              <div className="gantt-tl-number-steppers" aria-hidden="true">
                <button
                  type="button"
                  className="gantt-tl-number-stepper"
                  tabIndex={-1}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleDurationAdjust(1)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m18 15-6-6-6 6" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="gantt-tl-number-stepper"
                  tabIndex={-1}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleDurationAdjust(-1)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>
              </div>
            </div>
          )}
          <span style={editingDuration ? { visibility: 'hidden', pointerEvents: 'none' } : undefined}>
            {getInclusiveDurationDays(task.startDate, task.endDate)}
          </span>
        </div>

        {/* Progress column */}
        <div className="gantt-tl-cell gantt-tl-cell-progress" onClick={handleProgressClick}>
          {editingProgress && (
            <div className="gantt-tl-number-editor" onClick={(e) => e.stopPropagation()}>
              <Input
                ref={progressInputRef}
                type="number"
                min={0}
                max={100}
                step={1}
                value={progressValue}
                onChange={(e) => setProgressValue(parseInt(e.target.value, 10) || 0)}
                onBlur={handleProgressSave}
                onKeyDown={handleProgressKeyDown}
                className="gantt-tl-number-input"
              />
              <div className="gantt-tl-number-steppers" aria-hidden="true">
                <button
                  type="button"
                  className="gantt-tl-number-stepper"
                  tabIndex={-1}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleProgressAdjust(1)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m18 15-6-6-6 6" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="gantt-tl-number-stepper"
                  tabIndex={-1}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleProgressAdjust(-1)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>
              </div>
            </div>
          )}
          <span style={editingProgress ? { visibility: 'hidden', pointerEvents: 'none' } : undefined}>
            {task.progress ? `${Math.round(task.progress)}%` : '0%'}
          </span>
        </div>

        {/* Dependencies column */}
        <div
          className="gantt-tl-cell gantt-tl-cell-deps"
          onClick={isSourceRow ? handleCancelPicking : (isPicking ? handlePredecessorPick : undefined)}
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

              {/* "+" add dependency button — hidden in picker mode and when editing disabled, hover-reveal */}
              {!disableDependencyEditing && !isPicking && (
                <button
                  type="button"
                  className={`gantt-tl-dep-add gantt-tl-dep-add-hover${selectedChip ? ' gantt-tl-dep-add-hidden' : ''}`}
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
