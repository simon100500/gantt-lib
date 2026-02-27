---
phase: quick-028
plan: 28
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/TaskList/TaskList.tsx
  - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
  - packages/gantt-lib/src/components/TaskList/TaskList.css
autonomous: true
requirements: []

must_haves:
  truths:
    - "TaskList renders at 400px width by default"
    - "Long task names wrap to multiple lines within the name cell"
    - "Clicking a date cell opens a native date picker (input type=date)"
    - "Selecting a date from the picker saves it and closes editing"
  artifacts:
    - path: "packages/gantt-lib/src/components/TaskList/TaskList.tsx"
      provides: "taskListWidth default changed to 400"
    - path: "packages/gantt-lib/src/components/TaskList/TaskListRow.tsx"
      provides: "date cells use input[type=date], name cell wraps text"
    - path: "packages/gantt-lib/src/components/TaskList/TaskList.css"
      provides: "name cell allows text wrap, date cell sized for picker, row allows variable height"
  key_links:
    - from: "TaskListRow date cell"
      to: "onTaskChange callback"
      via: "input[type=date] onChange saving ISO date string"
      pattern: "type=\"date\""
---

<objective>
Improve the TaskList overlay with three enhancements: wider default width (400px), text wrapping
for long task names, and a native datepicker for date editing instead of plain text input.

Purpose: Better usability — more space for task names, readable multi-line names, and an ergonomic
date picker instead of typing DD.MM.YY manually.
Output: Updated TaskList.tsx (wider default), TaskListRow.tsx (datepicker + wrapping), TaskList.css
(layout adjustments for wrap and wider date column).
</objective>

<execution_context>
@C:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
</context>

<interfaces>
<!-- Key existing contracts for the executor. No codebase exploration needed. -->

From packages/gantt-lib/src/components/TaskList/TaskList.tsx:
```typescript
export interface TaskListProps {
  tasks: Task[];
  rowHeight: number;
  headerHeight: number;
  taskListWidth?: number;  // default: 300  <-- change to 400
  onTaskChange?: (task: Task) => void;
  selectedTaskId?: string;
  onTaskSelect?: (taskId: string | null) => void;
  show?: boolean;
}
```

Current CSS column widths in TaskList.css:
- .gantt-tl-cell-number: width: 40px
- .gantt-tl-cell-name: flex: 1, min-width: 0
- .gantt-tl-cell-date: width: 70px

Current task.startDate / task.endDate format: ISO string "YYYY-MM-DD"
Native input[type=date] value format: also "YYYY-MM-DD" — direct round-trip, no conversion needed.

TaskListRow currently uses:
- text input with DD.MM.YY format for dates
- formatShortDate() / parseShortDate() helpers (become unnecessary for date fields)
- parseUTCDate(task.startDate) to read dates (keep for display if needed)
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Widen default, enable text wrap, add datepicker</name>
  <files>
    packages/gantt-lib/src/components/TaskList/TaskList.tsx
    packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
    packages/gantt-lib/src/components/TaskList/TaskList.css
  </files>
  <action>
Make three coordinated changes:

**1. TaskList.tsx — change default width:**
Change `taskListWidth = 300` to `taskListWidth = 400` in the destructured props default.

**2. TaskListRow.tsx — replace date text inputs with native datepicker:**

