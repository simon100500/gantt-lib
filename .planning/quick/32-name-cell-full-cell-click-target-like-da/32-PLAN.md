---
phase: quick-32
plan: 32
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
  - packages/gantt-lib/src/components/TaskList/TaskList.css
autonomous: true
requirements: [QUICK-32]

must_haves:
  truths:
    - "Clicking anywhere in the name cell (not just on the text) enters edit mode"
    - "Clicking outside the name input (anywhere else on page) saves the edited name"
    - "The name cell has no dead-click zones at top/bottom/left/right padding areas"
  artifacts:
    - path: "packages/gantt-lib/src/components/TaskList/TaskListRow.tsx"
      provides: "Full-cell button trigger for name edit, onBlur save confirmed"
      contains: "gantt-tl-name-trigger"
    - path: "packages/gantt-lib/src/components/TaskList/TaskList.css"
      provides: "Name cell zero padding so button fills entire cell"
      contains: "gantt-tl-name-trigger"
  key_links:
    - from: "packages/gantt-lib/src/components/TaskList/TaskListRow.tsx"
      to: "packages/gantt-lib/src/components/TaskList/TaskList.css"
      via: ".gantt-tl-name-trigger button fills .gantt-tl-cell-name with padding: 0"
      pattern: "gantt-tl-name-trigger"
    - from: "Input onBlur"
      to: "handleNameSave"
      via: "onBlur prop already set — clicking outside input fires blur which saves name"
      pattern: "onBlur.*handleNameSave"
---

<objective>
Make the name cell a full-cell click target (matching the date cell pattern from quick-30), and confirm that clicking outside the input saves the task name via onBlur.

Purpose: Larger click target reduces missed clicks; consistent behavior with date cells; onBlur-save mirrors standard spreadsheet UX.
Output: Updated TaskListRow.tsx and TaskList.css — name cell button fills full cell, outside click saves.
</objective>

<execution_context>
@C:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

<interfaces>
<!-- Current name cell implementation in TaskListRow.tsx -->

```tsx
{/* Name column — styled Input overlay on edit */}
<div className="gantt-tl-cell gantt-tl-cell-name">
  {editingName && (
    <Input
      ref={nameInputRef}
      type="text"
      value={nameValue}
      onChange={(e) => setNameValue(e.target.value)}
      onBlur={handleNameSave}           // <-- already present: blur saves
      onKeyDown={handleNameKeyDown}
      className="gantt-tl-name-input"
      onClick={(e) => e.stopPropagation()}
    />
  )}
  <span
    className="gantt-tl-cellContent"
    onClick={handleNameClick}            // <-- only the span fires edit mode
    style={editingName ? { visibility: 'hidden', pointerEvents: 'none' } : undefined}
  >
    {task.name}
  </span>
</div>
```

Current CSS (TaskList.css):
```css
.gantt-tl-cell {
  display: flex;
  align-items: center;
  padding: 0 0.5rem;    /* <-- padding creates dead zones */
  ...
}

.gantt-tl-cell-name {
  flex: 1;
  min-width: 0;
  position: relative;
  overflow: visible;
  align-items: center;
  padding-top: 2px;
  padding-bottom: 2px;
}

.gantt-tl-cellContent {
  width: 100%;
  cursor: text;
  user-select: none;
  white-space: normal;
  word-break: break-word;
}
```

