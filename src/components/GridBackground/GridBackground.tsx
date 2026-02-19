'use client';

import React, { useMemo } from 'react';
import { calculateGridLines, calculateWeekendBlocks } from '../../utils/geometry';
import type { GridLine } from '../../types';
import styles from './GridBackground.module.css';

export interface GridBackgroundProps {
  /** Array of dates to display (from getMultiMonthDays) */
  dateRange: Date[];
  /** Width of each day column in pixels */
  dayWidth: number;
  /** Total height of the grid area in pixels */
  totalHeight: number;
}

/**
 * Custom comparison function for React.memo
 *
 * Performance optimization: Only re-renders if dateRange or dayWidth change.
 * totalHeight is excluded because it only affects container height, not grid calculations.
 */
const arePropsEqual = (prevProps: GridBackgroundProps, nextProps: GridBackgroundProps) => {
  return (
    prevProps.dayWidth === nextProps.dayWidth &&
    prevProps.dateRange.length === nextProps.dateRange.length &&
    prevProps.totalHeight !== nextProps.totalHeight // totalHeight changes still trigger update
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
 * - Pink background highlighting for weekend days
 * - React.memo optimization for performance
 * - Pointer events disabled (clicks pass through to tasks)
 */
const GridBackground: React.FC<GridBackgroundProps> = React.memo(
  ({ dateRange, dayWidth, totalHeight }) => {
    // Calculate grid line positions
    const gridLines = useMemo<GridLine[]>(() => {
      return calculateGridLines(dateRange, dayWidth);
    }, [dateRange, dayWidth]);

    // Calculate weekend background blocks
    const weekendBlocks = useMemo(() => {
      return calculateWeekendBlocks(dateRange, dayWidth);
    }, [dateRange, dayWidth]);

    // Calculate total grid width
    const gridWidth = useMemo(() => {
      return Math.round(dateRange.length * dayWidth);
    }, [dateRange.length, dayWidth]);

    return (
      <div
        className={styles.gridBackground}
        style={{
          width: `${gridWidth}px`,
          height: `${totalHeight}px`,
        }}
      >
        {/* Weekend backgrounds (rendered first, behind lines) */}
        {weekendBlocks.map((block, index) => (
          <div
            key={`weekend-${index}`}
            className={styles.weekendBlock}
            style={{
              left: `${block.left}px`,
              width: `${block.width}px`,
            }}
          />
        ))}

        {/* Vertical grid lines */}
        {gridLines.map((line, index) => {
          // Determine line type class based on flags
          const lineClass = line.isMonthStart
            ? styles.monthSeparator
            : line.isWeekStart
              ? styles.weekSeparator
              : styles.dayLine;

          return (
            <div
              key={`gridline-${index}`}
              className={`${styles.gridLine} ${lineClass}`}
              style={{
                left: `${line.x}px`,
              }}
            />
          );
        })}
      </div>
    );
  },
  arePropsEqual
);

GridBackground.displayName = 'GridBackground';

export default GridBackground;
