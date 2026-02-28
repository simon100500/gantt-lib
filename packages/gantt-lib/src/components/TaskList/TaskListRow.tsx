'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Task } from '../GanttChart';
import { parseUTCDate } from '../../utils/dateUtils';
import { Input } from '../ui/Input';
import { DatePicker } from '../ui/DatePicker';

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
          <span
            className="gantt-tl-cellContent"
            onClick={handleNameClick}
          >
            {task.name}
          </span>
        </div>

        {/* Start Date — DatePicker component */}
        <div className="gantt-tl-cell gantt-tl-cell-date" onClick={(e) => e.stopPropagation()}>
          <DatePicker
            value={startDateISO}
            onChange={handleStartDateChange}
            format="dd.MM.yy"
            portal={true}
          />
        </div>

        {/* End Date — DatePicker component */}
        <div className="gantt-tl-cell gantt-tl-cell-date" onClick={(e) => e.stopPropagation()}>
          <DatePicker
            value={endDateISO}
            onChange={handleEndDateChange}
            format="dd.MM.yy"
            portal={true}
          />
        </div>
      </div>
    );
  }
);

TaskListRow.displayName = 'TaskListRow';
export default TaskListRow;