Pattern from quick-30 (date cell — working full-cell trigger):
```css
/* Date cell removes padding so button fills cell edge-to-edge */
.gantt-tl-cell-date {
  width: 68px;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
  padding: 0;   /* overrides .gantt-tl-cell padding */
}

/* DatePicker trigger button: width:100%; height:100% fills the padded cell */
.gantt-datepicker-trigger {
  display: flex;
  align-items: center;
  width: 100%;
  height: 100%;
  ...
}
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Replace span with full-cell button trigger and fix CSS padding</name>
  <files>
    packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
    packages/gantt-lib/src/components/TaskList/TaskList.css
  </files>
  <action>
    Follow the same pattern as quick-30's date cell full-cell trigger.

    **In TaskListRow.tsx — name cell:**

    Replace the `<span className="gantt-tl-cellContent" onClick={handleNameClick} ...>` with a
    `<button className="gantt-tl-name-trigger" onClick={handleNameClick} ...>` that covers
    100% width and height of the cell. The button should:
    - `type="button"` to prevent form submission
    - `onClick={handleNameClick}` — same handler as before
    - `style={editingName ? { visibility: 'hidden', pointerEvents: 'none' } : undefined}` — same hide-when-editing pattern
    - Display the task name as text content

    The `Input` overlay keeps `onBlur={handleNameSave}` (already present — clicking outside the
    input fires blur which saves the name, no changes needed to save logic).

    The `Input` keeps `onClick={(e) => e.stopPropagation()}` so clicking inside the input
    doesn't bubble up to the row or the cell wrapper.

    Remove `stopPropagation` from the name cell `<div>` wrapper if any (there is none currently —
    leave the div as-is, just change the inner span to button).

    **In TaskList.css:**

    1. Override padding on `.gantt-tl-cell-name` to remove left/right padding so the button
       can fill edge-to-edge:
       ```css
       .gantt-tl-cell-name {
         flex: 1;
         min-width: 0;
         position: relative;
         overflow: visible;
         align-items: center;
         padding: 0;   /* remove all padding so button fills full cell */
       }
       ```

    2. Add `.gantt-tl-name-trigger` rule — full-cell transparent button:
       ```css
       .gantt-tl-name-trigger {
         display: flex;
         align-items: center;
         width: 100%;
         height: 100%;
         padding: 4px 0.5rem;   /* restore visual padding inside the button */
         font-size: 0.85rem;
         font-family: inherit;
         color: #374151;
         background: transparent;
         border: none;
         cursor: text;
         text-align: left;
         user-select: none;
         white-space: normal;
         word-break: break-word;
         box-sizing: border-box;
         min-height: 100%;
       }
       ```

    3. Add hover style for `.gantt-tl-name-trigger`:
       ```css
       .gantt-tl-name-trigger:hover {
         background-color: rgba(59, 130, 246, 0.1);
       }
       ```

    4. Remove or repurpose `.gantt-tl-cellContent` and `.gantt-tl-cellContent:hover` rules
       (they are no longer used after replacing span with button). Delete them to keep CSS clean.

    **onBlur save — no changes needed:**
    The `Input` already has `onBlur={handleNameSave}`. When the user clicks outside the input
    anywhere (another cell, the gantt chart, empty space), the input loses focus, `onBlur` fires,
    and `handleNameSave` is called. This is correct standard browser behavior — no extra logic needed.
    Just confirm the existing `onBlur` is preserved (it is).
  </action>
  <verify>
    Run `cd D:/Projects/gantt-lib && npm run dev` and open http://localhost:3000.
    Show the task list and verify:
    1. Clicking on the empty left/right margins of a name cell (not just the text) enters edit mode
    2. Clicking on the top/bottom margins of a name cell enters edit mode
    3. After typing in the name input, clicking on the gantt chart area saves the name (onBlur)
    4. After typing, clicking another row's name cell saves the previous name (onBlur before new edit)
    5. Enter key also saves (existing behavior preserved)
    6. Escape cancels without saving (existing behavior preserved)
    7. No visual regressions in name column text rendering or row height
  </verify>
  <done>
    Clicking anywhere within the name cell's full rectangular area (including empty padding zones)
    activates edit mode. Clicking outside the active input field saves the task name.
    No visual regressions. Behavior mirrors the date cell pattern from quick-30.
  </done>
</task>

</tasks>

<verification>
Visual check: name column cells in task list respond to clicks anywhere in the cell, not just on text.
Functional check: clicking outside an active name input (on gantt, other rows, empty space) saves the name.
</verification>

<success_criteria>
- `.gantt-tl-name-trigger` button exists with `width: 100%; height: 100%` and proper padding
- `.gantt-tl-cell-name` has `padding: 0` (visual padding moved into the button)
- `Input onBlur={handleNameSave}` preserved — outside click saves
- No dead-click zones in the name cell
- Name text wrapping and row height unchanged
</success_criteria>

<output>
After completion, create `.planning/quick/32-name-cell-full-cell-click-target-like-da/32-SUMMARY.md`
</output>
