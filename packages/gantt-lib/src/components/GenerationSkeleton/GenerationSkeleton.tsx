// FILE: packages/gantt-lib/src/components/GenerationSkeleton/GenerationSkeleton.tsx
// VERSION: 1.0.0
// START_MODULE_CONTRACT
//   PURPOSE: Render display-only placeholder rows that use the same task-list and timeline geometry as Gantt rows.
//   SCOPE: Bounded skeleton row count, task-list label placeholders, timeline bar placeholders anchored to a supplied timeline day, and reduced-motion-safe presentation.
//   DEPENDS: M-GANTT-CHART
//   LINKS: M-GANTT-CHART, V-M-GANTT-CHART
//   ROLE: RUNTIME
//   MAP_MODE: EXPORTS
// END_MODULE_CONTRACT

import React, { useRef } from 'react';

import './GenerationSkeleton.css';

export type GenerationSkeletonVariant = 'task-list' | 'chart';

export interface GenerationSkeletonTaskListLayout {
  nameLeft: number;
  nameWidth: number;
}

export interface GenerationSkeletonRowsProps {
  count: number;
  rowHeight: number;
  variant: GenerationSkeletonVariant;
  startIndex?: number;
  taskListLayout?: GenerationSkeletonTaskListLayout;
  chartDayWidth?: number;
  chartStartDayOffset?: number;
  chartStartJitterDays?: number;
}

const MAX_SKELETON_ROWS = 200;
const SHIMMER_DURATION_MS = 1450;

function stableRowJitter(rowIndex: number, maxDays: number): number {
  if (maxDays <= 0) return 0;
  const hash = Math.imul(rowIndex + 1, 2654435761) >>> 0;
  return hash % (maxDays + 1);
}

function clampCount(count: number): number {
  if (!Number.isFinite(count)) return 0;
  return Math.min(MAX_SKELETON_ROWS, Math.max(0, Math.floor(count)));
}

export const GenerationSkeletonRows: React.FC<GenerationSkeletonRowsProps> = ({
  count,
  rowHeight,
  variant,
  startIndex = 0,
  taskListLayout,
  chartDayWidth = 40,
  chartStartDayOffset = 0,
  chartStartJitterDays = 0,
}) => {
  const safeCount = clampCount(count);
  const previousCountRef = useRef<number | null>(null);
  const shimmerDelayRef = useRef('0ms');
  if (previousCountRef.current !== safeCount) {
    previousCountRef.current = safeCount;
    shimmerDelayRef.current = `-${Date.now() % SHIMMER_DURATION_MS}ms`;
  }
  if (safeCount === 0) return null;

  return (
    <div
      className={`gantt-generation-skeleton gantt-generation-skeleton-${variant}`}
      aria-hidden="true"
      style={{
        ...(taskListLayout ? {
          '--skeleton-name-left': `${taskListLayout.nameLeft}px`,
          '--skeleton-name-width': `${taskListLayout.nameWidth}px`,
        } : {}),
        '--skeleton-shimmer-delay': shimmerDelayRef.current,
      } as React.CSSProperties}
    >
      {Array.from({ length: safeCount }, (_, index) => {
        const rowIndex = startIndex + index;
        const parentShape = rowIndex % 4 === 0;
        const shortShape = rowIndex % 3 === 1;
        const mediumShape = rowIndex % 3 === 2;
        const chartBarDays = 5 + (rowIndex % 6);
        const chartStartJitter = variant === 'chart'
          ? stableRowJitter(rowIndex, Math.max(0, Math.floor(chartStartJitterDays)))
          : 0;
        const chartBarStyle = variant === 'chart'
          ? {
              width: `${chartBarDays * Math.max(1, chartDayWidth)}px`,
              marginLeft: `${Math.max(0, chartStartDayOffset - chartStartJitter) * Math.max(1, chartDayWidth)}px`,
            }
          : undefined;
        return (
          <div
            key={rowIndex}
            className="gantt-generation-skeleton-row"
            style={{ top: `${rowIndex * rowHeight}px`, height: `${rowHeight}px` }}
          >
            {variant === 'task-list' ? (
              <>
                <span className={`gantt-generation-skeleton-label ${shortShape ? 'gantt-generation-skeleton-label-short' : ''} ${mediumShape ? 'gantt-generation-skeleton-label-medium' : ''}`} />
              </>
            ) : (
              <span className={`gantt-generation-skeleton-bar ${parentShape ? 'gantt-generation-skeleton-bar-parent' : ''} ${shortShape ? 'gantt-generation-skeleton-bar-short' : ''}`} style={chartBarStyle} />
            )}
          </div>
        );
      })}
    </div>
  );
};

GenerationSkeletonRows.displayName = 'GenerationSkeletonRows';

export default GenerationSkeletonRows;
