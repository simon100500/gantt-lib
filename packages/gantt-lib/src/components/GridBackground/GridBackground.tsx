'use client';

import React, { useMemo } from 'react';
import { calculateGridLines, calculateWeekendBlocks, calculateWeekGridLines, calculateMonthGridLines } from '../../utils/geometry';
import type { GridLine } from '../../types';
import './GridBackground.css';

export interface GridBackgroundProps {
  /** Array of dates to display (from getMultiMonthDays) */
  dateRange: Date[];
  /** Width of each day column in pixels */
  dayWidth: number;
  /** Total height of the grid area in pixels */
  totalHeight: number;
  /** View mode: 'day' renders per-day lines with weekend blocks, 'week' renders per-week lines only, 'month' renders per-month lines only */
  viewMode?: 'day' | 'week' | 'month';
  /** Optional predicate for custom weekend logic (e.g., holidays, shift patterns) */
  isCustomWeekend?: (date: Date) => boolean;
  /** Optional extra class for layered rendering contexts. */
  className?: string;
  /** Whether to render weekend background blocks. */
  showWeekendBlocks?: boolean;
  /** Whether to render vertical grid lines. */
  showGridLines?: boolean;
  /** Visible horizontal pixel window in global timeline coordinates. Used to avoid offscreen grid DOM. */
  horizontalWindow?: { startPx: number; endPx: number };
}

/**
 * Custom comparison function for React.memo
 *
 * Performance optimization: Re-renders when dateRange length, dayWidth, totalHeight, or viewMode change.
 * Returns true (skip re-render) only when all four are unchanged.
 */
const arePropsEqual = (prevProps: GridBackgroundProps, nextProps: GridBackgroundProps) => {
  return (
    prevProps.dayWidth === nextProps.dayWidth &&
    prevProps.dateRange.length === nextProps.dateRange.length &&
    prevProps.totalHeight === nextProps.totalHeight && // skip re-render only when totalHeight unchanged
    prevProps.viewMode === nextProps.viewMode &&
    prevProps.isCustomWeekend === nextProps.isCustomWeekend &&
    prevProps.showWeekendBlocks === nextProps.showWeekendBlocks &&
    prevProps.showGridLines === nextProps.showGridLines &&
    prevProps.horizontalWindow?.startPx === nextProps.horizontalWindow?.startPx &&
    prevProps.horizontalWindow?.endPx === nextProps.horizontalWindow?.endPx
  );
};

/**
 * GridBackground component - renders vertical grid lines and weekend background highlighting
 *
 * This component provides the visual grid structure that runs behind task rows.
 * It separates grid rendering from task rendering for better performance and cleaner code.
 *
 * Features:
 * - Vertical grid lines at month/week/day boundaries
 * - Pink background highlighting for weekend days (day-view only)
 * - React.memo optimization for performance
 * - Pointer events disabled (clicks pass through to tasks)
 *
 * View modes:
 * - day (default): per-day grid lines + weekend background blocks
 * - week: per-week grid lines only (no weekend blocks, lines every 7 days)
 */
