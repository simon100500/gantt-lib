'use client';

import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { getMonthSpans, getWeekSpans, getWeekBlocks, getMonthBlocks, getYearSpans, type WeekBlock, type WeekSpan, type MonthBlock, type YearSpan } from '../../utils/dateUtils';
import type { MonthSpan } from '../../types';
import './TimeScaleHeader.css';

export interface TimeScaleHeaderProps {
  /** Array of dates to display (from getMultiMonthDays) */
  days: Date[];
  /** Width of each day column in pixels */
  dayWidth: number;
  /** Height of the header row in pixels */
  headerHeight: number;
  /** View mode: 'day' renders individual day columns, 'week' renders 7-day week columns, 'month' renders one column per month */
  viewMode?: 'day' | 'week' | 'month';
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

  // Month-view: one block per calendar month (row 2 columns)
  const monthBlocks = useMemo(
    () => (viewMode === 'month' ? getMonthBlocks(days) : []),
    [days, viewMode]
  );

  // Month-view: year spans over month blocks (row 1 labels)
  const yearSpans = useMemo(
    () => (viewMode === 'month' ? getYearSpans(days) : []),
    [days, viewMode]
  );

  // Month-view: grid template for row 2 (variable column widths = days * dayWidth)
  const monthGridTemplate = useMemo(
    () => monthBlocks.map(b => `${b.days * dayWidth}px`).join(' '),
    [monthBlocks, dayWidth]
  );

  // Separator positions — same Math.round formula as GridBackground to guarantee pixel alignment
  const separators = useMemo(() => {
    const result: Array<{ x: number; isThick: boolean }> = [];
    if (viewMode === 'day') {
      for (let i = 1; i < days.length; i++) {
        if (days[i].getUTCDate() === 1) {
          result.push({ x: Math.round(i * dayWidth), isThick: true });
        }
      }
    } else if (viewMode === 'week') {
      let dayIndex = 0;
      for (let i = 0; i < weekBlocks.length; i++) {
        if (i > 0) {
          const isMonth = weekBlocks[i - 1].startDate.getUTCMonth() !== weekBlocks[i].startDate.getUTCMonth();
          result.push({ x: Math.round(dayIndex * dayWidth), isThick: isMonth });
        }
        dayIndex += weekBlocks[i].days;
      }
    } else if (viewMode === 'month') {
      let dayIndex = 0;
      for (let i = 0; i < monthBlocks.length; i++) {
        if (i > 0) {
          result.push({ x: Math.round(dayIndex * dayWidth), isThick: monthBlocks[i].startDate.getUTCMonth() === 0 });
        }
        dayIndex += monthBlocks[i].days;
      }
    }
    return result;
  }, [days, weekBlocks, monthBlocks, dayWidth, viewMode]);

  return (
    <div
      className="gantt-tsh-header"
      style={{ height: `${headerHeight}px`, position: 'relative' }}
    >
      {/* Separator lines — pixel-aligned with GridBackground */}
      {separators.map((sep, i) => (
        <div
          key={`sep-${i}`}
          className={`gantt-tsh-separator${sep.isThick ? ' gantt-tsh-separator--thick' : ''}`}
          style={{ left: `${sep.x}px` }}
        />
      ))}

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
        ) : viewMode === 'month' ? (
          // Month-view row 1: year labels spanning all months of that year
          yearSpans.map((span: YearSpan, index: number) => (
            <div
              key={`year-${index}`}
              className="gantt-tsh-monthCell"
              style={{ width: `${span.days * dayWidth}px` }}
            >
              {span.year.getUTCFullYear().toString()}
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
            : viewMode === 'month'
              ? monthGridTemplate
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
                className="gantt-tsh-dayCell gantt-tsh-weekCell"
              >
                <span className="gantt-tsh-dayLabel">
                  {showDate ? String(block.startDate.getUTCDate()).padStart(2, '0') : ''}
                </span>
              </div>
            );
          })
        ) : viewMode === 'month' ? (
          // Month-view row 2: one column per month, shows abbreviated month name
          monthBlocks.map((block: MonthBlock, index: number) => {
            const MIN_DAYS_TO_SHOW_LABEL = 15;
            const showLabel = block.days >= MIN_DAYS_TO_SHOW_LABEL;
            const isYearBoundary = index > 0 && block.startDate.getUTCMonth() === 0;
            return (
              <div
                key={`mblock-${index}`}
                className="gantt-tsh-dayCell gantt-tsh-weekCell"
              >
                <span className="gantt-tsh-dayLabel">
                  {showLabel
                    ? (() => { const s = block.startDate.toLocaleString('ru-RU', { month: 'long', timeZone: 'UTC' }); return s.charAt(0).toUpperCase() + s.slice(1); })()
                    : ''}
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
              <div key={`day-${index}`} className={`gantt-tsh-dayCell ${isWeekend ? 'gantt-tsh-weekendDay' : ''} ${isTodayDate ? 'gantt-tsh-today' : ''}`}>
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
