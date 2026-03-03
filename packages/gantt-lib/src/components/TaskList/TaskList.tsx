'use client';

import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import type { Task, TaskDependency } from '../GanttChart';
import type { LinkType } from '../../types';
import { validateDependencies } from '../../utils/dependencyUtils';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/Popover';
import { TaskListRow } from './TaskListRow';
import './TaskList.css';

export const LINK_TYPE_LABELS: Record<LinkType, string> = {
  FS: 'ОН',
  SS: 'НН',
  FF: 'ОО',
  SF: 'НО',
};

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
  taskListWidth = 520,
  onTaskChange,
  selectedTaskId,
  onTaskSelect,
  show = true,
  disableTaskNameEditing = false,
  disableDependencyEditing = false,
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

  // Escape / outside-click cancel for picker mode
  useEffect(() => {
    if (!selectingPredecessorFor) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectingPredecessorFor(null);
    };
    const handleMouseDown = (e: MouseEvent) => {
      if (!overlayRef.current?.contains(e.target as Node)) {
        setSelectingPredecessorFor(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown, true);
    };
  }, [selectingPredecessorFor]);

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
    onTaskChange?.(updatedTask);
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
                  Связи [{LINK_TYPE_LABELS[activeLinkType]} &#9662;]
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
                      {LINK_TYPE_LABELS[lt]}
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
              linkTypeLabels={LINK_TYPE_LABELS}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default TaskList;
