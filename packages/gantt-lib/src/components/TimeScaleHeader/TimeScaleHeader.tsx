'use client';

import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { getMonthSpans, getWeekSpans, getWeekBlocks, type WeekBlock, type WeekSpan } from '../../utils/dateUtils';
import type { MonthSpan } from '../../types';
import './TimeScaleHeader.css';

export interface TimeScaleHeaderProps {
  /** Array of dates to display (from getMultiMonthDays) */
  days: Date[];
  /** Width of each day column in pixels */
  dayWidth: number;
  /** Height of the header row in pixels */
  headerHeight: number;
  /** View mode: 'day' renders individual day columns, 'week' renders 7-day week columns */
  viewMode?: 'day' | 'week';
}

/**
 * TimeScaleHeader component - displays two-row date headers for the Gantt chart
 *
 * Top row: Month names (Russian, left-aligned) spanning multiple day/week columns
 * Bottom row: Day numbers (centered) in individual day columns OR week start day numbers
 *
 * Supports two view modes:
 * - day (default): each column = 1 day, shows month names + individual day numbers
 * - week: each column = 7 days, shows month names spanning week columns + week-start dates
 */
const TimeScaleHeader: React.FC<TimeScaleHeaderProps> = ({
  days,
  dayWidth,
  headerHeight,
  viewMode = 'day',
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

  // Week-view: blocks with variable width (split on month boundaries)
  const weekBlocks = useMemo(
    () => (viewMode === 'week' ? getWeekBlocks(days) : []),
    [days, viewMode]
  );

  // Week-view: month spans grouped over week-blocks (row 1 labels)
  const weekSpans = useMemo(
    () => (viewMode === 'week' ? getWeekSpans(days) : []),
    [days, viewMode]
  );

  // Calculate column widths for each block (for grid template)
  const weekColumnWidths = useMemo(
    () => weekBlocks.map(b => b.days * dayWidth),
    [weekBlocks, dayWidth]
  );

  // Calculate total width for grid template
  const weekGridTemplate = useMemo(
    () => weekColumnWidths.map(w => `${w}px`).join(' '),
    [weekColumnWidths]
  );

  return (
    <div
      className="gantt-tsh-header"
      style={{ height: `${headerHeight}px` }}
    >
      {/* Month row - top */}
      <div
        className="gantt-tsh-monthRow"
        style={{ height: `${rowHeight}px` }}
      >
        {viewMode === 'week' ? (
          // Week-view row 1: month names spanning week blocks
          weekSpans.map((span: WeekSpan, index: number) => (
            <div
              key={`wmonth-${index}`}
              className="gantt-tsh-monthCell"
              style={{ width: `${span.days * dayWidth}px` }}
            >
              {format(span.month, 'LLLL yyyy', { locale: ru }).replace(/^./, (c) => c.toUpperCase())}
            </div>
          ))
        ) : (
          // Day-view row 1: month names spanning day columns (existing code)
          monthSpans.map((span: MonthSpan, index: number) => (
            <div
              key={`month-${index}`}
              className="gantt-tsh-monthCell"
              style={{ width: `${span.days * dayWidth}px` }}
            >
              {format(span.month, 'LLLL yyyy', { locale: ru }).replace(/^./, (c) => c.toUpperCase())}
            </div>
          ))
        )}
      </div>

      {/* Day/Week row - bottom */}
      <div
        className="gantt-tsh-dayRow"
        style={{
          height: `${rowHeight}px`,
          gridTemplateColumns: viewMode === 'week'
            ? weekGridTemplate
            : dayGridTemplate,
        }}
      >
        {viewMode === 'week' ? (
          // Week-view row 2: week block start day numbers (variable width)
          weekBlocks.map((block, index) => {
            const prevBlock = weekBlocks[index - 1];
            const isMonthBoundary =
              index > 0 && prevBlock &&
              prevBlock.startDate.getUTCMonth() !== block.startDate.getUTCMonth();
            // Show date only for full weeks (7 days)
            const showDate = block.days === 7;
            return (
              <div
                key={`week-${index}`}
                className={`gantt-tsh-dayCell gantt-tsh-weekCell${isMonthBoundary ? ' gantt-tsh-monthBoundary' : ''}`}
              >
                <span className="gantt-tsh-dayLabel">
                  {showDate ? String(block.startDate.getUTCDate()).padStart(2, '0') : ''}
                </span>
              </div>
            );
          })
        ) : (
          // Day-view row 2: individual day numbers (existing code)
          days.map((day, index) => {
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
            const prevDay = days[index - 1];
            const isMonthBoundary = index > 0 && prevDay && prevDay.getMonth() !== day.getMonth();
            // Use local date comparison for "today" (user's current date)
            const now = new Date();
            const isTodayDate =
              day.getUTCFullYear() === now.getFullYear() &&
              day.getUTCMonth() === now.getMonth() &&
              day.getUTCDate() === now.getDate();
            return (
              <div key={`day-${index}`} className={`gantt-tsh-dayCell ${isWeekend ? 'gantt-tsh-weekendDay' : ''} ${isMonthBoundary ? 'gantt-tsh-monthBoundary' : ''} ${isTodayDate ? 'gantt-tsh-today' : ''}`}>
                <span className="gantt-tsh-dayLabel">{format(day, 'd')}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TimeScaleHeader;
