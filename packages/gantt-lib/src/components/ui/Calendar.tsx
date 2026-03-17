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
  isBefore,
  startOfDay,
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { createIsWeekendPredicate } from '../../utils/dateUtils';

export interface CalendarProps {
  selected?: Date;
  onSelect?: (date: Date) => void;
  initialDate?: Date;
  mode?: 'single' | 'range';
  disabled?: boolean;
  /** Optional predicate for custom weekend logic (e.g., holidays, shift patterns) */
  isWeekend?: (date: Date) => boolean;
  /** Optional custom weekend dates (holidays) - takes precedence over default weekends */
  weekends?: Date[];
  /** Optional custom workday dates - overrides both default and custom weekends */
  workdays?: Date[];
}


function getDayClassName(
  day: Date,
  selected: Date | undefined,
  isWeekendProp?: (date: Date) => boolean
): string {
  const classes: string[] = ['gantt-day-btn'];

  if (selected && isSameDay(day, selected)) classes.push('selected');
  if (isToday(day)) classes.push('today');
  // Use custom predicate if provided, otherwise default
  if (isWeekendProp ? isWeekendProp(day) : isWeekend(day)) classes.push('weekend');
  if (isBefore(day, startOfDay(new Date())) && !isToday(day)) classes.push('past');

  return classes.join(' ');
}

export const Calendar: React.FC<CalendarProps> = ({
  selected,
  onSelect,
  initialDate,
  mode = 'single',
  disabled = false,
  isWeekend: isWeekendProp,
  weekends,
  workdays,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Create weekend predicate from weekends/workdays arrays if provided
  const derivedWeekendPredicate = useMemo(() => {
    if (isWeekendProp) return isWeekendProp;
    if (weekends || workdays) {
      return createIsWeekendPredicate({
        weekends: weekends ?? [],
        workdays: workdays ?? [],
      });
    }
    return undefined;
  }, [isWeekendProp, weekends, workdays]);

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
      const monthLabel = format(month, 'LLLL yyyy', { locale: ru });

      const emptyCells = Array.from({ length: emptyDays }, (_, i) => (
        <div key={`e-${i}`} className="gantt-cal-empty-day" />
      ));

      const dayCells = Array.from({ length: totalDays }, (_, i) => {
        const dayNum = i + 1;
        const day = new Date(month.getFullYear(), month.getMonth(), dayNum);
        const className = getDayClassName(day, selected, derivedWeekendPredicate);
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
    [selected, onSelect, disabled, derivedWeekendPredicate]
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
