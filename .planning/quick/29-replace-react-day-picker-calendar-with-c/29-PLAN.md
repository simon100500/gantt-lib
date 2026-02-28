---
phase: quick-29
plan: 29
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/ui/Calendar.tsx
  - packages/gantt-lib/src/components/ui/DatePicker.tsx
  - packages/gantt-lib/src/components/ui/ui.css
autonomous: true
requirements: [QUICK-29]

must_haves:
  truths:
    - "Calendar renders as a scrollable list of months (no prev/next nav buttons)"
    - "Clicking a day in the calendar closes the popover and updates the date"
    - "Selected day is visually highlighted"
    - "Today is visually marked with a border"
    - "react-day-picker DayPicker is no longer rendered by Calendar.tsx"
  artifacts:
    - path: "packages/gantt-lib/src/components/ui/Calendar.tsx"
      provides: "Custom scrollable CalendarClient — no react-day-picker dependency"
      exports: ["Calendar"]
    - path: "packages/gantt-lib/src/components/ui/DatePicker.tsx"
      provides: "DatePicker using updated Calendar API"
      contains: "initialDate"
    - path: "packages/gantt-lib/src/components/ui/ui.css"
      provides: "gantt-cal-* and gantt-day-btn styles replacing old gantt-calendar-* rules"
      contains: ".gantt-day-btn"
  key_links:
    - from: "packages/gantt-lib/src/components/ui/DatePicker.tsx"
      to: "packages/gantt-lib/src/components/ui/Calendar.tsx"
      via: "onSelect prop — now (date: Date) not (date: Date | undefined)"
      pattern: "onSelect.*Date\b"
---

<objective>
Replace the react-day-picker-based Calendar component with a custom scrollable
CalendarClient ported from example-cal/calendar.tsx. The new Calendar renders a
vertical list of months the user scrolls through instead of showing a single
month with prev/next buttons.

Purpose: Eliminate the react-day-picker dependency from the calendar widget and
deliver a richer infinite-scroll UX.
Output: Updated Calendar.tsx, DatePicker.tsx, and ui.css — fully self-contained,
no react-day-picker imports.
</objective>

<execution_context>
@C:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

Key facts from existing code:
- Calendar.tsx currently wraps DayPicker from react-day-picker v9
- DatePicker.tsx calls Calendar with `mode="single"`, `selected`, `onSelect`, `defaultMonth`
- onSelect handler in DatePicker is `(day: Date | undefined)` with an `if (day)` guard
- ui.css has ~175 lines of `.gantt-calendar-*` rules to replace
- date-fns is already installed (used in DatePicker.tsx for format/isValid)
- Project CSS prefix convention: `gantt-` prefix on all class names
- No Tailwind in the library package — plain CSS only
</context>

<tasks>

<task type="auto">
  <name>Task 1: Rewrite Calendar.tsx as custom scrollable CalendarClient</name>
  <files>packages/gantt-lib/src/components/ui/Calendar.tsx</files>
  <action>
Replace the entire file. Remove the DayPicker import. Implement a self-contained
scrollable calendar using only React and date-fns.

Structure to implement (ported from example-cal/calendar.tsx CalendarClient):

Props interface:
```typescript
export interface CalendarProps {
  selected?: Date;
  onSelect?: (date: Date) => void;
  initialDate?: Date;
  mode?: 'single' | 'range';
  disabled?: boolean;
}
```

Internal state:
- `months: Date[]` — list of month start dates to render
- Initialise to 3 months: [monthBefore, initialMonth, monthAfter] where
  initialMonth = startOfMonth(initialDate ?? selected ?? new Date())

Scroll behaviour:
- Wrap month list in a div with className `gantt-cal-container`
- On scroll (onScroll handler on the container): when scrollTop < 100, prepend
  the month before the first rendered month; when scrollTop > scrollHeight - clientHeight - 100,
  append the month after the last rendered month. Use a ref to avoid re-renders
  during scroll prep (maintain scroll position after prepend via scrollTop adjustment).

Month rendering (getDayClassName helper):
For each month, render:
```
<div className="gantt-cal-month">
  <div className="gantt-cal-month-header">{format(month, 'LLLL yyyy')}</div>
  <div className="gantt-cal-month-days">{cells}</div>
</div>
```

Day cells:
- Calculate the weekday offset of month start (getDay, Sunday=0). Render that
  many `<div className="gantt-cal-empty-day" />` spacers first.
- Then render each day of the month as a `<button className={getDayClassName(day)} ...>`.
- On click: call `onSelect?.(day)` (day is a plain Date at local midnight for
  that calendar date — use `new Date(year, month, dayNum)`).

getDayClassName(day: Date): string — returns space-joined class list:
- Always: `"gantt-day-btn"`
- If same calendar date as `selected`: add `"selected"`
- If same calendar date as today (`new Date()`): add `"today"`
- If weekend (getDay() === 0 or 6): add `"weekend"`

