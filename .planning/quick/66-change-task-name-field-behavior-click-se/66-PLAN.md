---
phase: quick-66
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
    - "Single click on task name selects the row (like № cell)"
    - "Double click on task name enters edit mode"
    - "Typing while name is selected enters edit mode"
    - "No navigate button exists (redundant with new click-to-select behavior)"
  artifacts:
    - path: "packages/gantt-lib/src/components/TaskList/TaskListRow.tsx"
      provides: "Task name click/double-click handlers, keyboard edit trigger"
      contains: "handleNameClick, handleNameDoubleClick, handleRowKeyDown"
    - path: "packages/gantt-lib/src/components/TaskList/TaskList.css"
      provides: "Visual styling for selectable task name"
      contains: ".gantt-tl-name-trigger cursor style"
  key_links:
    - from: "handleNameClick"
      to: "onRowClick"
      via: "direct callback invocation"
      pattern: "onRowClick\\(task\\.id\\)"
    - from: "handleNameDoubleClick"
      to: "setEditingName(true)"
      via: "state update"
      pattern: "setEditingName\\(true\\)"
    - from: "handleRowKeyDown"
      to: "setEditingName(true)"
      via: "keyboard event detection"
      pattern: "!editingName && .*key.*length===1 && setEditingName\\(true\\)"
---

<objective>
Change task name field interaction: click selects row, double-click or typing enters edit mode, remove navigate button

Purpose: Improve UX by making task name consistent with other clickable elements (single click selects), while keeping edit accessible via double-click or keyboard input. The navigate button becomes redundant since single click now both selects the row AND highlights the task bar.

Output: Updated TaskListRow component with click-to-select, double-click-to-edit behavior, and no navigate button
</objective>

<execution_context>
@D:/Projects/gantt-lib/.planning/quick/66-change-task-name-field-behavior-click-se/66-PLAN.md
</execution_context>

<context>
@D:/Projects/gantt-lib/packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
@D:/Projects/gantt-lib/packages/gantt-lib/src/components/TaskList/TaskList.css

## Current Behavior Analysis

From TaskListRow.tsx (lines 267-272):
```typescript
const handleNameClick = useCallback((e: React.MouseEvent) => {
  if (disableTaskNameEditing) return;
  e.stopPropagation();
  setNameValue(task.name);
  setEditingName(true);
}, [task.name, disableTaskNameEditing]);
```

Current: Single click immediately enters edit mode via `setEditingName(true)`.

From TaskList.css (lines 141-163):
```css
.gantt-tl-name-trigger {
  cursor: text;
  /* ... */
}

.gantt-tl-name-trigger:hover {
  background-color: rgba(59, 130, 246, 0.1);
}
```

Current: Text cursor and hover background indicate editable field.

## № Cell Behavior (Reference Pattern)

From TaskListRow.tsx (lines 315-319):
```typescript
const handleNumberClick = useCallback((e: React.MouseEvent) => {
  e.stopPropagation();
  onRowClick?.(task.id);
  onScrollToTask?.(task.id);
}, [task.id, onRowClick, onScrollToTask]);
```

Pattern: Single click calls `onRowClick()` to select row and `onScrollToTask()` to center task bar.

## Navigate Button (To Remove)

From TaskListRow.tsx (lines 360-371):
```typescript
<div
  className="gantt-tl-cell gantt-tl-cell-number"
  onClick={handleNumberClick}
  title="Перейти к работе"
>
  <span className="gantt-tl-num-label">{rowIndex + 1}</span>
  <svg className="gantt-tl-num-icon" xmlns="...">...</svg>
</div>
```

