---
phase: quick-29
plan: 29
subsystem: ui-components
tags: [calendar, datepicker, css, react-day-picker-removal]
dependency_graph:
  requires: []
  provides: [custom-scrollable-calendar]
  affects: [DatePicker, TaskListRow]
tech_stack:
  added: []
  patterns: [infinite-scroll-month-list, monday-first-week-offset, data-attribute-scroll-target]
key_files:
  created: []
  modified:
    - packages/gantt-lib/src/components/ui/Calendar.tsx
    - packages/gantt-lib/src/components/ui/DatePicker.tsx
    - packages/gantt-lib/src/components/ui/ui.css
decisions:
  - "No locale passed to date-fns format — defaults to English (LLLL yyyy month headers)"
  - "Monday-first week: (getDay + 6) % 7 offset for empty spacer cells"
  - "Month init: 3 months [prev, current, next] around initialDate ?? selected ?? today"
  - "Scroll-position restore on prepend: capture scrollHeight before setState, restore in setTimeout(0)"
  - "Day click creates new Date(year, month, dayNum) — local midnight, no timezone shift"
  - "getDayClassName only handles single-mode modifiers (selected, today, weekend) per plan scope"
metrics:
  duration: "2 min"
  completed: "2026-02-28"
  tasks: 2
  files: 3
---

# Phase quick-29 Plan 29: Replace react-day-picker Calendar with Custom Scrollable CalendarClient Summary

**One-liner:** Custom infinite-scroll calendar using React + date-fns with Monday-first week layout, replacing react-day-picker DayPicker entirely.

## What Was Built

A fully self-contained scrollable calendar component ported from `example-cal/calendar.tsx` and adapted to the gantt-lib CSS convention (`gantt-` prefix, plain CSS variables, no Tailwind).

### Calendar.tsx

- `CalendarProps` interface: `selected`, `onSelect`, `initialDate`, `mode`, `disabled`
- `months: Date[]` state initialized to 3 months centered on `initialDate ?? selected ?? today`
- `loadMoreMonths("up"|"down")` prepends/appends one month
- Scroll handler: prepend when scrollTop <= 100 (with position-restore via setTimeout), append when near bottom
- `renderMonth`: computes Monday-first empty cells with `(getDay(firstDay) + 6) % 7`, renders day `<button>` elements
- `getDayClassName`: `gantt-day-btn` base + `selected`, `today`, `weekend` modifiers
- Mount effect: scrolls `data-month` element into view for selected/initialDate month
- No react-day-picker imports

### DatePicker.tsx

- Removed `parse` import (unused)
- `handleSelect(day: Date)` — no `if (day)` guard, new Calendar always passes real Date
- `defaultMonth` prop replaced with `initialDate`
- Kept `mode="single"` and `selected={selectedDate}` (CalendarProps accepts them)

### ui.css

- Removed ~175 lines of `.gantt-calendar-*` react-day-picker override rules
- Added 7 new CSS variables under `:root` (`--gantt-calendar-bg`, `-text`, `-text-weekend`, `-text-muted`, `-day-today-border`, `-day-range`, `-day-disabled-text`)
- Added new `/* Calendar — custom scrollable */` section with `.gantt-cal-container`, `.gantt-cal-month`, `.gantt-cal-month-header`, `.gantt-cal-month-days`, `.gantt-cal-empty-day`, `.gantt-day-btn` and all modifier classes

## Verification Results

1. `npx tsc --noEmit` — zero Calendar/DatePicker errors (2 pre-existing test/DragGuideLines errors unrelated)
2. `grep "react-day-picker" Calendar.tsx` — no output (confirmed removed)
3. `grep "gantt-calendar-month-grid" ui.css` — no output (confirmed removed)
4. `grep "gantt-day-btn" ui.css` — multiple matches (confirmed present)

## Deviations from Plan

None — plan executed exactly as written.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | d9be72e | feat(quick-29): rewrite Calendar.tsx as custom scrollable CalendarClient |
| 2 | 4f3ff7d | feat(quick-29): update DatePicker and replace react-day-picker CSS with gantt-cal-* styles |

## Self-Check: PASSED

All files created/modified exist on disk. Both commits (d9be72e, 4f3ff7d) verified in git log.