- The `editField` state and pattern remain the same for name editing.
- For `startDate` and `endDate` fields, replace the text `<input type="text">` with `<input type="date">`.
- Native `input[type=date]` value is ISO "YYYY-MM-DD" — which matches `task.startDate` and `task.endDate` directly. Remove the DD.MM.YY formatting for date edit fields.
- In `handleCellClick`, when field is 'startDate' or 'endDate': set `editValue` directly to `task.startDate` or `task.endDate` (ISO string, e.g. "2025-03-15"). No conversion needed.
- In `handleSave`, when `editField` is 'startDate' or 'endDate': use `editValue` directly as the ISO date string (validate it's not empty). Remove the `parseShortDate` call for the date save path.
- Display value in non-edit mode: keep using `formatShortDate(parseUTCDate(task.startDate))` for the display span (DD.MM.YY visual format stays).
- The `parseShortDate` and `formatShortDate` helpers can remain in the file (still used for display formatting via `formatShortDate`). Actually `parseShortDate` is no longer needed — remove it or leave it (leave for safety, it's unused).
- Add `autoFocus` to the date input so it opens immediately on click. Add `onBlur={handleSave}` and `onKeyDown={handleKeyDown}` as before.
- For the date input `onChange`: `(e) => setEditValue(e.target.value)` — standard.
- Importantly, on mobile/desktop the date picker fires `onChange` when a date is selected. On desktop Chrome it also fires on blur. This is fine — save on blur covers both.
- Add `onClick={(e) => e.stopPropagation()}` to prevent row click from firing.

**3. TaskList.css — layout for wrap and datepicker width:**

- `.gantt-tl-cell-name` (and corresponding header cell): remove `white-space: nowrap` and `text-overflow: ellipsis` from `.gantt-tl-cell` base rule. Instead add `white-space: normal` and `word-break: break-word` specifically to `.gantt-tl-cell-name`. Also add `align-items: flex-start` and `padding-top: 4px` to `.gantt-tl-cell-name` so multi-line text starts at top.
- `.gantt-tl-cell` base: change `overflow: hidden; text-overflow: ellipsis; white-space: nowrap` to just `overflow: hidden` (remove ellipsis and nowrap from base — name cell overrides).
- `.gantt-tl-cell-date`: increase width from `70px` to `90px` to comfortably display the native date picker on desktop Chrome (which needs ~90px for the calendar icon + date).
- `.gantt-tl-row`: remove fixed `height` constraint from CSS (it's set inline via style — that's fine). Ensure `min-height` is used if needed. Actually the row `height` is set inline via `style={{ height: \`${rowHeight}px\` }}` — this will clip wrapped text. Change the inline style in TaskListRow.tsx to use `minHeight` instead of `height` so rows can expand: `style={{ minHeight: \`${rowHeight}px\` }}`.
- `.gantt-tl-cell`: add `align-items: flex-start` and `padding-top: 6px` so all cells align to top when a name cell grows taller.

**Native date input styling (avoid browser ugliness):**
Add `.gantt-tl-input-date` class for the date input:
```css
.gantt-tl-input-date {
  width: 100%;
  padding: 0.15rem 0.25rem;
  border: 1px solid #3b82f6;
  border-radius: 2px;
  font-size: 0.78rem;
  font-family: inherit;
  outline: none;
  box-sizing: border-box;
  cursor: pointer;
}
.gantt-tl-input-date:focus {
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}
```
Use `className="gantt-tl-input-date"` on the date inputs in TaskListRow.tsx (instead of `gantt-tl-input`).

Also update the matching `.gantt-tl-headerCell` CSS so the date header cells match the new 90px width: `.gantt-tl-cell-date` already applies to both data cells and header cells (check — header uses `.gantt-tl-headerCell.gantt-tl-cell-date`). In TaskList.tsx the header cells use `className="gantt-tl-headerCell gantt-tl-cell-date"` — the width from `.gantt-tl-cell-date` applies. This is correct, no separate header width rule needed.
  </action>
  <verify>
    Run the website dev server and open the task list page. Verify:
    1. TaskList is visibly wider (~400px) when using default taskListWidth.
    2. A task with a long name wraps to multiple lines in the name cell; the row expands to fit.
    3. Clicking a start/end date cell shows a native browser date picker (calendar popup).
    4. Selecting a date from the picker updates the displayed date in the cell.

    TypeScript build check:
    cd D:/Projects/gantt-lib && npm run build --workspace=packages/gantt-lib 2>&1 | tail -20
  </verify>
  <done>
    - Default taskListWidth is 400 (JSDoc comment updated to match).
    - Name column text wraps; row min-height maintained.
    - Date columns show native input[type=date] on click; value round-trips as ISO YYYY-MM-DD.
    - No TypeScript errors. Build succeeds.
  </done>
</task>

</tasks>

<verification>
TypeScript build passes:
cd D:/Projects/gantt-lib && npm run build --workspace=packages/gantt-lib

Manual verification on task-list demo page (/task-list route):
- TaskList is wider than before
- Long task names wrap instead of truncating
- Date cells open a calendar picker on click
</verification>

<success_criteria>
- taskListWidth default is 400px
- Task name cells wrap long text (word-break: break-word, white-space: normal)
- Date edit fields use input[type=date] with ISO YYYY-MM-DD value binding
- Build compiles without TypeScript errors
</success_criteria>

<output>
After completion, create `.planning/quick/28-task-list-400px-datepicker/028-SUMMARY.md`
</output>
