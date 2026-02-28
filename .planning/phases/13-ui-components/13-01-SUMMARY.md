---
phase: "13"
plan: "01"
subsystem: ui-components
tags: [shadcn-ui, datepicker, react-day-picker, radix-ui, css-variables, tasklist]
dependency_graph:
  requires: []
  provides: [Input, Button, Popover, Calendar, DatePicker]
  affects: [TaskListRow, styles.css, gantt-lib exports]
tech_stack:
  added:
    - react-day-picker@9.14.0
    - "@radix-ui/react-popover@1.1.15"
  patterns:
    - shadcn/ui copy-paste pattern (components owned in-repo)
    - Radix UI Popover with portal for z-index safety
    - react-day-picker v9 classNames API for full CSS customization
    - CSS variables with gantt- prefix for theming
key_files:
  created:
    - packages/gantt-lib/src/components/ui/Input.tsx
    - packages/gantt-lib/src/components/ui/Button.tsx
    - packages/gantt-lib/src/components/ui/Popover.tsx
    - packages/gantt-lib/src/components/ui/Calendar.tsx
    - packages/gantt-lib/src/components/ui/DatePicker.tsx
    - packages/gantt-lib/src/components/ui/index.ts
    - packages/gantt-lib/src/components/ui/ui.css
  modified:
    - packages/gantt-lib/package.json
    - packages/gantt-lib/pnpm-lock.yaml
    - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
    - packages/gantt-lib/src/components/TaskList/TaskList.css
    - packages/gantt-lib/src/styles.css
    - packages/gantt-lib/src/index.ts
decisions:
  - "react-day-picker v9 installed (not v8 as plan noted) — v9 has DayPicker component with classNames prop using rdp-* keys; adapted Calendar wrapper accordingly"
  - "DatePicker trigger uses <button> (not <input>) — cleaner API, popover opens on click, no native picker browser inconsistencies"
  - "DatePicker onChange returns ISO string directly — handlers in TaskListRow updated to accept string instead of ChangeEvent"
  - "DatePicker format: dd.MM.yy (2-digit year) — matches existing formatShortDate 2-digit year convention"
  - "portal=true for DatePicker in TaskListRow — ensures calendar floats above gantt z-index stack"
metrics:
  duration: "4 min"
  completed_date: "2026-02-28"
  tasks_completed: 5
  files_changed: 12
---

# Phase 13 Plan 01: shadcn/ui Components — DatePicker and Input Summary

**One-liner:** shadcn/ui-inspired Input, Button, Popover, Calendar, DatePicker components using react-day-picker v9 + Radix UI Popover, replacing native date inputs in TaskListRow

## What Was Built

Five reusable UI components added to `packages/gantt-lib/src/components/ui/`:

1. **Input** — `forwardRef` wrapper with `gantt-input` CSS class, accepts all standard HTML input attributes
2. **Button** — Flexible button with `variant` (default/ghost/outline) and `size` (default/sm/icon) props
3. **Popover** — Radix UI Popover wrapper exposing `PopoverTrigger` and `PopoverContent` with optional portal
4. **Calendar** — react-day-picker v9 `DayPicker` wrapper with all custom `gantt-calendar-*` CSS class names
5. **DatePicker** — Composite Popover + Calendar: accepts/returns ISO strings (YYYY-MM-DD), displays as dd.MM.yy

**TaskListRow updated:**
- Name edit overlay uses `Input` component (`gantt-tl-name-input` class for absolute positioning)
- Both date cells use `DatePicker` component (replaces transparent `<input type="date">` overlay)
- Date change handlers simplified from `ChangeEvent<HTMLInputElement>` to plain `string`

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 41d2975 | chore: install react-day-picker and @radix-ui/react-popover |
| 2 | 861d542 | feat: add shadcn/ui-inspired components |
| 3 | 21a4d21 | feat: add UI component styles with gantt- CSS variables |
| 4 | 73027ec | feat: integrate Input and DatePicker into TaskListRow |
| 5 | a3727c8 | feat: export UI components from gantt-lib |

## Bundle Impact

- JS bundle: ~16 KB gzipped (under 30 KB budget)
- CSS bundle: ~3 KB gzipped
- Total new: ~19 KB gzipped

## Deviations from Plan

### Auto-adapted Issues

**1. [Rule 1 - Adaptation] react-day-picker v9 installed instead of v8**
- **Found during:** Task 2
- **Issue:** Plan referenced v8 hooks API (useNavigation, useDayPicker). pnpm installed latest v9.14.0
- **Fix:** Used v9's `classNames` prop with `rdp-*` keys (from `getDefaultClassNames()`) for Calendar wrapper — same end result
- **Files modified:** `Calendar.tsx`, `ui.css`
- **Commit:** 861d542

**2. [Rule 1 - Adaptation] DatePicker handler signature simplified**
- **Found during:** Task 4
- **Issue:** Plan showed `onChange` receiving a synthetic `ChangeEvent` wrapper (`{ target: { value: newDate } }`)
- **Fix:** DatePicker `onChange` returns ISO string directly; TaskListRow handlers updated to accept `string` — cleaner API
- **Files modified:** `DatePicker.tsx`, `TaskListRow.tsx`
- **Commit:** 73027ec

## Self-Check: PASSED

All 8 created/modified files confirmed present on disk.
All 5 task commits confirmed in git log.
Build succeeded: 16 KB gzipped JS, 3 KB gzipped CSS.
