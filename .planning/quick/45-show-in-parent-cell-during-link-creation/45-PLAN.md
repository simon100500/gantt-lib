---
phase: quick-045
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
  - packages/gantt-lib/src/components/TaskList/TaskList.css
autonomous: true
requirements: [QUICK-045]

must_haves:
  truths:
    - "When link creation mode is active, the source row's deps cell shows 'Выберите задачу' instead of chips/add button"
    - "Other rows (non-source) continue to show their normal chips and picker highlight"
    - "Exiting link creation mode restores the source row's normal deps cell content"
  artifacts:
    - path: "packages/gantt-lib/src/components/TaskList/TaskListRow.tsx"
      provides: "isSourceRow branch renders placeholder text in deps cell"
    - path: "packages/gantt-lib/src/components/TaskList/TaskList.css"
      provides: "Style for the placeholder text in the source row's deps cell"
  key_links:
    - from: "TaskListRow.tsx isSourceRow flag"
      to: "deps cell JSX branch"
      via: "conditional render"
      pattern: "isSourceRow"
---

<objective>
Display "Выберите задачу" placeholder text in the source (initiating) row's dependencies cell while link creation mode is active, replacing the normal chips/add-button content.

Purpose: Gives the user clear feedback that their row is in "pick a predecessor" mode, and that they should click another row to complete the link.
Output: Modified TaskListRow.tsx + CSS class for the placeholder.
</objective>

<execution_context>
@D:/Projects/gantt-lib/.planning/quick/45-show-in-parent-cell-during-link-creation/45-PLAN.md
</execution_context>

<context>
@D:/Projects/gantt-lib/.planning/PROJECT.md
@D:/Projects/gantt-lib/.planning/STATE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Render "Выберите задачу" in source row deps cell during picking mode</name>
  <files>packages/gantt-lib/src/components/TaskList/TaskListRow.tsx, packages/gantt-lib/src/components/TaskList/TaskList.css</files>
  <action>
In TaskListRow.tsx, inside the deps cell JSX (the `div.gantt-tl-cell-deps` block), add an early branch for `isSourceRow` BEFORE the existing `isSelectedPredecessor` check. When `isSourceRow` is true, render a single `span` with class `gantt-tl-dep-source-hint` and text "Выберите задачу" — do NOT render chips, overflow popover, or the "+" button in this branch. The click handler on the cell div stays as-is (it already guards with `!isSourceRow`).

The deps cell structure becomes:
```tsx
<div
  className="gantt-tl-cell gantt-tl-cell-deps"
  onClick={isPicking && !isSourceRow ? handlePredecessorPick : undefined}
>
  {isSourceRow ? (
    <span className="gantt-tl-dep-source-hint">Выберите задачу</span>
  ) : isSelectedPredecessor && !disableDependencyEditing ? (
    /* existing delete label button */
  ) : (
    /* existing chips + overflow + add button */
  )}
</div>
```

In TaskList.css, add a CSS rule for `.gantt-tl-dep-source-hint`:
- `font-size: 0.75rem`
- `color: #6b7280` (muted grey)
- `font-style: italic`
- `pointer-events: none`
- `white-space: nowrap`

Also update `.gantt-tl-row-picking-self .gantt-tl-cell-deps` — remove the `opacity: 0.4` rule (it's no longer needed since the cell now shows a purposeful placeholder instead of dimmed normal content). Keep `cursor: not-allowed`.
  </action>
  <verify>
    <automated>cd D:/Projects/gantt-lib && npx tsc --noEmit -p packages/gantt-lib/tsconfig.json 2>&1 | head -20</automated>
  </verify>
  <done>
    - Source row's deps cell shows only "Выберите задачу" (italic, grey) while picking mode is active
    - All other rows show normal chips/picker highlight
    - TypeScript compiles without errors
  </done>
</task>

</tasks>

<verification>
1. Open demo page with task list visible
2. Click "+" in any row's deps cell to enter link creation mode
3. Confirm: the initiating row shows "Выберите задачу" (no chips, no "+")
4. Confirm: other rows show crosshair cursor and picker highlight
5. Click another row to pick predecessor — link created, both rows return to normal content
</verification>

<success_criteria>
Source row deps cell displays "Выберите задачу" placeholder (not dimmed chips) during link creation mode. All other rows unaffected.
</success_criteria>

<output>
After completion, create `.planning/quick/45-show-in-parent-cell-during-link-creation/45-SUMMARY.md`
</output>
