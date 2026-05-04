'use client';

import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Task } from '../GanttChart';
import './TableMatrix.css';

export interface TableMatrixColumnGroup {
  id: string;
  header: React.ReactNode;
  width?: number;
  className?: string;
}

export interface TableMatrixColumn<TTask extends Task = Task> {
  id: string;
  header: React.ReactNode;
  width?: number | 'auto';
  minWidth?: number;
  maxWidth?: number;
  periodStartDate?: string | Date;
  periodEndDate?: string | Date;
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

export interface TableMatrixDateOverlay<TTask extends Task = Task> {
  date: string | Date;
  className?: string;
  color?: string;
  edgeColor?: string;
  shouldRender?: (context: {
    task: TTask;
    column: TableMatrixColumn<TTask>;
    rowIndex: number;
    columnIndex: number;
  }) => boolean;
}

export interface TableMatrixProps<TTask extends Task = Task> {
  tasks: TTask[];
  allTasks?: TTask[];
  columns: Array<TableMatrixColumn<TTask>>;
  columnGroups?: Array<TableMatrixColumnGroup>;
  rowHeight: number;
  headerHeight: number;
  bodyMinHeight?: number | string;
  selectedTaskId?: string | null;
  onTaskSelect?: (taskId: string | null) => void;
  onCellClick?: (context: TableMatrixCellClickContext<TTask>) => void;
  dateOverlay?: TableMatrixDateOverlay<TTask> | false;
  highlightedTaskIds?: Set<string>;
  filterMode?: 'highlight' | 'hide';
}

interface HeaderSpan {
  id: string;
  header: React.ReactNode;
  width?: number;
  columnSpan?: number;
  className?: string;
}

const AUTO_COLUMN_MIN_WIDTH = 72;
const AUTO_COLUMN_MAX_WIDTH = 180;
const DAY_MS = 24 * 60 * 60 * 1000;

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

function clampWidth(width: number, minWidth: number, maxWidth: number) {
  return Math.min(maxWidth, Math.max(minWidth, Math.ceil(width)));
}

function getAutoMinWidth<TTask extends Task>(column: TableMatrixColumn<TTask>) {
  return column.minWidth ?? AUTO_COLUMN_MIN_WIDTH;
}

function getAutoMaxWidth<TTask extends Task>(column: TableMatrixColumn<TTask>) {
  return column.maxWidth ?? AUTO_COLUMN_MAX_WIDTH;
}

function parseDateOnlyMs(value: string | Date): number {
  if (value instanceof Date) {
    return Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
  }

  const [year, month, day] = value.split('T')[0].split('-').map(Number);
  if (!year || !month || !day) {
    return Number.NaN;
  }

  return Date.UTC(year, month - 1, day);
}

function getOverlayWidthPercent<TTask extends Task>(
  column: TableMatrixColumn<TTask>,
  overlayDateMs: number | null
): number {
  if (overlayDateMs === null || column.periodStartDate === undefined || column.periodEndDate === undefined) {
    return 0;
  }

  const startMs = parseDateOnlyMs(column.periodStartDate);
  const endMs = parseDateOnlyMs(column.periodEndDate);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs || overlayDateMs < startMs) {
    return 0;
  }

  if (overlayDateMs >= endMs) {
    return 100;
  }

  const totalDays = Math.max(1, Math.round((endMs - startMs) / DAY_MS) + 1);
  const elapsedDays = Math.min(totalDays, Math.max(0, Math.round((overlayDateMs - startMs) / DAY_MS) + 1));
  return (elapsedDays / totalDays) * 100;
}

function isOverlayDateInColumn<TTask extends Task>(
  column: TableMatrixColumn<TTask>,
  overlayDateMs: number | null
): boolean {
  if (overlayDateMs === null || column.periodStartDate === undefined || column.periodEndDate === undefined) {
    return false;
  }

  const startMs = parseDateOnlyMs(column.periodStartDate);
  const endMs = parseDateOnlyMs(column.periodEndDate);
  return Number.isFinite(startMs) && Number.isFinite(endMs) && startMs <= overlayDateMs && overlayDateMs <= endMs;
}

