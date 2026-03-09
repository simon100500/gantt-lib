'use client';

import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import type { Task, TaskDependency } from '../GanttChart';
import type { LinkType } from '../../types';
import { validateDependencies, calculateSuccessorDate } from '../../utils/dependencyUtils';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/Popover';
import { TaskListRow } from './TaskListRow';
import { NewTaskRow } from './NewTaskRow';
import { LINK_TYPE_ICONS, LINK_TYPE_LABELS } from './DepIcons';
import './TaskList.css';

export { LINK_TYPE_ICONS };

const LINK_TYPE_ORDER: LinkType[] = ['FS', 'SS', 'FF', 'SF'];

export interface TaskListProps {
  /** Array of tasks to display */
  tasks: Task[];
  /** Height of each row in pixels (must match Gantt chart's rowHeight) */
  rowHeight: number;
  /** Height of the header row in pixels (must match Gantt chart's headerHeight) */
  headerHeight: number;
  /** Width of the task list overlay in pixels (default: 400) */
  taskListWidth?: number;
  /** Callback when task is modified via inline edit */
  onTaskChange?: (task: Task) => void;
  /** ID of currently selected task */
  selectedTaskId?: string;
  /** Callback when task row is clicked */
  onTaskSelect?: (taskId: string | null) => void;
  /** Show or hide the task list (default: true) */
  show?: boolean;
  /** Disable task name editing in the task list (default: false) */
  disableTaskNameEditing?: boolean;
  /** Disable dependency editing (hides +, ×, and type menu; read-only column) (default: false) */
  disableDependencyEditing?: boolean;
  /** Callback to scroll the chart grid to a task (wired to № cell click) */
  onScrollToTask?: (taskId: string) => void;
  /** Callback when selected chip changes (used by GanttChart to highlight the corresponding arrow) */
  onSelectedChipChange?: (chip: { successorId: string; predecessorId: string; linkType: string } | null) => void;
  /** Callback when a new task is added (called with full Task object including generated id) */
  onAdd?: (task: Task) => void;
  /** Callback when a task is deleted (called with taskId) */
  onDelete?: (taskId: string) => void;
  /** Callback when a new task is inserted after a specific task */
  onInsertAfter?: (taskId: string, newTask: Task) => void;
  /** Callback when tasks are reordered via drag in the task list */
  onReorder?: (tasks: Task[]) => void;
  /** ID of task that should enter edit mode on mount (for auto-edit after insert) */
  editingTaskId?: string | null;
}

/**
 * TaskList component - displays tasks in a table format as an overlay
 *
 * Renders a table with columns: № (number), Name, Start Date, End Date, Dependencies
 * Uses position: sticky for synchronized vertical scrolling with the chart.
 */
