'use client';

import React, { useState, useCallback } from 'react';
import { format, parse, isValid } from 'date-fns';
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

/**
 * DatePicker component — shows formatted date as a button, opens calendar popup on click
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

  // Parse ISO string to Date for react-day-picker
  const selectedDate: Date | undefined = (() => {
    if (!value) return undefined;
    const d = new Date(value + 'T00:00:00Z');
    return isValid(d) ? d : undefined;
  })();

  // Format Date for display
  const displayValue = selectedDate
    ? format(selectedDate, displayFormat)
    : placeholder;

  const handleSelect = useCallback(
    (day: Date | undefined) => {
      if (day) {
        // Convert to ISO string using UTC to avoid timezone shift
        const iso = [
          day.getFullYear(),
          String(day.getMonth() + 1).padStart(2, '0'),
          String(day.getDate()).padStart(2, '0'),
        ].join('-');
        onChange?.(iso);
        setOpen(false);
      }
    },
    [onChange]
  );

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
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          defaultMonth={selectedDate}
        />
      </PopoverContent>
    </Popover>
  );
};

DatePicker.displayName = 'DatePicker';
export default DatePicker;
