---
phase: quick-77
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
  - packages/gantt-lib/src/components/TaskList/TaskList.css
autonomous: true
requirements: []
user_setup: []
must_haves:
  truths:
    - "Clicking on the current cell with 'Выберите задачу' text exits link creation mode"
    - "The cursor is 'pointer' instead of 'not-allowed' for the source row's deps cell"
    - "User can cancel link creation by clicking on the same cell that started it"
  artifacts:
    - path: "packages/gantt-lib/src/components/TaskList/TaskListRow.tsx"
      provides: "Click handler for exiting link creation mode"
      contains: "handleCancelPicking"
    - path: "packages/gantt-lib/src/components/TaskList/TaskList.css"
      provides: "Pointer cursor for source row deps cell"
      contains: ".gantt-tl-row-picking-self .gantt-tl-cell-deps"
  key_links:
    - from: ".gantt-tl-row-picking-self .gantt-tl-cell-deps"
      to: "onSetSelectingPredecessorFor(null)"
      via: "click handler"
      pattern: "onClick.*isSourceRow"
---
<objective>
Allow users to exit link creation mode by clicking on the current cell showing "Выберите задачу", and change the cursor from 'not-allowed' to 'pointer'.

Purpose: Currently when in link creation mode, the source row's deps cell shows "Выберите задачу" with a 'not-allowed' cursor, preventing users from exiting the mode intuitively. This fix makes the interaction more discoverable by allowing a click on the same cell to cancel the mode.

Output: Modified click handler for source row and updated CSS cursor style.
</objective>

<execution_context>
@C:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
@packages/gantt-lib/src/components/TaskList/TaskList.css
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add click handler to exit link creation mode and change cursor to pointer</name>
  <files>packages/gantt-lib/src/components/TaskList/TaskListRow.tsx, packages/gantt-lib/src/components/TaskList/TaskList.css</files>
  <action>
Make two changes to allow exiting link creation mode by clicking on the source cell:

1. **Add click handler for source row** in TaskListRow.tsx (around line 396-400):
Create a new callback handler `handleCancelPicking` that calls `onSetSelectingPredecessorFor?.(null)` when the user clicks on the source row's deps cell (the one showing "Выберите задачу").

```typescript
// Add after handleAddClick (around line 400)
const handleCancelPicking = useCallback((e: React.MouseEvent) => {
  e.stopPropagation();
  onSetSelectingPredecessorFor?.(null);
}, [onSetSelectingPredecessorFor]);
```

Then update the deps cell onClick (around line 537) to use this handler for the source row:

```typescript
// Before
<div
  className="gantt-tl-cell gantt-tl-cell-deps"
  onClick={isPicking && !isSourceRow ? handlePredecessorPick : undefined}
>

// After
<div
  className="gantt-tl-cell gantt-tl-cell-deps"
  onClick={isSourceRow ? handleCancelPicking : (isPicking ? handlePredecessorPick : undefined)}
>
```

2. **Change cursor from not-allowed to pointer** in TaskList.css (around line 492):
Change the cursor style for the source row's deps cell from `not-allowed` to `pointer`.

```css
/* Before */
.gantt-tl-row-picking-self .gantt-tl-cell-deps {
  cursor: not-allowed;
}

/* After */
.gantt-tl-row-picking-self .gantt-tl-cell-deps {
  cursor: pointer;
}
```

Rationale:
- Users expect clicking the same element that started a mode to also cancel it
- A 'pointer' cursor indicates the element is clickable and interactive
- The new handler prevents propagation to avoid triggering row selection
- The conditional onClick now handles three cases: source row (cancel), picking mode (select predecessor), default (no action)
</action>
  <verify>
    <automated>cd D:/Projects/gantt-lib && grep "handleCancelPicking" packages/gantt-lib/src/components/TaskList/TaskListRow.tsx && grep "cursor: pointer" packages/gantt-lib/src/components/TaskList/TaskList.css</automated>
  </verify>
  <done>
    - Clicking "Выберите задачу" cell exits link creation mode
    - Cursor is 'pointer' instead of 'not-allowed' for source row deps cell
    - Link creation mode can be cancelled intuitively
  </done>
</task>

</tasks>

<verification>
1. Open demo page with task list visible
2. Click "+" in any row's deps cell to enter link creation mode
3. Confirm: the current row's deps cell shows "Выберите задачу" text
4. Confirm: hovering over that cell shows 'pointer' cursor (not 'not-allowed')
5. Click on the "Выберите задачу" cell
6. Confirm: link creation mode exits (the text disappears, normal state restored)
7. Confirm: you can now click "+" again to re-enter link creation mode
</verification>

<success_criteria>
Users can exit link creation mode by clicking on the source cell showing "Выберите задачу", with a 'pointer' cursor indicating the interactive behavior.
</success_criteria>

<output>
After completion, create `.planning/quick/77-blocked-pointer/77-SUMMARY.md`
</output>
