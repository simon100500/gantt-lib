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
}) => {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const dateInputRef = useRef<HTMLInputElement>(null);

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

  // Auto-focus input when popup opens
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        if (dateInputRef.current) {
          dateInputRef.current.focus();
          selectSegment(0);
        }
      }, 50);
    }
  }, [open]);

  const selectSegment = (pos: number) => {
    if (!dateInputRef.current) return;
    const segment = segments.find(s => pos >= s.start && pos <= s.end) || segments[0];
    dateInputRef.current.setSelectionRange(segment.start, segment.end);
  };

  const handleFocus = () => {
    setTimeout(() => selectSegment(0), 0);
  };

  const handleMouseDown = () => {
    setTimeout(() => {
      const pos = dateInputRef.current?.selectionStart || 0;
      selectSegment(pos);
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
    const { selectionStart, selectionEnd, value: inputVal } = dateInputRef.current;
    const pos = selectionStart ?? 0;
    const segmentIndex = segments.findIndex(s => pos >= s.start && pos <= s.end);
    const currentSegment = segments[segmentIndex] ?? segments[0];

    if (e.key === 'Tab') return;

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      return;
    }

    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      const baseDate = selectedDate ?? new Date();
      let newDate = baseDate;
      if (currentSegment.label === 'day') {
        newDate = e.key === 'ArrowUp' ? addDays(baseDate, 1) : subDays(baseDate, 1);
      } else if (currentSegment.label === 'month') {
        newDate = e.key === 'ArrowUp' ? addMonths(baseDate, 1) : subMonths(baseDate, 1);
      } else if (currentSegment.label === 'year') {
        newDate = e.key === 'ArrowUp' ? addYears(baseDate, 1) : subYears(baseDate, 1);
      }
      updateFromDate(newDate);
      requestAnimationFrame(() => selectSegment(currentSegment.start));
      return;
    }

    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      e.stopPropagation();
      const newValue = inputVal.split('');
      for (let i = currentSegment.start; i < currentSegment.end; i++) {
        newValue[i] = '0';
      }
      setInputValue(newValue.join(''));
      requestAnimationFrame(() => selectSegment(currentSegment.start));
      return;
    }

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      e.stopPropagation();
      const next = segments[segmentIndex + 1] || segments[0];
      selectSegment(next.start);
      return;
    }

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      e.stopPropagation();
      const prev = segments[segmentIndex - 1] || segments[segments.length - 1];
      selectSegment(prev.start);
      return;
    }

    if (/^\d$/.test(e.key)) {
      e.preventDefault();
      e.stopPropagation();
      const newValue = inputVal.split('');
      let charIndex = pos;

      const isFullSelected = ((selectionEnd ?? 0) - pos) >= (currentSegment.end - currentSegment.start);
      if (isFullSelected || charIndex === currentSegment.start) {
        charIndex = currentSegment.start;
        for (let i = currentSegment.start + 1; i < currentSegment.end; i++) {
          newValue[i] = '0';
        }
      }

      const tempValue = [...newValue];
      tempValue[charIndex] = e.key;
      const segmentString = tempValue.slice(currentSegment.start, currentSegment.end).join('');
      const segmentValue = parseInt(segmentString, 10);

      if (currentSegment.label === 'month' && charIndex === currentSegment.start && parseInt(e.key) > 1) return;
      if (currentSegment.label === 'day' && charIndex === currentSegment.start && parseInt(e.key) > 3) return;
      if (segmentValue > currentSegment.max) return;

      const updatedValue = tempValue.join('');
      setInputValue(updatedValue);

      const nextCharInSegment = charIndex + 1;
      if (nextCharInSegment < currentSegment.end) {
        requestAnimationFrame(() => {
          dateInputRef.current?.setSelectionRange(nextCharInSegment, currentSegment.end);
        });
      } else {
        const nextSegment = segments[segmentIndex + 1];
        if (nextSegment) requestAnimationFrame(() => selectSegment(nextSegment.start));
        else requestAnimationFrame(() => selectSegment(currentSegment.start));
      }

      const parsedDate = parse(updatedValue, 'dd.MM.yy', new Date());
      if (isValid(parsedDate) && !updatedValue.includes('00.00')) {
        updateFromDate(parsedDate);
      }
    }
  }, [selectedDate, updateFromDate]);

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
        />
      </PopoverContent>
    </Popover>
  );
};

DatePicker.displayName = 'DatePicker';
export default DatePicker;