Use date-fns imports: `startOfMonth`, `getDaysInMonth`, `format`, `addMonths`,
`subMonths`, `isSameDay`, `isSameMonth` (only what's needed).

Default locale: do NOT pass any locale to date-fns format — defaults to English.

Keep `'use client'` directive at top. Export as both named `Calendar` and default.
  </action>
  <verify>
    <automated>cd D:/Projects/gantt-lib && npx tsc --noEmit -p packages/gantt-lib/tsconfig.json 2>&1 | grep -i "Calendar\|DatePicker\|error" | head -20</automated>
  </verify>
  <done>Calendar.tsx compiles with no TypeScript errors, does not import react-day-picker</done>
</task>

<task type="auto">
  <name>Task 2: Update DatePicker.tsx and replace ui.css calendar styles</name>
  <files>
    packages/gantt-lib/src/components/ui/DatePicker.tsx
    packages/gantt-lib/src/components/ui/ui.css
  </files>
  <action>
**DatePicker.tsx changes:**

1. Remove `parse` from the date-fns import (it is unused).
2. Update `handleSelect` signature from `(day: Date | undefined)` to `(day: Date)`.
   Remove the `if (day)` guard — the new Calendar always passes a real Date.
3. Replace `defaultMonth={selectedDate}` with `initialDate={selectedDate}` in
   the Calendar JSX.
4. Remove `mode="single"` and `selected={selectedDate}` props if CalendarProps
   no longer requires them for basic usage, OR keep them if the new CalendarProps
   interface still accepts them — follow whatever interface Task 1 produces.
   The key change is `defaultMonth` → `initialDate`.

**ui.css changes:**

Delete the entire `/* Calendar (react-day-picker v9 custom class names) */`
section (lines 188–366 in current file, all `.gantt-calendar-*` rules).

Add new calendar CSS variables to the `:root` block (merge with existing vars,
don't duplicate):
```css
--gantt-calendar-bg: #ffffff;
--gantt-calendar-text: #1f2937;
--gantt-calendar-text-weekend: #6b7280;
--gantt-calendar-text-muted: #9ca3af;
--gantt-calendar-day-today-border: #3b82f6;
--gantt-calendar-day-range: #dbeafe;
--gantt-calendar-day-disabled-text: #d1d5db;
```

Add new calendar CSS section at the end of ui.css:

```css
/* =========================================================
 * Calendar — custom scrollable (gantt-cal-* / gantt-day-btn)
 * ========================================================= */

.gantt-cal-container {
  max-height: 400px;
  overflow-y: auto;
  user-select: none;
  padding: 8px;
  font-family: inherit;
  background: var(--gantt-calendar-bg);
  color: var(--gantt-calendar-text);
}

.gantt-cal-month {
  margin-bottom: 16px;
}

.gantt-cal-month-header {
  font-size: 0.875rem;
  font-weight: 600;
  padding: 4px 0 8px;
  color: var(--gantt-calendar-text);
}

.gantt-cal-month-days {
  display: grid;
  grid-template-columns: repeat(7, 32px);
  gap: 2px;
}

.gantt-cal-empty-day {
  width: 32px;
  height: 32px;
}

.gantt-day-btn {
  width: 32px;
  height: 32px;
  font-size: 0.875rem;
  font-family: inherit;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  color: var(--gantt-calendar-text);
  transition: background-color 100ms;
}

.gantt-day-btn:hover {
  background-color: var(--gantt-calendar-day-hover);
}

.gantt-day-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--gantt-input-focus-ring);
}

.gantt-day-btn.today {
  border-color: var(--gantt-calendar-day-today-border);
  font-weight: 600;
}

.gantt-day-btn.selected {
  background-color: var(--gantt-calendar-day-selected);
  color: var(--gantt-calendar-day-selected-text);
  font-weight: 600;
}

.gantt-day-btn.selected:hover {
  background-color: var(--gantt-calendar-day-selected);
  opacity: 0.9;
}

.gantt-day-btn.weekend {
  color: var(--gantt-calendar-text-weekend);
}

.gantt-day-btn.disabled {
  color: var(--gantt-calendar-day-disabled-text);
  cursor: not-allowed;
  opacity: 0.5;
}

.gantt-day-btn.disabled:hover {
  background: transparent;
}
```
  </action>
  <verify>
    <automated>cd D:/Projects/gantt-lib && npx tsc --noEmit -p packages/gantt-lib/tsconfig.json 2>&1 | grep -E "error TS" | head -20</automated>
  </verify>
  <done>
    TypeScript compiles clean. DatePicker.tsx has no `parse` import, uses `initialDate`
    prop, and `handleSelect` accepts `Date` (not `Date | undefined`). ui.css contains
    `.gantt-day-btn` and `.gantt-cal-container` but no `.gantt-calendar-month-grid` or
    other old react-day-picker override classes.
  </done>
</task>

</tasks>

<verification>
After both tasks:
1. `npx tsc --noEmit -p packages/gantt-lib/tsconfig.json` — zero errors
2. Grep confirms no react-day-picker import in Calendar.tsx:
   `grep "react-day-picker" packages/gantt-lib/src/components/ui/Calendar.tsx` — no output
3. Grep confirms old classes removed from ui.css:
   `grep "gantt-calendar-month-grid" packages/gantt-lib/src/components/ui/ui.css` — no output
4. Grep confirms new classes present:
   `grep "gantt-day-btn" packages/gantt-lib/src/components/ui/ui.css` — matches found
</verification>

<success_criteria>
- Calendar.tsx renders a scrollable list of months using only React + date-fns
- DayPicker from react-day-picker is no longer used in Calendar.tsx
- DatePicker.tsx passes `initialDate` (not `defaultMonth`) and handles `(day: Date)`
- ui.css contains gantt-cal-* and gantt-day-btn styles; old gantt-calendar-* DayPicker
  overrides are removed
- TypeScript compilation passes with zero errors
</success_criteria>

<output>
After completion, create `.planning/quick/29-replace-react-day-picker-calendar-with-c/29-SUMMARY.md`
</output>
