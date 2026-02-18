'use client';

import React from 'react';
import { format } from 'date-fns';
import styles from './DragTooltip.module.css';

export interface DragTooltipProps {
  /** X coordinate for tooltip position */
  x: number;
  /** Y coordinate for tooltip position */
  y: number;
  /** Start date to display */
  startDate: Date;
  /** End date to display */
  endDate: Date;
  /** Locale for date formatting (default: 'en-US') */
  locale?: string;
}

/**
 * DragTooltip component - displays formatted dates during drag operations
 *
 * Uses fixed positioning to follow cursor during drag operations.
 * Shows start date, arrow, and end date in vertical layout.
 *
 * @example
 * ```tsx
 * <DragTooltip
 *   x={100}
 *   y={200}
 *   startDate={new Date('2026-02-15')}
 *   endDate={new Date('2026-02-20')}
 * />
 * ```
 */
export const DragTooltip: React.FC<DragTooltipProps> = ({
  x,
  y,
  startDate,
  endDate,
  locale = 'en-US',
}) => {
  // Format dates as 'd MMMM' (e.g., "15 February" or "February 15")
  // Using locale-aware formatting
  const formatDateString = (date: Date): string => {
    try {
      return format(date, 'd MMMM', { locale: locale === 'en-US' ? undefined : (require('date-fns/locale')[locale] || undefined) });
    } catch {
      // Fallback to default locale if specific locale not available
      return format(date, 'd MMMM');
    }
  };

  const startDateStr = formatDateString(startDate);
  const endDateStr = formatDateString(endDate);

  return (
    <div
      className={styles.tooltip}
      style={{
        left: `${x + 16}px`,
        top: `${y + 16}px`,
      }}
    >
      <div className={styles.dateRow}>{startDateStr}</div>
      <div className={styles.arrow}>↓</div>
      <div className={styles.dateRow}>{endDateStr}</div>
    </div>
  );
};

export default DragTooltip;
