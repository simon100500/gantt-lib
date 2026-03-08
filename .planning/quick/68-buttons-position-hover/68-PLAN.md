---
phase: quick-68-buttons-position-hover
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
  - packages/gantt-lib/src/components/TaskList/TaskList.tsx
  - packages/gantt-lib/src/components/TaskList/TaskList.css
autonomous: true
requirements: []
must_haves:
  truths:
    - "Delete and Insert buttons appear inside task name field on hover (not in separate column)"
    - "Action column removed from task list layout"
    - "Add dependency button appears only on row hover"
    - "All buttons accessible without breaking existing functionality"
  artifacts:
    - path: "packages/gantt-lib/src/components/TaskList/TaskListRow.tsx"
      provides: "Updated row layout with buttons in name cell"
      min_lines: 560
    - path: "packages/gantt-lib/src/components/TaskList/TaskList.tsx"
      provides: "Updated header without action column"
      min_lines: 340
    - path: "packages/gantt-lib/src/components/TaskList/TaskList.css"
      provides: "Hover-based button styling in name cell"
      min_lines: 575
  key_links:
    - from: "TaskListRow.tsx name cell"
      to: "onDelete and onInsertAfter callbacks"
      via: "Button onClick handlers"
      pattern: "onClick.*onDelete|onClick.*onInsertAfter"
    - from: "TaskList.css"
      to: "gantt-tl-name-trigger:hover"
      via: "CSS hover state revealing buttons"
      pattern: "\.gantt-tl-name-trigger:hover.*\.gantt-tl-action-btn"
---

<objective>
Refactor button positioning in task list to improve space efficiency

**Changes:**
1. Move Delete and Insert buttons from action column into task name cell (hover-reveal)
2. Remove the dedicated action column (48px saved)
3. Change Add dependency button to hover-reveal only

**Purpose:**
- Reduce horizontal space usage by eliminating action column
- Improve UI density while maintaining accessibility
- Consistent hover-based interaction pattern

**Output:**
- Cleaner task list layout with buttons contextual to their purpose
- Reduced task list width by ~48px
- All functionality preserved with improved UX
</objective>

<execution_context>
@C:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

# Current Implementation
From TaskListRow.tsx (lines 386-558):
- Name cell contains edit button trigger (lines 386-408)
- Dependencies cell has "+" button always visible (lines 503-512)
- Action panel cell has Insert and Delete buttons (lines 518-558)

From TaskList.tsx (lines 249-286):
- Header has 6 columns: №, Name, Start, End, Dependencies, Actions
- Actions column header: line 286

From TaskList.css:
- Action column: 48px wide (lines 199-214)
- Action buttons: hover-reveal pattern (lines 217-257)
- Dep add button: always visible (lines 456-476)

<interfaces>
<!-- Button callbacks from TaskListRowProps -->
onDelete?: (taskId: string) => void;
onInsertAfter?: (taskId: string, newTask: Task) => void;
onSetSelectingPredecessorFor?: (taskId: string | null) => void;
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Move action buttons into task name cell</name>
  <files>packages/gantt-lib/src/components/TaskList/TaskListRow.tsx</files>
  <action>
Update TaskListRow component to move Delete and Insert buttons from action column into name cell:

1. **In name cell (around line 386-408):**
   - Add button container after the name trigger button
   - Insert Delete button with TrashIcon
   - Insert Insert button with PlusIcon
   - Use hover-reveal pattern (opacity 0→1 on name cell hover)
   - Position buttons absolutely or inline at right edge of name cell

2. **Remove action panel cell (lines 518-558):**
   - Delete entire `<div className="gantt-tl-cell gantt-tl-cell-actions">` block
   - Keep button callbacks (onDelete, onInsertAfter) wired in new location

3. **Update dependencies cell (lines 503-512):**
   - Change "+" button from always-visible to hover-reveal
   - Add CSS class for hover-based visibility

Key constraints:
- Preserve all existing callback behavior
- Don't break edit mode (buttons hidden during editing)
- Maintain click propagation (stopPropagation on button clicks)
</action>
  <verify>
    <automated>grep -n "gantt-tl-cell-actions" packages/gantt-lib/src/components/TaskList/TaskListRow.tsx && echo "FAIL: Action cell still exists" || echo "PASS: Action cell removed"</automated>
  </verify>
  <done>Action buttons render in name cell on hover, action panel cell removed from DOM</done>
