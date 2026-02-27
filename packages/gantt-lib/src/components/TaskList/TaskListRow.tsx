'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Task } from '../GanttChart';
import { parseUTCDate, formatDateLabel } from '../../utils/dateUtils';

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

/**
 * Parse DD.MM.YY date format to Date object
 * Returns null if format is invalid
 */
const parseShortDate = (dateStr: string): Date | null => {
  const parts = dateStr.split('.');
  if (parts.length !== 3) return null;

  const [day, month, year] = parts;
  if (day.length !== 2 || month.length !== 2 || year.length !== 2) return null;

  const dayNum = parseInt(day, 10);
  const monthNum = parseInt(month, 10);
  const yearNum = parseInt(`20${year}`, 10); // Convert YY to 20YY

  if (isNaN(dayNum) || isNaN(monthNum) || isNaN(yearNum)) return null;
  if (dayNum < 1 || dayNum > 31) return null;
  if (monthNum < 1 || monthNum > 12) return null;

  return new Date(Date.UTC(yearNum, monthNum - 1, dayNum));
};

/**
 * Format Date to DD.MM.YY string
 */
const formatShortDate = (date: Date): string => {
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = String(date.getUTCFullYear()).slice(-2);
  return `${day}.${month}.${year}`;
};

/**
 * TaskListRow component - renders a single task row with inline editing
 *
 * Clicking editable cells (name, dates) switches to input mode.
 * Enter or blur saves changes, Escape cancels.
 */
export const TaskListRow: React.FC<TaskListRowProps> = React.memo(
  ({ task, rowIndex, rowHeight, onTaskChange, selectedTaskId, onRowClick }) => {
    const [editField, setEditField] = useState<null | 'name' | 'startDate' | 'endDate'>(null);
    const [editValue, setEditValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const isSelected = selectedTaskId === task.id;

    // Auto-focus input and select text when entering edit mode
    useEffect(() => {
      if (editField && inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, [editField]);

    // Handle cell click to enter edit mode
    const handleCellClick = useCallback((field: 'name' | 'startDate' | 'endDate') => {
      if (editField !== field) {
        setEditField(field);
        if (field === 'name') {
          setEditValue(task.name);
        } else if (field === 'startDate') {
          const sd = task.startDate instanceof Date
            ? task.startDate.toISOString().split('T')[0]
            : task.startDate;
          setEditValue(sd);
        } else if (field === 'endDate') {
          const ed = task.endDate instanceof Date
            ? task.endDate.toISOString().split('T')[0]
            : task.endDate;
          setEditValue(ed);
        }
      }
    }, [editField, task]);

    // Save changes and exit edit mode
    const handleSave = useCallback(() => {
      if (!editField) return;

      let updatedTask: Task | null = null;

      if (editField === 'name') {
        if (editValue.trim()) {
          updatedTask = { ...task, name: editValue.trim() };
        }
      } else if (editField === 'startDate' || editField === 'endDate') {
        // editValue is already ISO YYYY-MM-DD from input[type=date]
        if (editValue.trim()) {
          updatedTask = { ...task };
          if (editField === 'startDate') {
            updatedTask.startDate = editValue;
          } else {
            updatedTask.endDate = editValue;
          }
        } else {
          // Empty value - keep edit mode active
          return;
        }
      }

      if (updatedTask) {
        onTaskChange?.(updatedTask);
      }

      setEditField(null);
      setEditValue('');
    }, [editField, editValue, task, onTaskChange]);

    // Cancel edit and revert to original value
    const handleCancel = useCallback(() => {
      setEditField(null);
      setEditValue('');
    }, []);

    // Handle keyboard shortcuts
    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleSave();
      } else if (e.key === 'Escape') {
        handleCancel();
      }
    }, [handleSave, handleCancel]);

    // Handle row click (not edit fields)
    const handleRowClickInternal = useCallback(() => {
      onRowClick?.(task.id);
    }, [task.id, onRowClick]);

    const startDate = parseUTCDate(task.startDate);
    const endDate = parseUTCDate(task.endDate);

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

        {/* Name column (editable) */}
        <div className="gantt-tl-cell gantt-tl-cell-name">
          {editField === 'name' ? (
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              className="gantt-tl-input"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              className="gantt-tl-cellContent"
              onClick={(e) => {
                e.stopPropagation();
                handleCellClick('name');
              }}
            >
              {task.name}
            </span>
          )}
        </div>

        {/* Start Date column (editable) */}
        <div className="gantt-tl-cell gantt-tl-cell-date">
          {editField === 'startDate' ? (
            <input
              ref={inputRef}
              type="date"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              className="gantt-tl-input-date"
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          ) : (
            <span
              className="gantt-tl-cellContent"
              onClick={(e) => {
                e.stopPropagation();
                handleCellClick('startDate');
              }}
            >
              {formatShortDate(startDate)}
            </span>
          )}
        </div>

        {/* End Date column (editable) */}
        <div className="gantt-tl-cell gantt-tl-cell-date">
          {editField === 'endDate' ? (
            <input
              ref={inputRef}
              type="date"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              className="gantt-tl-input-date"
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          ) : (
            <span
              className="gantt-tl-cellContent"
              onClick={(e) => {
                e.stopPropagation();
                handleCellClick('endDate');
              }}
            >
              {formatShortDate(endDate)}
            </span>
          )}
        </div>
      </div>
    );
  }
);

TaskListRow.displayName = 'TaskListRow';

export default TaskListRow;
