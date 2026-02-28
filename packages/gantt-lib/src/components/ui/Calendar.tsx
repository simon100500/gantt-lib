'use client';

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import {
  startOfMonth,
  getDaysInMonth,
  format,
  addMonths,
  subMonths,
  isSameDay,
  getDay,
  isToday,
  isWeekend,
} from 'date-fns';

export interface CalendarProps {
  selected?: Date;
  onSelect?: (date: Date) => void;
  initialDate?: Date;
  mode?: 'single' | 'range';
  disabled?: boolean;
}

function getDayClassName(day: Date, selected: Date | undefined): string {
  const classes: string[] = ['gantt-day-btn'];

  if (selected && isSameDay(day, selected)) classes.push('selected');
  if (isToday(day)) classes.push('today');
  if (isWeekend(day)) classes.push('weekend');

  return classes.join(' ');
}

export const Calendar: React.FC<CalendarProps> = ({
  selected,
  onSelect,
  initialDate,
  mode = 'single',
  disabled = false,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const initialMonth = useMemo(
    () => startOfMonth(initialDate ?? selected ?? new Date()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [months, setMonths] = useState<Date[]>(() => [
    subMonths(initialMonth, 1),
    initialMonth,
    addMonths(initialMonth, 1),
  ]);

  const loadMoreMonths = useCallback((direction: 'up' | 'down') => {
    setMonths((prev) => {
      if (direction === 'up') {
        return [subMonths(prev[0], 1), ...prev];
      } else {
        return [...prev, addMonths(prev[prev.length - 1], 1)];
      }
    });
  }, []);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (container.scrollTop <= 100) {
        const prevScrollHeight = container.scrollHeight;
        const prevScrollTop = container.scrollTop;
        loadMoreMonths('up');
        setTimeout(() => {
          container.scrollTop =
            container.scrollHeight - prevScrollHeight + prevScrollTop;
        }, 0);
      } else if (
        container.scrollTop + container.clientHeight >=
        container.scrollHeight - 100
      ) {
        loadMoreMonths('down');
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [loadMoreMonths]);

  // Scroll to the selected/initial month on mount
  useEffect(() => {
    if (!scrollRef.current) return;
    const target = selected ?? initialDate ?? new Date();
    const monthKey = format(startOfMonth(target), 'yyyy-MM');
    const el = scrollRef.current.querySelector(`[data-month="${monthKey}"]`);
    if (el) {
      (el as HTMLElement).scrollIntoView({ behavior: 'auto', block: 'start' });
    }
    // Run once on mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderMonth = useCallback(
    (month: Date) => {
      const firstDay = startOfMonth(month);
      const totalDays = getDaysInMonth(month);
      // Monday-first: Sunday (0) -> 6, Monday (1) -> 0, ...
      const emptyDays = (getDay(firstDay) + 6) % 7;
      const monthKey = format(month, 'yyyy-MM');
      const monthLabel = format(month, 'LLLL yyyy');

      const emptyCells = Array.from({ length: emptyDays }, (_, i) => (
        <div key={`e-${i}`} className="gantt-cal-empty-day" />
      ));

      const dayCells = Array.from({ length: totalDays }, (_, i) => {
        const dayNum = i + 1;
        const day = new Date(month.getFullYear(), month.getMonth(), dayNum);
        const className = getDayClassName(day, selected);
        return (
          <button
            key={dayNum}
            type="button"
            className={className}
            disabled={disabled}
            onClick={() => {
              if (!disabled && onSelect) {
                onSelect(new Date(month.getFullYear(), month.getMonth(), dayNum));
              }
            }}
          >
            {dayNum}
          </button>
        );
      });

      return (
        <div key={monthKey} className="gantt-cal-month" data-month={monthKey}>
          <div className="gantt-cal-month-header">{monthLabel}</div>
          <div className="gantt-cal-month-days">
            {emptyCells}
            {dayCells}
          </div>
        </div>
      );
    },
    [selected, onSelect, disabled]
  );

  const renderedMonths = useMemo(
    () => months.map(renderMonth),
    [months, renderMonth]
  );

  return (
    <div ref={scrollRef} className="gantt-cal-container">
      {renderedMonths}
    </div>
  );
};

Calendar.displayName = 'Calendar';
export default Calendar;
