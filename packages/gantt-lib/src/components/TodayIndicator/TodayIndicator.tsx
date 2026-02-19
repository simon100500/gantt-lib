'use client';

import React, { useMemo } from 'react';
import { getDayOffset, isToday } from '../../utils/dateUtils';
import './TodayIndicator.css';

export interface TodayIndicatorProps {
  /** Start of the month for positioning calculations */
  monthStart: Date;
  /** Width of each day column in pixels */
  dayWidth: number;
}

/**
 * TodayIndicator component - displays a vertical line at the current date
 *
 * Only renders when the current date is within the visible month range.
 * Satisfies REND-04 requirement for visual today indicator.
 */
const TodayIndicator: React.FC<TodayIndicatorProps> = ({ monthStart, dayWidth }) => {
  // Use local date for "today" (not UTC) - user's current date matters
  const today = new Date();
  const todayLocal = new Date(Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  ));

  // Check if today is within the current month (UTC comparison with local today)
  const isInMonth = useMemo(() => {
    return (
      todayLocal.getUTCFullYear() === monthStart.getUTCFullYear() &&
      todayLocal.getUTCMonth() === monthStart.getUTCMonth()
    );
  }, [monthStart, todayLocal]);

  // Calculate position if today is in the month
  const position = useMemo(() => {
    if (!isInMonth) return null;

    const offset = getDayOffset(todayLocal, monthStart);
    return Math.round(offset * dayWidth);
  }, [isInMonth, monthStart, dayWidth, todayLocal]);

  if (!isInMonth || position === null) {
    return null;
  }

  return (
    <div
      className="gantt-ti-indicator"
      style={{
        left: `${position}px`,
        width: 'var(--gantt-today-indicator-width)',
        backgroundColor: 'var(--gantt-today-indicator-color)',
      }}
      aria-label="Today"
    />
  );
};

export default TodayIndicator;
