'use client';

import React, { useMemo } from 'react';
import type { Task } from '../GanttChart';
import './TableMatrix.css';

export interface TableMatrixColumnGroup {
  id: string;
  header: React.ReactNode;
  className?: string;
}

export interface TableMatrixColumn<TTask extends Task = Task> {
  id: string;
  header: React.ReactNode;
  width: number;
  groupId?: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
  headerClassName?: string;
  cellClassName?: string | ((task: TTask) => string | undefined);
  renderCell: (task: TTask) => React.ReactNode;
}

export interface TableMatrixCellClickContext<TTask extends Task = Task> {
  task: TTask;
  column: TableMatrixColumn<TTask>;
  rowIndex: number;
  columnIndex: number;
  event: React.MouseEvent<HTMLDivElement>;
}

export interface TableMatrixProps<TTask extends Task = Task> {
  tasks: TTask[];
  allTasks?: TTask[];
  columns: Array<TableMatrixColumn<TTask>>;
  columnGroups?: Array<TableMatrixColumnGroup>;
  rowHeight: number;
  headerHeight: number;
  selectedTaskId?: string | null;
  onTaskSelect?: (taskId: string | null) => void;
  onCellClick?: (context: TableMatrixCellClickContext<TTask>) => void;
  highlightedTaskIds?: Set<string>;
  filterMode?: 'highlight' | 'hide';
}

interface HeaderSpan {
  id: string;
  header: React.ReactNode;
  width: number;
  className?: string;
}

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

export default function TableMatrix<TTask extends Task = Task>({
  tasks,
  allTasks = tasks,
  columns,
  columnGroups,
  rowHeight,
  headerHeight,
  selectedTaskId,
  onTaskSelect,
  onCellClick,
  highlightedTaskIds,
  filterMode = 'highlight',
}: TableMatrixProps<TTask>) {
  const gridTemplateColumns = useMemo(
    () => columns.map((column) => `${column.width}px`).join(' '),
    [columns]
  );

  const totalWidth = useMemo(
    () => columns.reduce((sum, column) => sum + column.width, 0),
    [columns]
  );

  const hasGroupHeader = useMemo(
    () => columns.some((column) => !!column.groupId) || (columnGroups?.length ?? 0) > 0,
    [columnGroups, columns]
  );

  const groupMap = useMemo(
    () => new Map((columnGroups ?? []).map((group) => [group.id, group])),
    [columnGroups]
  );

  const headerSpans = useMemo<HeaderSpan[]>(() => {
    if (!hasGroupHeader) return [];

    const spans: HeaderSpan[] = [];
    for (const column of columns) {
      const groupId = column.groupId ?? column.id;
      const lastSpan = spans[spans.length - 1];
      if (lastSpan?.id === groupId) {
        lastSpan.width += column.width;
        continue;
      }

      const group = groupMap.get(groupId);
      spans.push({
        id: groupId,
        header: group?.header ?? column.header,
        width: column.width,
        className: group?.className,
      });
    }

    return spans;
  }, [columns, groupMap, hasGroupHeader]);

  const headerContentHeight = Math.max(0, headerHeight - 1);
  const topRowHeight = hasGroupHeader
    ? Math.ceil(headerContentHeight / 2)
    : headerContentHeight;
  const bottomRowHeight = hasGroupHeader
    ? Math.floor(headerContentHeight / 2)
    : 0;
  const parentTaskIds = useMemo(() => {
    const ids = new Set<string>();
    for (const task of allTasks) {
      if (task.parentId) {
        ids.add(task.parentId);
      }
    }
    return ids;
  }, [allTasks]);

  const nestingDepthMap = useMemo(() => {
    const depthMap = new Map<string, number>();
    const taskById = new Map(allTasks.map((task) => [task.id, task]));

    const getDepth = (taskId: string, seen = new Set<string>()): number => {
      if (depthMap.has(taskId)) return depthMap.get(taskId)!;
      if (seen.has(taskId)) return 0;

      const task = taskById.get(taskId);
      if (!task?.parentId || !taskById.has(task.parentId)) {
        depthMap.set(taskId, 0);
        return 0;
      }

      seen.add(taskId);
      const depth = getDepth(task.parentId, seen) + 1;
      depthMap.set(taskId, depth);
      return depth;
    };

    for (const task of allTasks) {
      getDepth(task.id);
    }

    return depthMap;
  }, [allTasks]);

  return (
    <div className="gantt-mx-root" style={{ width: `${totalWidth}px` }}>
      <div className="gantt-mx-header" style={{ height: `${headerHeight}px` }}>
        {hasGroupHeader && (
          <div
            className="gantt-mx-headerRow gantt-mx-headerGroupRow"
            style={{ gridTemplateColumns: headerSpans.map((span) => `${span.width}px`).join(' '), height: `${topRowHeight}px` }}
          >
            {headerSpans.map((span) => (
              <div key={span.id} className={joinClasses('gantt-mx-groupCell', span.className)}>
                {span.header}
              </div>
            ))}
          </div>
        )}

        <div
          className="gantt-mx-headerRow"
          style={{ gridTemplateColumns, height: `${hasGroupHeader ? bottomRowHeight : topRowHeight}px` }}
        >
          {columns.map((column) => (
            <div key={column.id} className={joinClasses('gantt-mx-headerCell', column.headerClassName)}>
              {column.header}
            </div>
          ))}
        </div>
      </div>

      <div
        className="gantt-mx-body"
        style={{ height: `${tasks.length * rowHeight}px` }}
      >
        {tasks.map((task, index) => {
          const isHighlighted = filterMode === 'highlight' && !!highlightedTaskIds?.has(task.id);
          const isParent = parentTaskIds.has(task.id);
          const nestingDepth = nestingDepthMap.get(task.id) ?? 0;
          const rowFillLevel = Math.min(nestingDepth, 2);
          const isTotal = Boolean((task as Task & { isTotal?: boolean }).isTotal);
          return (
            <div
              key={task.id}
              data-gantt-task-row-id={task.id}
              className={joinClasses(
                'gantt-mx-row',
                task.parentId && 'gantt-mx-row-child',
                isParent && 'gantt-mx-row-parent',
                `gantt-mx-row-level-${rowFillLevel}`,
                isTotal && 'gantt-mx-row-total',
                selectedTaskId === task.id && 'gantt-mx-row-selected',
                isHighlighted && 'gantt-mx-row-highlighted'
              )}
              style={{
                gridTemplateColumns,
                top: `${index * rowHeight}px`,
                height: `${rowHeight}px`,
              }}
              onClick={() => onTaskSelect?.(task.id)}
            >
              {columns.map((column, columnIndex) => {
                const resolvedCellClassName = typeof column.cellClassName === 'function'
                  ? column.cellClassName(task)
                  : column.cellClassName;

                return (
                  <div
                    key={`${task.id}:${column.id}`}
                    className={joinClasses(
                      'gantt-mx-cell',
                      `gantt-mx-cellAlign-${column.align ?? 'right'}`,
                      column.className,
                      resolvedCellClassName
                    )}
                    onClick={(event) => {
                      onCellClick?.({ task, column, rowIndex: index, columnIndex, event });
                    }}
                  >
                    {column.renderCell(task)}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
