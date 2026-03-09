---
phase: quick-76
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/TaskList/TaskList.css
autonomous: true
requirements: []
user_setup: []
must_haves:
  truths:
    - "Name column uses flex-grow to fill available space instead of fixed min-width"
    - "Dependencies column maintains 90px width constraint"
    - "Layout works correctly with overlay width 472px (40 + name + 68 + 68 + 90 = 472)"
  artifacts:
    - path: "packages/gantt-lib/src/components/TaskList/TaskList.css"
      provides: "CSS rules for flexible column layout"
      contains: ".gantt-tl-cell-name"
  key_links:
    - from: ".gantt-tl-cell-name"
      to: ".gantt-tl-cell-deps"
      via: "flex layout"
      pattern: "flex: 1"
---

<objective>
Fix column layout by reducing name column min-width from 250px to 150px and removing width constraints from picking mode hover state.

Purpose: With overlay width 472px, the name column has 234px available (472 - 40 - 68 - 68 - 90). The current min-width of 250px causes layout overflow. Additionally, the width/max-width constraints added in quick-75 for picking mode hover are redundant and should be removed.

Output: Modified CSS with flexible name column using flex-grow and reduced min-width.
</objective>

<execution_context>
@C:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/quick/72-gantt-tl-cell-deps-90px/72-SUMMARY.md
@.planning/quick/75-overflow-gantt-tl-cell-deps-hover-pickin/75-PLAN.md
@packages/gantt-lib/src/components/TaskList/TaskList.tsx
@packages/gantt-lib/src/components/TaskList/TaskList.css
</context>

<tasks>

<task type="auto">
  <name>Task 1: Reduce name column min-width and remove redundant width constraints</name>
  <files>packages/gantt-lib/src/components/TaskList/TaskList.css</files>
  <action>
Make two changes to fix the column layout:

1. **Reduce name column min-width** (around line 112):
Change `min-width: 250px;` to `min-width: 150px;` in `.gantt-tl-cell-name`. This allows the column to fit within the available 234px while maintaining a reasonable minimum width.

```css
/* Before */
.gantt-tl-cell-name {
  flex: 1;
  min-width: 250px;
  ...
}

/* After */
.gantt-tl-cell-name {
  flex: 1;
  min-width: 150px;
  ...
}
```

2. **Remove redundant width constraints from picking mode hover** (around line 487):
Remove the `width`, `max-width`, and `overflow` properties from `.gantt-tl-row-picking .gantt-tl-cell-deps:hover`. These were added in quick-75 but are redundant since the base `.gantt-tl-cell-deps` already has `width: 90px; flex-shrink: 0; overflow: hidden;`.

```css
/* Before */
.gantt-tl-row-picking .gantt-tl-cell-deps:hover {
  background-color: rgba(59, 130, 246, 0.15);
  width: 90px;
  max-width: 90px;
  overflow: hidden;
}

/* After */
.gantt-tl-row-picking .gantt-tl-cell-deps:hover {
  background-color: rgba(59, 130, 246, 0.15);
}
```

Rationale:
- The name column will use `flex: 1` to grow and fill available space
- With min-width 150px, it can fit within the 234px available space
- The picking mode hover inherits width constraints from base `.gantt-tl-cell-deps` rule
- Background color change on hover still works for visual feedback
</action>
  <verify>
    <automated>cd D:/Projects/gantt-lib && grep "min-width: 150px" packages/gantt-lib/src/components/TaskList/TaskList.css && grep -A2 "\.gantt-tl-row-picking \.gantt-tl-cell-deps:hover" packages/gantt-lib/src/components/TaskList/TaskList.css | grep -v "width:" | grep -v "max-width:" | grep -v "overflow:"</automated>
  </verify>
  <done>
    - Name column min-width reduced to 150px
    - Name column uses flex-grow to fill available space
    - Dependencies column maintains 90px width
    - Picking mode hover shows only background change (no redundant width constraints)
  </done>
</task>

</tasks>

<verification>
1. Open demo page with task list visible
2. Confirm: the name column takes available space without overflowing
3. Confirm: dependencies column maintains exactly 90px width
4. Click "+" in any row's deps cell to enter link creation mode
5. Hover over dependencies cell in other rows
6. Confirm: background color changes but cell doesn't expand
</verification>

<success_criteria>
Column layout works correctly with overlay width 472px: name column flexes to fill space, dependencies column is fixed at 90px, no overflow occurs.
</success_criteria>

<output>
After completion, create `.planning/quick/76-90px-flex-grow/76-SUMMARY.md`
</output>