The № cell currently shows row number with hover-to-reveal navigate icon. This navigate functionality is redundant once single click on task name also selects the row.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Change task name click behavior from edit to select</name>
  <files>packages/gantt-lib/src/components/TaskList/TaskListRow.tsx</files>
  <action>
    Modify TaskListRow.tsx to implement click-to-select, double-click-to-edit behavior:

    1. **Update handleNameClick** (line 267):
       - Remove `setNameValue(task.name)` and `setEditingName(true)`
       - Add `onRowClick?.(task.id)` to select the row (like № cell)
       - Keep `disableTaskNameEditing` check and `e.stopPropagation()`

    2. **Add handleNameDoubleClick callback**:
       ```typescript
       const handleNameDoubleClick = useCallback((e: React.MouseEvent) => {
         if (disableTaskNameEditing) return;
         e.stopPropagation();
         setNameValue(task.name);
         setEditingName(true);
       }, [task.name, disableTaskNameEditing]);
       ```

    3. **Add handleRowKeyDown callback** (for keyboard edit trigger):
       ```typescript
       const handleRowKeyDown = useCallback((e: React.KeyboardEvent) => {
         // If not editing and a printable key is pressed, start editing
         if (!editingName && !disableTaskNameEditing && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
           e.preventDefault();
           setNameValue('');
           setEditingName(true);
           // Input will be focused by existing useEffect (line 262)
         }
       }, [editingName, disableTaskNameEditing]);
       ```

    4. **Update name trigger button** (line 387-394):
       - Change `onClick={handleNameClick}` to single-click select
       - Add `onDoubleClick={handleNameDoubleClick}` for edit mode
       - Add `onKeyDown={handleRowKeyDown}` to the row div (line 349) to capture keyboard input when row is selected

    5. **Update row div** (line 349-357):
       - Add `onKeyDown={handleRowKeyDown}` to enable keyboard edit trigger
       - Add `tabIndex={isSelected ? 0 : -1}` to make selected row focusable for keyboard events

    WHY: This pattern matches standard UI conventions - single click selects, double-click edits, and typing while selected edits. The navigate button becomes redundant since single click now both selects AND scrolls to task.
  </action>
  <verify>
    <automated>npm test -- --testPathPattern=TaskList 2>&1 | head -50</automated>
  </verify>
  <done>Single click on task name selects row and scrolls grid, double-click enters edit mode, typing while selected enters edit mode</done>
</task>

<task type="auto">
  <name>Task 2: Update CSS and remove navigate icon</name>
  <files>packages/gantt-lib/src/components/TaskList/TaskList.css</files>
  <action>
    Update TaskList.css to reflect new clickable-selectable behavior:

    1. **Update .gantt-tl-name-trigger cursor** (line 156):
       - Change from `cursor: text` to `cursor: pointer`
       - WHY: Indicates clickable element (selects row), not text editor

    2. **Remove navigate icon styles** (lines 102-113):
       - Remove `.gantt-tl-num-icon` display:none on default
       - Remove `.gantt-tl-cell-number:hover .gantt-tl-num-label` display:none
       - Remove `.gantt-tl-cell-number:hover .gantt-tl-num-icon` display:block
       - WHY: Navigate functionality is now redundant - single click on task name already selects and scrolls

    3. **Update .gantt-tl-cell-number** (line 95-100):
       - Remove `title="Перейти к работе"` from the component (TaskListRow.tsx line 363)
       - Keep cursor: pointer and click functionality (still useful for quick scroll)
       - WHY: Number cell still useful for visual reference and quick scroll, but no longer the primary way to select

    4. **Optional: Add visual feedback for double-click**:
       - Consider adding `.gantt-tl-name-trigger:active` style for tactile feedback
       - WHY: Helps users discover double-click interaction

    The № cell will now show only the row number (no hover-to-reveal icon), serving as a visual reference and secondary scroll target.
  </action>
  <verify>
    <automated>cd packages/gantt-lib && npm run build 2>&1 | grep -E "(error|warning|success)" | head -20</automated>
  </verify>
  <done>Task name shows pointer cursor on hover, № cell shows only number without navigate icon, visual feedback indicates clickable element</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
    Task name field with new interaction model:
    - Single click → selects row (highlights row, centers task bar in grid)
    - Double click → enters edit mode (shows input field)
    - Typing while selected → enters edit mode (clears field, accepts typing)
    - № cell shows only number (no navigate icon on hover)
  </what-built>
  <how-to-verify>
    1. Start dev server: `cd packages/website && npm run dev`
    2. Open http://localhost:3000 in browser
    3. Click on a task name → row should highlight, task bar should center in grid
    4. Double-click on a task name → input field should appear with current name
    5. Click to select a row, then type any letter → input field should appear, ready for typing
    6. Hover over № cell → should show only the number (no arrow icon)
    7. Test with locked task (disableTaskNameEditing=true) → should not enter edit mode on double-click or typing
  </how-to-verify>
  <resume-signal>Type "approved" or describe issues</resume-signal>
</task>

</tasks>

<verification>
Manual verification checklist:
- [ ] Single click on task name selects row
- [ ] Single click also scrolls grid to center task bar
- [ ] Double click on task name enters edit mode
- [ ] Typing while row selected enters edit mode
- [ ] Enter saves edit, Escape cancels edit
- [ ] № cell shows only number (no hover icon)
- [ ] Locked tasks cannot be edited (double-click/typing does nothing)
- [ ] Edit mode works with existing keyboard shortcuts (Enter/Escape)
</verification>

<success_criteria>
Task name field follows standard UI conventions:
- Single click selects (consistent with other cells)
- Double click or typing enters edit mode
- No redundant navigate button (cleaner UI)
- All existing functionality preserved (save, cancel, validation)
</success_criteria>

<output>
After completion, create `.planning/quick/66-change-task-name-field-behavior-click-se/66-01-SUMMARY.md`
</output>
