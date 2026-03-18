'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { format, isValid, parse, addDays, addMonths, addYears, subMonths, subYears, subDays } from 'date-fns';
import { Calendar } from './Calendar';
import { Popover, PopoverTrigger, PopoverContent } from './Popover';

export interface DatePickerProps {
  /** Current date value as ISO string (YYYY-MM-DD) */
  value?: string;
  /** Callback with new ISO date string (YYYY-MM-DD) when date is selected */
  onChange?: (isoDate: string) => void;
  /** Display format for the input (default: dd.MM.yyyy) */
  format?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Whether to use portal for popover (default: true) */
  portal?: boolean;
  /** Additional CSS class names for the trigger button */
  className?: string;
  /** Whether the picker is disabled */
  disabled?: boolean;
  /** Optional predicate for custom weekend logic */
  isWeekend?: (date: Date) => boolean;
}

const segments = [
  { start: 0, end: 2, label: 'day', max: 31 },
  { start: 3, end: 5, label: 'month', max: 12 },
  { start: 6, end: 8, label: 'year', max: 99 },
];

/**
 * DatePicker component — shows formatted date as a button, opens calendar popup on click.
 * The popup includes a keyboard-navigable date input field above the calendar.
 * Accepts and returns ISO date strings (YYYY-MM-DD)
 */