const GridBackground: React.FC<GridBackgroundProps> = React.memo(
  ({ dateRange, dayWidth, totalHeight, viewMode = 'day', isCustomWeekend, className, showWeekendBlocks = true, showGridLines = true, horizontalWindow }) => {
    // Week-view: grid lines at each 7-day boundary
    const weekGridLines = useMemo(() => {
      if (viewMode !== 'week') return [];
      return calculateWeekGridLines(dateRange, dayWidth);
    }, [dateRange, dayWidth, viewMode]);

    // Day-view: grid line positions per day (existing logic)
    const gridLines = useMemo<GridLine[]>(() => {
      if (viewMode === 'week' || viewMode === 'month') return [];
      return calculateGridLines(dateRange, dayWidth);
    }, [dateRange, dayWidth, viewMode]);
    const structuralGridLines = useMemo<GridLine[]>(() => {
      if (viewMode === 'week' || viewMode === 'month') return [];
      return gridLines.filter((line) => line.isMonthStart || line.isWeekStart);
    }, [gridLines, viewMode]);

    // Month-view: grid lines at each month/year boundary
    const monthGridLines = useMemo(() => {
      if (viewMode !== 'month') return [];
      return calculateMonthGridLines(dateRange, dayWidth);
    }, [dateRange, dayWidth, viewMode]);

    // Weekend background blocks: only in day-view (locked decision from RESEARCH.md)
    const weekendBlocks = useMemo(() => {
      if (viewMode === 'week' || viewMode === 'month') return []; // No weekend highlighting in week/month-view
      return calculateWeekendBlocks(dateRange, dayWidth, isCustomWeekend);
    }, [dateRange, dayWidth, viewMode, isCustomWeekend]);
    const isInHorizontalWindow = (left: number, width: number = 1) => (
      !horizontalWindow ||
      left <= horizontalWindow.endPx &&
      left + width >= horizontalWindow.startPx
    );
    const visibleWeekendBlocks = useMemo(
      () => weekendBlocks.filter((block) => isInHorizontalWindow(block.left, block.width)),
      [horizontalWindow, weekendBlocks]
    );
    const visibleWeekGridLines = useMemo(
      () => weekGridLines.filter((line) => isInHorizontalWindow(line.x)),
      [horizontalWindow, weekGridLines]
    );
    const visibleMonthGridLines = useMemo(
      () => monthGridLines.filter((line) => isInHorizontalWindow(line.x)),
      [horizontalWindow, monthGridLines]
    );
    const visibleStructuralGridLines = useMemo(
      () => structuralGridLines.filter((line) => isInHorizontalWindow(line.x)),
      [horizontalWindow, structuralGridLines]
    );

    // Calculate total grid width (formula must not change — Pitfall 3)
    const gridWidth = useMemo(() => {
      return Math.round(dateRange.length * dayWidth);
    }, [dateRange.length, dayWidth]);

    return (
      <div
        className={['gantt-gb-gridBackground', className].filter(Boolean).join(' ')}
        style={{
          width: `${gridWidth}px`,
          height: `${totalHeight}px`,
          ...(showGridLines && viewMode === 'day'
            ? {
              backgroundImage: `repeating-linear-gradient(to right, transparent 0, transparent ${Math.max(0, dayWidth - 1)}px, var(--gantt-day-line-color, #f3f4f6) ${Math.max(0, dayWidth - 1)}px, var(--gantt-day-line-color, #f3f4f6) ${dayWidth}px)`,
            }
            : null),
        }}
      >
        {/* Weekend backgrounds (rendered first, behind lines) — day-view only */}
        {showWeekendBlocks && visibleWeekendBlocks.map((block, index) => (
          <div
            key={`weekend-${index}`}
            className="gantt-gb-weekendBlock"
            style={{
              left: `${block.left}px`,
              width: `${block.width}px`,
            }}
          />
        ))}

        {/* Vertical grid lines */}
        {showGridLines && (viewMode === 'week' ? (
          // Week-view: one line per week column boundary
          visibleWeekGridLines.map((line, index) => {
            const lineClass = line.isMonthStart
              ? 'gantt-gb-monthSeparator'
              : 'gantt-gb-weekSeparator';
            return (
              <div
                key={`wgridline-${index}`}
                className={`gantt-gb-gridLine ${lineClass}`}
                style={{ left: `${line.x}px` }}
              />
            );
          })
        ) : viewMode === 'month' ? (
          // Month-view: thin line at each month boundary, thick at year boundary
          visibleMonthGridLines.map((line, index) => {
            const lineClass = line.isMonthStart
              ? 'gantt-gb-monthSeparator'
              : 'gantt-gb-weekSeparator';
            return (
              <div
                key={`mgridline-${index}`}
                className={`gantt-gb-gridLine ${lineClass}`}
                style={{ left: `${line.x}px` }}
              />
            );
          })
        ) : (
          // Day-view: day lines are painted by a CSS repeating-gradient; keep only major separators in DOM.
          visibleStructuralGridLines.map((line, index) => {
            const lineClass = line.isMonthStart
              ? 'gantt-gb-monthSeparator'
              : line.isWeekStart
                ? 'gantt-gb-weekSeparator'
                : 'gantt-gb-dayLine';
            return (
              <div
                key={`gridline-${index}`}
                className={`gantt-gb-gridLine ${lineClass}`}
                style={{
                  left: `${line.x}px`,
                }}
              />
            );
          })
        ))}
      </div>
    );
  },
  arePropsEqual
);

GridBackground.displayName = 'GridBackground';

export default GridBackground;
