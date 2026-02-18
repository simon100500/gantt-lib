'use client';

import React from 'react';
import { format } from 'date-fns';
import styles from './TimeScaleHeader.module.css';

export interface TimeScaleHeaderProps {
  /** Array of dates to display in the header */
  days: Date[];
  /** Width of each day column in pixels */
  dayWidth: number;
  /** Height of the header row in pixels */
  headerHeight: number;
}

/**
 * TimeScaleHeader component - displays date headers for the Gantt chart
 *
 * Shows day labels (e.g., "Mon 1", "Tue 2") across the top of the chart.
 */
const TimeScaleHeader: React.FC<TimeScaleHeaderProps> = ({
  days,
  dayWidth,
  headerHeight,
}) => {
  return (
    <div
      className={styles.header}
      style={{
        height: `${headerHeight}px`,
        display: 'grid',
        gridTemplateColumns: `repeat(${days.length}, ${dayWidth}px)`,
      }}
    >
      {days.map((day, index) => (
        <div
          key={index}
          className={styles.dayCell}
          style={{ width: `${dayWidth}px` }}
        >
          <span className={styles.dayLabel}>{format(day, 'EEE d')}</span>
        </div>
      ))}
    </div>
  );
};

export default TimeScaleHeader;
