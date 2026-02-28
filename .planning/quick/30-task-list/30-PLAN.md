---
phase: quick-30
plan: 30
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/ui/ui.css
  - packages/gantt-lib/src/components/TaskList/TaskList.css
autonomous: true
requirements: [QUICK-30]

must_haves:
  truths:
    - "Date text in task list rows is visually centered within the date cell"
    - "Clicking anywhere on the date cell opens the date picker (not just on the text)"
  artifacts:
    - path: "packages/gantt-lib/src/components/ui/ui.css"
      provides: "Centered date picker trigger button"
      contains: "justify-content: center"
    - path: "packages/gantt-lib/src/components/TaskList/TaskList.css"
      provides: "Date cell fills full clickable area"
      contains: "gantt-tl-cell-date"
  key_links:
    - from: "packages/gantt-lib/src/components/TaskList/TaskListRow.tsx"
      to: "packages/gantt-lib/src/components/ui/DatePicker.tsx"
      via: "DatePicker renders .gantt-datepicker-trigger button inside .gantt-tl-cell-date"
      pattern: "gantt-datepicker-trigger"
---

<objective>
Center date text in task list date columns and ensure the full cell area is clickable to open the date picker.

Purpose: Better visual alignment and larger click target for date cells.
Output: Updated CSS — centered date text, full-cell trigger button.
</objective>

<execution_context>
@C:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

<interfaces>
<!-- Current relevant CSS rules -->

From packages/gantt-lib/src/components/ui/ui.css (.gantt-datepicker-trigger):
```css
.gantt-datepicker-trigger {
  display: flex;
  align-items: center;
  width: 100%;
  height: 100%;
  padding: 0 8px;
  font-size: 0.85rem;
  font-family: inherit;
  color: var(--gantt-input-text);
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;       /* <-- needs to change to center */
  user-select: none;
  /* justify-content: flex-start implicitly — needs center */
}
```

From packages/gantt-lib/src/components/TaskList/TaskList.css (.gantt-tl-cell-date):
```css
.gantt-tl-cell-date {
  width: 68px;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
}
/* The cell is a flex container (.gantt-tl-cell has display: flex) */
/* The DatePicker button has width: 100% height: 100% — fills the cell */
/* But the cell has padding: 0 0.5rem from .gantt-tl-cell — shrinks trigger */
```

From packages/gantt-lib/src/components/TaskList/TaskListRow.tsx (date cell wrapper):
```tsx
<div className="gantt-tl-cell gantt-tl-cell-date" onClick={(e) => e.stopPropagation()}>
  <DatePicker value={startDateISO} onChange={handleStartDateChange} format="dd.MM.yy" portal={true} />
</div>
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Center date text and expand trigger to full cell</name>
  <files>
    packages/gantt-lib/src/components/ui/ui.css
    packages/gantt-lib/src/components/TaskList/TaskList.css
  </files>
  <action>
    Two CSS changes needed:

    1. In `packages/gantt-lib/src/components/ui/ui.css`, update `.gantt-datepicker-trigger`:
       - Change `text-align: left` to `text-align: center`
       - Add `justify-content: center` so the flex content is centered horizontally

    2. In `packages/gantt-lib/src/components/TaskList/TaskList.css`, update `.gantt-tl-cell-date`:
       - Remove padding inherited from `.gantt-tl-cell` by adding `padding: 0` — so the trigger button truly fills the full cell width and height with no gaps
       - The button already has `width: 100%; height: 100%` in `.gantt-datepicker-trigger`, but the cell's inherited `padding: 0 0.5rem` from `.gantt-tl-cell` creates dead zones on left/right where clicks miss the button. Override with `padding: 0`.

    No changes needed to TaskListRow.tsx — the wrapper div already has `onClick={(e) => e.stopPropagation()}` preventing row-level click, and the button already has `width: 100%; height: 100%`.
  </action>
  <verify>
    Run the dev server: `cd D:/Projects/gantt-lib && npm run dev`
    Open http://localhost:3000, show the task list (toggle button), and verify:
    1. Date text in start/end date cells is visually centered
    2. Clicking the left/right edges of a date cell (not just the text) opens the calendar picker
  </verify>
  <done>
    Date text is centered in both start and end date columns. The entire date cell area is a clickable target that opens the calendar.
  </done>
</task>

</tasks>

<verification>
Visual check: date columns in task list show centered text and respond to clicks anywhere in the cell.
</verification>

<success_criteria>
- `.gantt-datepicker-trigger` has `justify-content: center` and `text-align: center`
- `.gantt-tl-cell-date` overrides padding to `0` so button fills the full cell
- No layout regressions in number or name columns
</success_criteria>

<output>
After completion, create `.planning/quick/30-task-list/30-SUMMARY.md`
</output>
