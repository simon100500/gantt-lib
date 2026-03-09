---
phase: quick-75
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
    - "Hovering over .gantt-tl-cell-deps in picking mode does not expand the cell beyond 90px"
    - "The cell maintains its 90px width constraint during hover state"
    - "Background color change on hover works without expanding the cell"
  artifacts:
    - path: "packages/gantt-lib/src/components/TaskList/TaskList.css"
      provides: "CSS rules for picking mode hover state"
      contains: ".gantt-tl-row-picking .gantt-tl-cell-deps:hover"
  key_links:
    - from: ".gantt-tl-row-picking .gantt-tl-cell-deps:hover"
      to: ".gantt-tl-cell-deps"
      via: "width constraint inheritance"
      pattern: "width: 90px"
---

<objective>
Fix overflow issue where .gantt-tl-cell-deps expands beyond 90px when hovering in picking mode.

Purpose: The hover state in picking mode (.gantt-tl-row-picking .gantt-tl-cell-deps:hover) causes the cell to expand beyond its 90px width constraint, breaking the layout. This needs to be fixed by ensuring the hover state respects the base width constraint.

Output: Modified CSS rule that prevents cell expansion on hover in picking mode.
</objective>

<execution_context>
@C:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/quick/72-gantt-tl-cell-deps-90px/72-SUMMARY.md
@.planning/quick/74-overflow-90px/74-PLAN.md
@packages/gantt-lib/src/components/TaskList/TaskList.css
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix overflow on hover in picking mode</name>
  <files>packages/gantt-lib/src/components/TaskList/TaskList.css</files>
  <action>
Add explicit width and overflow constraints to the picking mode hover state to prevent cell expansion beyond 90px.

The .gantt-tl-row-picking .gantt-tl-cell-deps:hover rule (around line 487) currently only changes background color. We need to explicitly constrain width and overflow to prevent expansion.

Change:
```css
/* Before */
.gantt-tl-row-picking .gantt-tl-cell-deps:hover {
  background-color: rgba(59, 130, 246, 0.15);
}

/* After */
.gantt-tl-row-picking .gantt-tl-cell-deps:hover {
  background-color: rgba(59, 130, 246, 0.15);
  width: 90px;
  max-width: 90px;
  overflow: hidden;
}
```

This ensures that:
1. The width is explicitly set to 90px on hover
2. max-width prevents any content from forcing expansion
3. overflow: hidden clips any content that might still try to expand
4. The background color change still works for visual feedback
</action>
  <verify>
    <automated>cd D:/Projects/gantt-lib && grep -A5 "\.gantt-tl-row-picking \.gantt-tl-cell-deps:hover" packages/gantt-lib/src/components/TaskList/TaskList.css | grep -E "(width: 90px|max-width: 90px|overflow: hidden)"</automated>
  </verify>
  <done>
    - Hovering over deps cell in picking mode maintains 90px width
    - No cell expansion beyond the column boundary
    - Background color change on hover still works
  </done>
</task>

</tasks>

<verification>
1. Open demo page with task list visible
2. Click "+" in any row's deps cell to enter link creation mode (picking mode)
3. Hover over the dependencies cell in other rows
4. Confirm: the cell does NOT expand beyond 90px width
5. Confirm: background color changes on hover (visual feedback works)
</verification>

<success_criteria>
Dependencies cell maintains 90px width constraint when hovering in picking mode, with no overflow or expansion.
</success_criteria>

<output>
After completion, create `.planning/quick/75-overflow-gantt-tl-cell-deps-hover-pickin/75-SUMMARY.md`
</output>
