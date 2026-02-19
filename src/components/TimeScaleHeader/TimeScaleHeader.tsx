'use client';

import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { getMonthSpans } from '../../utils/dateUtils';
import type { MonthSpan } from '../../types';
import styles from './TimeScaleHeader.module.css';

export interface TimeScaleHeaderProps {
  /** Array of dates to display (from getMultiMonthDays) */
  days: Date[];
  /** Width of each day column in pixels */
  dayWidth: number;
  /** Height of the header row in pixels */
  headerHeight: number;
}

/**
 * TimeScaleHeader component - displays two-row date headers for the Gantt chart
 *
 * Top row: Month names (Russian, left-aligned) spanning multiple day columns
 * Bottom row: Day numbers (centered) in individual columns
 */
const TimeScaleHeader: React.FC<TimeScaleHeaderProps> = ({
  days,
  dayWidth,
  headerHeight,
}) => {
  // Calculate month spans using the utility from dateUtils
  const monthSpans = useMemo(() => getMonthSpans(days), [days]);

  // Split header height evenly between two rows
  const rowHeight = headerHeight / 2;

  // Calculate grid template for day row
  const dayGridTemplate = useMemo(
    () => `repeat(${days.length}, ${dayWidth}px)`,
    [days.length, dayWidth]
  );

  return (
    <div
      className={styles.header}
      style={{ height: `${headerHeight}px` }}
    >
      {/* Month row - top */}
      <div
        className={styles.monthRow}
        style={{ height: `${rowHeight}px` }}
      >
        {monthSpans.map((span: MonthSpan, index: number) => (
          <div
            key={`month-${index}`}
            className={styles.monthCell}
            style={{ width: `${span.days * dayWidth}px` }}
          >
            {format(span.month, 'LLLL yyyy', { locale: ru }).replace(/^./, (c) => c.toUpperCase())}
          </div>
        ))}
      </div>

      {/* Day row - bottom */}
      <div
        className={styles.dayRow}
        style={{
          height: `${rowHeight}px`,
          gridTemplateColumns: dayGridTemplate,
        }}
      >
        {days.map((day, index) => (
          <div key={`day-${index}`} className={styles.dayCell}>
            <span className={styles.dayLabel}>{format(day, 'd')}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TimeScaleHeader;