export default function TableMatrix<TTask extends Task = Task>({
  tasks,
  allTasks = tasks,
  columns,
  columnGroups,
  rowHeight,
  headerHeight,
  bodyMinHeight,
  selectedTaskId,
  onTaskSelect,
  onCellClick,
  dateOverlay,
  highlightedTaskIds,
  filterMode = 'highlight',
}: TableMatrixProps<TTask>) {
  const measureRef = useRef<HTMLDivElement | null>(null);
  const [measuredAutoWidths, setMeasuredAutoWidths] = useState<Array<number | undefined>>([]);

  const hasAutoWidthColumns = useMemo(
    () => columns.some((column) => typeof column.width !== 'number'),
    [columns]
  );

  useLayoutEffect(() => {
    if (!hasAutoWidthColumns) {
      setMeasuredAutoWidths([]);
      return;
    }

    const measureRoot = measureRef.current;
    if (!measureRoot) return;

    const nextWidths = columns.map((column, columnIndex) => {
      if (typeof column.width === 'number') return undefined;

      const minWidth = getAutoMinWidth(column);
      const maxWidth = getAutoMaxWidth(column);
      const elements = measureRoot.querySelectorAll<HTMLElement>(`[data-gantt-mx-measure-column="${columnIndex}"]`);
      let measuredWidth = minWidth;

      elements.forEach((element) => {
        measuredWidth = Math.max(
          measuredWidth,
          element.getBoundingClientRect().width,
          element.scrollWidth
        );
      });

      return clampWidth(measuredWidth, minWidth, maxWidth);
    });

    setMeasuredAutoWidths((previousWidths) => {
      const changed = nextWidths.length !== previousWidths.length
        || nextWidths.some((width, index) => width !== previousWidths[index]);
      return changed ? nextWidths : previousWidths;
    });
  }, [columns, hasAutoWidthColumns, tasks]);

  const resolvedColumnWidths = useMemo(
    () => columns.map((column, index) => {
      if (typeof column.width === 'number') return column.width;

      const minWidth = getAutoMinWidth(column);
      const maxWidth = getAutoMaxWidth(column);
      return clampWidth(measuredAutoWidths[index] ?? minWidth, minWidth, maxWidth);
    }),
    [columns, measuredAutoWidths]
  );

  const gridTemplateColumns = useMemo(
    () => resolvedColumnWidths.map((width) => `${width}px`).join(' '),
    [resolvedColumnWidths]
  );

  const totalWidth = useMemo(
    () => resolvedColumnWidths.reduce((sum, width) => sum + width, 0),
    [resolvedColumnWidths]
  );
  const overlayDateMs = useMemo(
    () => dateOverlay ? parseDateOnlyMs(dateOverlay.date) : null,
    [dateOverlay]
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

    if (!hasAutoWidthColumns && columnGroups?.some((group) => typeof group.width === 'number')) {
      return columnGroups.map((group) => ({
        id: group.id,
        header: group.header,
        width: group.width ?? 0,
        className: group.className,
      }));
    }

    const spans: HeaderSpan[] = [];
    for (const column of columns) {
      const groupId = column.groupId ?? column.id;
      const lastSpan = spans[spans.length - 1];
      if (lastSpan?.id === groupId) {
        lastSpan.width = (lastSpan.width ?? 0) + resolvedColumnWidths[columns.indexOf(column)];
        lastSpan.columnSpan = (lastSpan.columnSpan ?? 1) + 1;
        continue;
      }

      const group = groupMap.get(groupId);
      spans.push({
        id: groupId,
        header: group?.header ?? column.header,
        width: resolvedColumnWidths[columns.indexOf(column)],
        columnSpan: 1,
        className: group?.className,
      });
    }

    return spans;
  }, [columns, columnGroups, groupMap, hasAutoWidthColumns, hasGroupHeader, resolvedColumnWidths]);

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
      {hasAutoWidthColumns && (
        <div ref={measureRef} className="gantt-mx-measure" aria-hidden="true">
          {columns.map((column, columnIndex) => (
            typeof column.width === 'number' ? null : (
              <div
                key={`header:${column.id}`}
                data-gantt-mx-measure-column={columnIndex}
                className="gantt-mx-measureCell gantt-mx-headerCell"
              >
                {column.header}
              </div>
            )
          ))}
          {tasks.map((task) => (
            columns.map((column, columnIndex) => (
              typeof column.width === 'number' ? null : (
                <div
                  key={`${task.id}:${column.id}`}
                  data-gantt-mx-measure-column={columnIndex}
                  className="gantt-mx-measureCell gantt-mx-cell"
                >
                  {column.renderCell(task)}
                </div>
              )
            ))
          ))}
        </div>
      )}
      <div className="gantt-mx-header" style={{ height: `${headerHeight}px` }}>
        {hasGroupHeader && (
          <div
            className="gantt-mx-headerRow gantt-mx-headerGroupRow"
            style={{
              gridTemplateColumns: hasAutoWidthColumns
                ? gridTemplateColumns
                : headerSpans.map((span) => `${span.width ?? 0}px`).join(' '),
              height: `${topRowHeight}px`,
            }}
          >
            {headerSpans.map((span) => (
              <div
                key={span.id}
                className={joinClasses('gantt-mx-groupCell', span.className)}
                style={hasAutoWidthColumns ? { gridColumn: `span ${span.columnSpan ?? 1}` } : undefined}
              >
                {span.header}
              </div>
            ))}
          </div>
        )}

        <div
          className="gantt-mx-headerRow"
          style={{ gridTemplateColumns, height: `${hasGroupHeader ? bottomRowHeight : topRowHeight}px` }}
        >
          {columns.map((column) => {
            const overlayWidthPercent = getOverlayWidthPercent(column, overlayDateMs);
            const shouldRenderOverlayEdge = isOverlayDateInColumn(column, overlayDateMs);

            return (
              <div
                key={column.id}
                className={joinClasses(
                  'gantt-mx-headerCell',
                  column.headerClassName
                )}
                style={column.minWidth !== undefined ? { minWidth: `${column.minWidth}px` } : undefined}
              >
                {shouldRenderOverlayEdge && (
                  <span
                    className="gantt-mx-dateOverlayEdge"
                    style={{
                      left: `${overlayWidthPercent}%`,
                      background: dateOverlay && dateOverlay.edgeColor ? dateOverlay.edgeColor : undefined,
                    }}
                  />
                )}
                <span className="gantt-mx-headerContent">{column.header}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div
        className="gantt-mx-body"
        style={{
          height: `${tasks.length * rowHeight}px`,
          minHeight: bodyMinHeight,
        }}
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
                width: `${totalWidth}px`,
              }}
              onClick={() => onTaskSelect?.(task.id)}
            >
              {columns.map((column, columnIndex) => {
                const resolvedCellClassName = typeof column.cellClassName === 'function'
                  ? column.cellClassName(task)
                  : column.cellClassName;
                const overlayWidthPercent = getOverlayWidthPercent(column, overlayDateMs);
                const shouldRenderOverlay = overlayWidthPercent > 0 && (
                  !dateOverlay
                  || !dateOverlay.shouldRender
                  || dateOverlay.shouldRender({ task, column, rowIndex: index, columnIndex })
                );
                const shouldRenderOverlayEdge = isOverlayDateInColumn(column, overlayDateMs);

                return (
                  <div
                    key={`${task.id}:${column.id}`}
                    className={joinClasses(
                      'gantt-mx-cell',
                      onCellClick && 'gantt-mx-cell-clickable',
                      `gantt-mx-cellAlign-${column.align ?? 'right'}`,
                      column.className,
                      resolvedCellClassName
                    )}
                    style={column.minWidth !== undefined ? { minWidth: `${column.minWidth}px` } : undefined}
                    onClick={(event) => {
                      onCellClick?.({ task, column, rowIndex: index, columnIndex, event });
                    }}
                  >
                    {shouldRenderOverlay && (
                      <span
                        className={joinClasses('gantt-mx-dateOverlay', dateOverlay && dateOverlay.className)}
                        style={{
                          width: `${overlayWidthPercent}%`,
                          background: dateOverlay && dateOverlay.color ? dateOverlay.color : undefined,
                        }}
                      />
                    )}
                    {shouldRenderOverlayEdge && (
                      <span
                        className="gantt-mx-dateOverlayEdge"
                        style={{
                          left: `${overlayWidthPercent}%`,
                          background: dateOverlay && dateOverlay.edgeColor ? dateOverlay.edgeColor : undefined,
                        }}
                      />
                    )}
                    <div className="gantt-mx-cellContent">
                      {column.renderCell(task)}
                    </div>
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
