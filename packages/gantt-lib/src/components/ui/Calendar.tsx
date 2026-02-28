'use client';

import React from 'react';
import { DayPicker } from 'react-day-picker';
import type { DayPickerProps } from 'react-day-picker';

export type CalendarProps = DayPickerProps;

/**
 * Calendar component wrapping react-day-picker v9 DayPicker
 * with gantt-lib custom CSS class names for theming
 */
export const Calendar: React.FC<CalendarProps> = ({ classNames, ...props }) => {
  return (
    <DayPicker
      classNames={{
        root: 'gantt-calendar',
        months: 'gantt-calendar-months',
        month: 'gantt-calendar-month',
        month_caption: 'gantt-calendar-month-caption',
        caption_label: 'gantt-calendar-caption-label',
        nav: 'gantt-calendar-nav',
        button_previous: 'gantt-calendar-btn-prev',
        button_next: 'gantt-calendar-btn-next',
        chevron: 'gantt-calendar-chevron',
        month_grid: 'gantt-calendar-month-grid',
        weekdays: 'gantt-calendar-weekdays',
        weekday: 'gantt-calendar-weekday',
        weeks: 'gantt-calendar-weeks',
        week: 'gantt-calendar-week',
        day: 'gantt-calendar-day',
        day_button: 'gantt-calendar-day-button',
        today: 'gantt-calendar-day-today',
        selected: 'gantt-calendar-day-selected',
        outside: 'gantt-calendar-day-outside',
        disabled: 'gantt-calendar-day-disabled',
        hidden: 'gantt-calendar-day-hidden',
        focused: 'gantt-calendar-day-focused',
        ...classNames,
      }}
      {...props}
    />
  );
};

Calendar.displayName = 'Calendar';
export default Calendar;
