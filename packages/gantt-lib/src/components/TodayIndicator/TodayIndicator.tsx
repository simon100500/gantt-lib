'use client';

import React, { useMemo } from 'react';
import { getDayOffset } from '../../utils/dateUtils';
import './TodayIndicator.css';

export interface TodayIndicatorProps {
  /** Start of the month for positioning calculations */
  monthStart: Date;
  /** Width of each day column in pixels */
  dayWidth: number;
  /** Optional hover callback used to show a shared sticky tooltip */
  onHover?: (payload: { label: string; left: number; color: string }) => void;
  /** Called when hover/focus leaves the indicator */
  onHoverEnd?: () => void;
}

/**
 * TodayIndicator component - displays a vertical line at the current date
 *
 * Only renders when the current date is within the visible month range.
 * Satisfies REND-04 requirement for visual today indicator.
 */
const TodayIndicator: React.FC<TodayIndicatorProps> = ({ monthStart, dayWidth, onHover, onHoverEnd }) => {
  // Use local date for "today" (not UTC) - user's current date matters
  const today = new Date();
  const todayLocal = new Date(Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  ));

  // Calculate position based on offset from monthStart
  // The parent GanttChart component handles the date range check via todayInRange
  const position = useMemo(() => {
    const offset = getDayOffset(todayLocal, monthStart);
    return Math.round(offset * dayWidth);
  }, [monthStart, dayWidth, todayLocal]);
  const todayLabel = `${String(todayLocal.getUTCDate()).padStart(2, '0')}.${String(todayLocal.getUTCMonth() + 1).padStart(2, '0')}.${String(todayLocal.getUTCFullYear()).slice(-2)} — Сегодня`;

  // Allow negative positions (today before monthStart) - parent handles visibility
  if (isNaN(position)) {
    return null;
  }

  return (
    <div
      className="gantt-ti-indicator"
      style={{
        left: `${position}px`,
        backgroundColor: 'var(--gantt-today-indicator-color)',
      }}
      aria-label="Today"
    >
      <div
        className="gantt-ti-hitArea"
        onMouseEnter={() => onHover?.({ label: todayLabel, left: position, color: '#dc2626' })}
        onMouseLeave={onHoverEnd}
      />
    </div>
  );
};

export default TodayIndicator;
