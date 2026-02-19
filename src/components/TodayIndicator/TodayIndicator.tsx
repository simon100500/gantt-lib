'use client';

import React, { useMemo } from 'react';
import { getDayOffset, isToday } from '../../utils/dateUtils';
import styles from './TodayIndicator.module.css';

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
  const now = new Date();

  // Check if today is within the current month
  const isInMonth = useMemo(() => {
    const todayUTC = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate()
    ));
    const monthYear = monthStart.getUTCFullYear();
    const monthMonth = monthStart.getUTCMonth();
    return (
      todayUTC.getUTCFullYear() === monthYear &&
      todayUTC.getUTCMonth() === monthMonth
    );
  }, [monthStart, now]);

  // Calculate position if today is in the month
  const position = useMemo(() => {
    if (!isInMonth) return null;

    const todayUTC = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate()
    ));

    const offset = getDayOffset(todayUTC, monthStart);
    return Math.round(offset * dayWidth);
  }, [isInMonth, monthStart, dayWidth, now]);

  if (!isInMonth || position === null) {
    return null;
  }

  return (
    <div
      className={styles.indicator}
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