</task>

<task type="auto">
  <name>Task 2: Update CSS for button positioning and remove action column</name>
  <files>packages/gantt-lib/src/components/TaskList/TaskList.css</files>
  <action>
Update CSS to support new button layout:

1. **Remove action column styles (lines 199-257):**
   - Delete `.gantt-tl-cell-actions` rules
   - Delete `.gantt-tl-headerCell.gantt-tl-cell-actions` rules
   - Delete `.gantt-tl-action-btn` base rules (will recreate in name cell context)

2. **Update name cell to host buttons (after line 118):**
   - Add `.gantt-tl-cell-name` position: relative for button container
   - Create `.gantt-tl-name-actions` container for buttons
     - Position: absolute, right: 4px, top: 50%, transform: translateY(-50%)
     - Display: flex, gap: 4px
   - Create `.gantt-tl-name-action-btn` for individual buttons
     - Base: opacity 0, pointer-events: none
     - On hover: opacity 1, pointer-events: auto
   - Apply green/red colors to Insert/Delete variants

3. **Update dep add button (lines 456-476):**
   - Change `.gantt-tl-dep-add` from always-visible to hover-reveal
   - Add: opacity 0.6 by default, 1 on `.gantt-tl-row:hover`
   - Smooth transition for opacity

4. **Remove header action cell:**
   - TaskList.tsx line 286: delete `<div className="gantt-tl-headerCell gantt-tl-cell-actions">`
</action>
  <verify>
    <automated>grep -n "gantt-tl-cell-actions" packages/gantt-lib/src/components/TaskList/TaskList.css && echo "FAIL: Action column CSS still exists" || echo "PASS: Action column CSS removed"</automated>
  </verify>
  <done>CSS defines hover-reveal buttons in name cell, action column styles removed</done>
</task>

<task type="auto">
  <name>Task 3: Update TaskList header and remove action column reference</name>
  <files>packages/gantt-lib/src/components/TaskList/TaskList.tsx</files>
  <action>
Update TaskList component to remove action column from header:

1. **Remove action header cell (line 286):**
   - Delete: `<div className="gantt-tl-headerCell gantt-tl-cell-actions" aria-label="Действия"></div>`

2. **Update default taskListWidth (line 60):**
   - Change from 520 to 472 (520 - 48 = 472)
   - This accounts for removed 48px action column

3. **Verify data rows still work:**
   - TaskListRow no longer receives action cell props
   - All callbacks already wired in Task 1, no changes needed
</action>
  <verify>
    <automated>grep -n "gantt-tl-cell-actions" packages/gantt-lib/src/components/TaskList/TaskList.tsx && echo "FAIL: Action column reference still exists" || echo "PASS: Action column removed from TaskList"</automated>
  </verify>
  <done>Header renders 5 columns instead of 6, taskListWidth reduced by 48px</done>
</task>

</tasks>

<verification>
## Overall Verification

1. **Visual check:**
   - Action column no longer visible in task list
   - Delete and Insert buttons appear on right side of task name on hover
   - Add dependency button appears in dependencies cell on row hover

2. **Functional check:**
   - Click Delete button → task removed
   - Click Insert button → new task added after current row
   - Click Add dependency button → picker mode activates
   - All hover states work smoothly

3. **Layout check:**
   - Task list width reduced by 48px
   - No horizontal scrollbar appearing
   - Name cell has enough space for text + buttons
</verification>

<success_criteria>
- [ ] Action column completely removed (DOM, CSS, header)
- [ ] Delete and Insert buttons functional in name cell
- [ ] Buttons reveal on hover, hide when not hovering
- [ ] Add dependency button hover-reveal only
- [ ] Task list width reduced to 472px default
- [ ] All existing callbacks work without modification
- [ ] No visual glitches or layout shifts
</success_criteria>

<output>
After completion, create `.planning/quick/68-buttons-position-hover/68-SUMMARY.md`
</output>
