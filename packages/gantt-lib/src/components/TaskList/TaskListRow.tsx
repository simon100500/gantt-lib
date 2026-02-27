'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Task } from '../GanttChart';
import { parseUTCDate } from '../../utils/dateUtils';

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
}

const formatShortDate = (date: Date): string => {
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = String(date.getUTCFullYear()).slice(-2);
  return `${day}.${month}.${year}`;
};

const toISODate = (value: string | Date): string => {
  if (value instanceof Date) return value.toISOString().split('T')[0];
  return value as string;
};

export const TaskListRow: React.FC<TaskListRowProps> = React.memo(
  ({ task, rowIndex, rowHeight, onTaskChange, selectedTaskId, onRowClick }) => {
    const [editingName, setEditingName] = useState(false);
    const [nameValue, setNameValue] = useState('');
    const nameInputRef = useRef<HTMLInputElement>(null);

    const isSelected = selectedTaskId === task.id;

    useEffect(() => {
      if (editingName && nameInputRef.current) {
        nameInputRef.current.focus();
        nameInputRef.current.select();
      }
    }, [editingName]);

    const handleNameClick = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      setNameValue(task.name);
      setEditingName(true);
    }, [task.name]);

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

    const handleDateClick = useCallback((e: React.MouseEvent<HTMLInputElement>) => {
      e.stopPropagation();
      (e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.();
    }, []);

    const handleStartDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.value) {
        onTaskChange?.({ ...task, startDate: e.target.value });
      }
    }, [task, onTaskChange]);

    const handleEndDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.value) {
        onTaskChange?.({ ...task, endDate: e.target.value });
      }
    }, [task, onTaskChange]);

    const handleRowClickInternal = useCallback(() => {
      onRowClick?.(task.id);
    }, [task.id, onRowClick]);

    const startDate = parseUTCDate(task.startDate);
    const endDate = parseUTCDate(task.endDate);
    const startDateISO = toISODate(task.startDate);
    const endDateISO = toISODate(task.endDate);

    return (
      <div
        className={`gantt-tl-row ${isSelected ? 'gantt-tl-row-selected' : ''}`}
        style={{ minHeight: `${rowHeight}px` }}
        onClick={handleRowClickInternal}
      >
        {/* Number column (read-only) */}
        <div className="gantt-tl-cell gantt-tl-cell-number">
          {rowIndex + 1}
        </div>

        {/* Name column — overlay input on edit */}
        <div className="gantt-tl-cell gantt-tl-cell-name">
          {editingName && (
            <input
              ref={nameInputRef}
              type="text"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={handleNameSave}
              onKeyDown={handleNameKeyDown}
              className="gantt-tl-input-overlay"
              onClick={(e) => e.stopPropagation()}
            />
          )}
          <span
            className="gantt-tl-cellContent"
            onClick={handleNameClick}
          >
            {task.name}
          </span>
        </div>

        {/* Start Date — transparent datepicker overlay over display text */}
        <div className="gantt-tl-cell gantt-tl-cell-date" onClick={(e) => e.stopPropagation()}>
          <span className="gantt-tl-cellContent">{formatShortDate(startDate)}</span>
          <input
            type="date"
            value={startDateISO}
            onChange={handleStartDateChange}
            onClick={handleDateClick}
            className="gantt-tl-date-picker"
          />
        </div>

        {/* End Date — transparent datepicker overlay over display text */}
        <div className="gantt-tl-cell gantt-tl-cell-date" onClick={(e) => e.stopPropagation()}>
          <span className="gantt-tl-cellContent">{formatShortDate(endDate)}</span>
          <input
            type="date"
            value={endDateISO}
            onChange={handleEndDateChange}
            onClick={handleDateClick}
            className="gantt-tl-date-picker"
          />
        </div>
      </div>
    );
  }
);

TaskListRow.displayName = 'TaskListRow';
export default TaskListRow;