export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  format: displayFormat = 'dd.MM.yyyy',
  placeholder = 'Pick a date',
  portal = true,
  className,
  disabled = false,
  isWeekend,
}) => {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const dateInputRef = useRef<HTMLInputElement>(null);
  // Refs для синхронного отслеживания позиции — не зависят от DOM/rAF
  const segIdxRef = useRef(0);   // текущий сегмент (0=day, 1=month, 2=year)
  const charPosRef = useRef(0);  // позиция внутри сегмента (0 или 1)

  // Parse ISO string to Date for calendar
  const selectedDate: Date | undefined = (() => {
    if (!value) return undefined;
    const d = new Date(value + 'T00:00:00Z');
    return isValid(d) ? d : undefined;
  })();

  // Format Date for display on trigger button
  const displayValue = selectedDate
    ? format(selectedDate, displayFormat)
    : placeholder;

  // Sync inputValue with prop value
  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T00:00:00Z');
      if (isValid(d)) setInputValue(format(d, 'dd.MM.yy'));
    } else {
      setInputValue('');
    }
  }, [value]);

  // Выделить сегмент по индексу (визуально)
  const selectSegByIdx = useCallback((idx: number) => {
    if (!dateInputRef.current) return;
    const seg = segments[idx] ?? segments[0];
    dateInputRef.current.setSelectionRange(seg.start, seg.end);
  }, []);

  // Auto-focus input when popup opens
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        if (dateInputRef.current) {
          segIdxRef.current = 0;
          charPosRef.current = 0;
          dateInputRef.current.focus();
          selectSegByIdx(0);
        }
      }, 50);
    }
  }, [open, selectSegByIdx]);

  const handleFocus = () => {
    setTimeout(() => {
      segIdxRef.current = 0;
      charPosRef.current = 0;
      selectSegByIdx(0);
    }, 0);
  };

  const handleMouseDown = () => {
    setTimeout(() => {
      const pos = dateInputRef.current?.selectionStart ?? 0;
      const idx = segments.findIndex(s => pos >= s.start && pos <= s.end);
      segIdxRef.current = idx >= 0 ? idx : 0;
      charPosRef.current = 0;
      selectSegByIdx(segIdxRef.current);
    }, 0);
  };

  const updateFromDate = useCallback((newDate: Date) => {
    if (!isValid(newDate)) return;
    setInputValue(format(newDate, 'dd.MM.yy'));
    const iso = [
      newDate.getFullYear(),
      String(newDate.getMonth() + 1).padStart(2, '0'),
      String(newDate.getDate()).padStart(2, '0'),
    ].join('-');
    onChange?.(iso);
  }, [onChange]);

  const handleCalendarSelect = useCallback(
    (day: Date) => {
      updateFromDate(day);
      setOpen(false);
    },
    [updateFromDate]
  );

  const handleDayShift = useCallback(
    (delta: number) => {
      const base = selectedDate ?? new Date();
      updateFromDate(addDays(base, delta));
    },
    [selectedDate, updateFromDate]
  );

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!dateInputRef.current) return;
    const { value: inputVal } = dateInputRef.current;

    // Читаем сегмент из рефа — всегда актуально, даже при быстром вводе
    const segIdx = segIdxRef.current;
    const seg = segments[segIdx] ?? segments[0];

    if (e.key === 'Tab') return;

    if (e.key === 'Escape') {
      e.preventDefault(); e.stopPropagation();
      setOpen(false);
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault(); e.stopPropagation();
      setOpen(false);
      return;
    }

    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault(); e.stopPropagation();
      const base = selectedDate ?? new Date();
      let newDate = base;
      if (seg.label === 'day')   newDate = e.key === 'ArrowUp' ? addDays(base, 1)   : subDays(base, 1);
      if (seg.label === 'month') newDate = e.key === 'ArrowUp' ? addMonths(base, 1) : subMonths(base, 1);
      if (seg.label === 'year')  newDate = e.key === 'ArrowUp' ? addYears(base, 1)  : subYears(base, 1);
      charPosRef.current = 0;
      updateFromDate(newDate);
      requestAnimationFrame(() => selectSegByIdx(segIdx));
      return;
    }

    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault(); e.stopPropagation();
      const chars = inputVal.split('');
      for (let i = seg.start; i < seg.end; i++) chars[i] = '0';
      charPosRef.current = 0;
      setInputValue(chars.join(''));
      requestAnimationFrame(() => selectSegByIdx(segIdx));
      return;
    }

    if (e.key === 'ArrowRight') {
      e.preventDefault(); e.stopPropagation();
      const next = segIdx + 1 < segments.length ? segIdx + 1 : 0;
      segIdxRef.current = next;
      charPosRef.current = 0;
      selectSegByIdx(next);
      return;
    }

    if (e.key === 'ArrowLeft') {
      e.preventDefault(); e.stopPropagation();
      const prev = segIdx - 1 >= 0 ? segIdx - 1 : segments.length - 1;
      segIdxRef.current = prev;
      charPosRef.current = 0;
      selectSegByIdx(prev);
      return;
    }

    if (/^\d$/.test(e.key)) {
      e.preventDefault(); e.stopPropagation();
      const charPos = charPosRef.current;
      const charIndex = seg.start + charPos;
      const chars = inputVal.split('');

      // На первой позиции сегмента — сбрасываем вторую цифру
      if (charPos === 0) {
        for (let i = seg.start + 1; i < seg.end; i++) chars[i] = '0';
      }
      chars[charIndex] = e.key;

      const segStr = chars.slice(seg.start, seg.end).join('');
      const segVal = parseInt(segStr, 10);

      if (seg.label === 'month' && charPos === 0 && parseInt(e.key) > 1) return;
      if (seg.label === 'day'   && charPos === 0 && parseInt(e.key) > 3) return;
      if (segVal > seg.max) return;

      const updated = chars.join('');
      setInputValue(updated);

      const segLen = seg.end - seg.start;
      if (charPos + 1 < segLen) {
        // Ещё не заполнили сегмент — двигаемся внутри
        charPosRef.current = charPos + 1;
        requestAnimationFrame(() => {
          dateInputRef.current?.setSelectionRange(charIndex + 1, seg.end);
        });
      } else {
        // Сегмент заполнен — переходим к следующему
        const nextIdx = segIdx + 1 < segments.length ? segIdx + 1 : segIdx;
        segIdxRef.current = nextIdx;
        charPosRef.current = 0;
        requestAnimationFrame(() => selectSegByIdx(nextIdx));
      }

      const parsed = parse(updated, 'dd.MM.yy', new Date());
      if (isValid(parsed) && !updated.includes('00.00')) {
        updateFromDate(parsed);
      }
    }
  }, [selectedDate, updateFromDate, selectSegByIdx]);

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`gantt-datepicker-trigger${className ? ` ${className}` : ''}`}
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          {displayValue}
        </button>
      </PopoverTrigger>
      <PopoverContent
        portal={portal}
        align="start"
        side="bottom"
      >
        <div className="gantt-datepicker-input-row">
          <button type="button" className="gantt-datepicker-shift-btn" onClick={() => handleDayShift(-7)} tabIndex={-1}>-7</button>
          <button type="button" className="gantt-datepicker-shift-btn" onClick={() => handleDayShift(-1)} tabIndex={-1}>-1</button>
          <input
            ref={dateInputRef}
            type="text"
            className="gantt-datepicker-date-input"
            value={inputValue}
            onChange={() => {}}
            onFocus={handleFocus}
            onMouseDown={handleMouseDown}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            autoComplete="off"
          />
          <button type="button" className="gantt-datepicker-shift-btn" onClick={() => handleDayShift(1)} tabIndex={-1}>+1</button>
          <button type="button" className="gantt-datepicker-shift-btn" onClick={() => handleDayShift(7)} tabIndex={-1}>+7</button>
        </div>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleCalendarSelect}
          initialDate={selectedDate}
          isWeekend={isWeekend}
        />
      </PopoverContent>
    </Popover>
  );
};

DatePicker.displayName = 'DatePicker';
export default DatePicker;