export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  rowHeight,
  headerHeight,
  taskListWidth = 472,
  onTaskChange,
  selectedTaskId,
  onTaskSelect,
  show = true,
  disableTaskNameEditing = false,
  disableDependencyEditing = false,
  onScrollToTask,
  onSelectedChipChange,
  onAdd,
  onDelete,
  onInsertAfter,
  onReorder,
  editingTaskId: propEditingTaskId,
}) => {
  const totalHeight = useMemo(
    () => tasks.length * rowHeight,
    [tasks.length, rowHeight]
  );

  const handleRowClick = useCallback((taskId: string) => {
    onTaskSelect?.(taskId);
  }, [onTaskSelect]);

  // Dependency state
  const [activeLinkType, setActiveLinkType] = useState<LinkType>('FS');
  const [selectingPredecessorFor, setSelectingPredecessorFor] = useState<string | null>(null);
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const [cycleError, setCycleError] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Selected chip state: clicking a chip on a successor row selects it,
  // causing the predecessor row to show a "Удалить" button
  const [selectedChip, setSelectedChip] = useState<{
    successorId: string;
    predecessorId: string;
    linkType: LinkType;
  } | null>(null);

  const handleChipSelect = useCallback((chip: {
    successorId: string;
    predecessorId: string;
    linkType: LinkType;
  } | null) => {
    setSelectedChip(chip);
    onSelectedChipChange?.(chip);
  }, [onSelectedChipChange]);

  // Escape / outside-click cancel for picker mode and chip selection
  useEffect(() => {
    if (!selectingPredecessorFor && !selectedChip) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectingPredecessorFor(null);
        setSelectedChip(null);
        onSelectedChipChange?.(null);
      }
    };
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Element;
      if (overlayRef.current?.contains(target)) return;
      // Don't clear when clicking inside a floating portal (popover, date picker, etc.)
      if (target.closest?.('.gantt-popover')) return;
      setSelectingPredecessorFor(null);
      setSelectedChip(null);
      onSelectedChipChange?.(null);
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown, true);
    };
  }, [selectingPredecessorFor, selectedChip, onSelectedChipChange]);

  const handleAddDependency = useCallback((
    successorTaskId: string,
    predecessorTaskId: string,
    linkType: LinkType
  ) => {
    // Guard: no self-links
    if (successorTaskId === predecessorTaskId) return;

    // Guard: no duplicate (same taskId + type)
    const successor = tasks.find(t => t.id === successorTaskId);
    if (!successor) return;
    const alreadyExists = (successor.dependencies ?? []).some(
      d => d.taskId === predecessorTaskId && d.type === linkType
    );
    if (alreadyExists) {
      setSelectingPredecessorFor(null);
      return;
    }

    // Build hypothetical tasks array to validate for cycles
    const newDep: TaskDependency = { taskId: predecessorTaskId, type: linkType, lag: 0 };
    const hypothetical = tasks.map(t =>
      t.id === successorTaskId
        ? { ...t, dependencies: [...(t.dependencies ?? []), newDep] }
        : t
    );
    const validation = validateDependencies(hypothetical);
    if (!validation.isValid) {
      setCycleError(true);
      setTimeout(() => setCycleError(false), 3000);
      return;
    }

    const updatedTask = hypothetical.find(t => t.id === successorTaskId)!;

    // Snap successor dates to the predecessor position (lag=0)
    const predecessor = tasks.find(t => t.id === predecessorTaskId);
    if (predecessor) {
      const predStart = new Date(predecessor.startDate as string);
      const predEnd = new Date(predecessor.endDate as string);
      const constraintDate = calculateSuccessorDate(predStart, predEnd, linkType, 0);

      const origSuccessor = tasks.find(t => t.id === successorTaskId)!;
      const durationMs =
        new Date(origSuccessor.endDate as string).getTime() -
        new Date(origSuccessor.startDate as string).getTime();

      let newStart: Date;
      let newEnd: Date;

      if (linkType === 'FS' || linkType === 'SS') {
        newStart = constraintDate;
        newEnd = new Date(constraintDate.getTime() + durationMs);
      } else {
        newEnd = constraintDate;
        newStart = new Date(constraintDate.getTime() - durationMs);
      }

      const snappedTask: Task = {
        ...updatedTask,
        startDate: newStart.toISOString().split('T')[0],
        endDate: newEnd.toISOString().split('T')[0],
      };
      onTaskChange?.(snappedTask);
    } else {
      // Predecessor not found — emit without snap (graceful fallback)
      onTaskChange?.(updatedTask);
    }

    setSelectingPredecessorFor(null);
  }, [tasks, onTaskChange]);

  const handleRemoveDependency = useCallback((
    taskId: string,
    predecessorTaskId: string,
    linkType: LinkType
  ) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const updatedDeps = (task.dependencies ?? []).filter(
      d => !(d.taskId === predecessorTaskId && d.type === linkType)
    );
    onTaskChange?.({ ...task, dependencies: updatedDeps });
  }, [tasks, onTaskChange]);

  // New task creation state
  const [isCreating, setIsCreating] = useState(false);

  // Drag-to-reorder state
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragOriginIndexRef = useRef<number | null>(null);

  const handleDragStart = useCallback((index: number, e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    setDraggingIndex(index);
    dragOriginIndexRef.current = index;
  }, []);

  const handleDragOver = useCallback((index: number, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }, []);

  const handleDrop = useCallback((dropIndex: number, e: React.DragEvent) => {
    e.preventDefault();
    const originIndex = dragOriginIndexRef.current;
    if (originIndex === null || originIndex === dropIndex) {
      setDraggingIndex(null);
      setDragOverIndex(null);
      dragOriginIndexRef.current = null;
      return;
    }
    const reordered = [...tasks];
    const [moved] = reordered.splice(originIndex, 1);
    // Adjust dropIndex: after splice, indices shift when moving down
    const adjustedDropIndex = originIndex < dropIndex ? dropIndex - 1 : dropIndex;
    reordered.splice(adjustedDropIndex, 0, moved);
    onReorder?.(reordered);
    onTaskSelect?.(moved.id);
    setDraggingIndex(null);
    setDragOverIndex(null);
    dragOriginIndexRef.current = null;
  }, [tasks, onReorder, onTaskSelect]);

  const handleDragEnd = useCallback(() => {
    // Called when drag ends without a valid drop (Escape, or dropped outside)
    // handleDrop already clears state on successful drop, so this is only the cancel path
    setDraggingIndex(null);
    setDragOverIndex(null);
    dragOriginIndexRef.current = null;
  }, []);

  const handleConfirmNewTask = useCallback((name: string) => {
    const now = new Date();
    const todayISO = new Date(Date.UTC(
      now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()
    )).toISOString().split('T')[0];
    const endISO = new Date(Date.UTC(
      now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 7
    )).toISOString().split('T')[0];
    const newTask: Task = {
      id: crypto.randomUUID(),
      name,
      startDate: todayISO,
      endDate: endISO,
    };
    onAdd?.(newTask);
    setIsCreating(false);
  }, [onAdd]);

  const handleCancelNewTask = useCallback(() => setIsCreating(false), []);

  return (
    <div
      ref={overlayRef}
      className={`gantt-tl-overlay${show ? '' : ' gantt-tl-hidden'}`}
      style={{ width: `${taskListWidth}px` }}
    >
      <div className="gantt-tl-table">
        {/* Header row - aligns with TimeScaleHeader, 1px taller for row alignment */}
        <div className="gantt-tl-header" style={{ height: `${headerHeight + 0.5}px` }}>
          <div className="gantt-tl-headerCell gantt-tl-cell-number">№</div>
          <div className="gantt-tl-headerCell gantt-tl-cell-name">Имя</div>
          <div className="gantt-tl-headerCell gantt-tl-cell-date">Начало</div>
          <div className="gantt-tl-headerCell gantt-tl-cell-date">Окончание</div>
          {/* Dependencies column header with type switcher */}
          <div className="gantt-tl-headerCell gantt-tl-cell-deps" style={{ position: 'relative' }}>
            <Popover open={typeMenuOpen} onOpenChange={setTypeMenuOpen}>
              <PopoverTrigger asChild>
                <button
                  className="gantt-tl-dep-type-trigger"
                  disabled={disableDependencyEditing}
                  onClick={(e) => e.stopPropagation()}
                >
                  Связи {React.createElement(LINK_TYPE_ICONS[activeLinkType])} &#9662;
                </button>
              </PopoverTrigger>
              <PopoverContent portal={true} align="start">
                <div className="gantt-tl-dep-type-menu">
                  {LINK_TYPE_ORDER.map(lt => (
                    <button
                      key={lt}
                      className={`gantt-tl-dep-type-option${activeLinkType === lt ? ' active' : ''}`}
                      onClick={() => { setActiveLinkType(lt); setTypeMenuOpen(false); }}
                    >
                      {React.createElement(LINK_TYPE_ICONS[lt])}
                      <span>{LINK_TYPE_LABELS[lt]}</span>
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            {cycleError && (
              <div className="gantt-tl-dep-error">Цикл зависимостей!</div>
            )}
          </div>
        </div>

        {/* Data rows */}
        <div className="gantt-tl-body" style={{ height: `${totalHeight}px` }}>
          {tasks.map((task, index) => (
            <TaskListRow
              key={task.id}
              task={task}
              rowIndex={index}
              rowHeight={rowHeight}
              onTaskChange={onTaskChange}
              selectedTaskId={selectedTaskId}
              onRowClick={handleRowClick}
              disableTaskNameEditing={disableTaskNameEditing}
              disableDependencyEditing={disableDependencyEditing}
              allTasks={tasks}
              activeLinkType={activeLinkType}
              selectingPredecessorFor={selectingPredecessorFor}
              onSetSelectingPredecessorFor={setSelectingPredecessorFor}
              onAddDependency={handleAddDependency}
              onRemoveDependency={handleRemoveDependency}
              selectedChip={selectedChip}
              onChipSelect={handleChipSelect}
              onScrollToTask={onScrollToTask}
              onDelete={onDelete}
              onAdd={onAdd}
              onInsertAfter={onInsertAfter}
              editingTaskId={propEditingTaskId}
              isDragging={draggingIndex === index}
              isDragOver={dragOverIndex === index}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
            />
          ))}
        </div>

        {/* Ghost row for new task creation — positioned OUTSIDE body div to avoid height desync */}
        {isCreating && (
          <NewTaskRow
            rowHeight={rowHeight}
            onConfirm={handleConfirmNewTask}
            onCancel={handleCancelNewTask}
          />
        )}

        {/* Add task button */}
        {onAdd && !isCreating && (
          <button
            className="gantt-tl-add-btn"
            onClick={() => setIsCreating(true)}
            type="button"
          >
            + Добавить задачу
          </button>
        )}
      </div>
    </div>
  );
};

export default TaskList;
