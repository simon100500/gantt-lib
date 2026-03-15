'use client';

import React, { useMemo } from 'react';
import { calculateGridLines, calculateWeekendBlocks, calculateWeekGridLines } from '../../utils/geometry';
import type { GridLine } from '../../types';
import './GridBackground.css';

export interface GridBackgroundProps {
  /** Array of dates to display (from getMultiMonthDays) */
  dateRange: Date[];
  /** Width of each day column in pixels */
  dayWidth: number;
  /** Total height of the grid area in pixels */
  totalHeight: number;
  /** View mode: 'day' renders per-day lines with weekend blocks, 'week' renders per-week lines only */
  viewMode?: 'day' | 'week';
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
    prevProps.viewMode === nextProps.viewMode
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
  ({ dateRange, dayWidth, totalHeight, viewMode = 'day' }) => {
    // Week-view: grid lines at each 7-day boundary
    const weekGridLines = useMemo(() => {
      if (viewMode !== 'week') return [];
      return calculateWeekGridLines(dateRange, dayWidth);
    }, [dateRange, dayWidth, viewMode]);

    // Day-view: grid line positions per day (existing logic)
    const gridLines = useMemo<GridLine[]>(() => {
      if (viewMode === 'week') return [];
      return calculateGridLines(dateRange, dayWidth);
    }, [dateRange, dayWidth, viewMode]);

    // Weekend background blocks: only in day-view (locked decision from RESEARCH.md)
    const weekendBlocks = useMemo(() => {
      if (viewMode === 'week') return []; // No weekend highlighting in week-view
      return calculateWeekendBlocks(dateRange, dayWidth);
    }, [dateRange, dayWidth, viewMode]);

    // Calculate total grid width (formula must not change — Pitfall 3)
    const gridWidth = useMemo(() => {
      return Math.round(dateRange.length * dayWidth);
    }, [dateRange.length, dayWidth]);

    return (
      <div
        className="gantt-gb-gridBackground"
        style={{
          width: `${gridWidth}px`,
          height: `${totalHeight}px`,
        }}
      >
        {/* Weekend backgrounds (rendered first, behind lines) — day-view only */}
        {weekendBlocks.map((block, index) => (
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
        {viewMode === 'week' ? (
          // Week-view: one line per week column boundary
          weekGridLines.map((line, index) => {
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
        ) : (
          // Day-view: existing code (unchanged)
          gridLines.map((line, index) => {
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
        )}
      </div>
    );
  },
  arePropsEqual
);

GridBackground.displayName = 'GridBackground';

export default GridBackground;
