---
phase: quick
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/TaskRow/TaskRow.tsx
  - src/components/index.ts
  - src/components/DragTooltip/index.tsx
  - src/components/DragTooltip/DragTooltip.tsx
  - src/components/DragTooltip/DragTooltip.module.css
autonomous: true
requirements: []
must_haves:
  truths:
    - "No drag tooltip appears during task drag operations"
    - "Drag functionality continues to work without tooltip"
    - "DragTooltip component is completely removed from codebase"
  artifacts:
    - path: "src/components/TaskRow/TaskRow.tsx"
      provides: "Task row rendering without DragTooltip import"
      contains: "No DragTooltip import or usage"
    - path: "src/components/index.ts"
      provides: "Component exports without DragTooltip"
      contains: "No DragTooltip export"
  key_links:
    - from: "src/components/TaskRow/TaskRow.tsx"
      to: "(removed) DragTooltip"
      via: "Remove import and conditional rendering"
      pattern: "isDragging && <DragTooltip"
---

<objective>
Remove the drag popup (DragTooltip component) that shows dates during drag operations.

Purpose: Simplify the drag interaction by removing the floating tooltip that follows the cursor
Output: Clean drag functionality without visual popup
</objective>

<execution_context>
@C:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/components/TaskRow/TaskRow.tsx
@src/components/DragTooltip/DragTooltip.tsx
@src/components/index.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Remove DragTooltip usage from TaskRow</name>
  <files>src/components/TaskRow/TaskRow.tsx</files>
  <action>
    1. Remove the DragTooltip import (line 7)
    2. Remove cursorPosition state (lines 125-126)
    3. Remove handleMouseMove callback (lines 127-131)
    4. Remove onMouseMove handler from row div (line 137)
    5. Remove the DragTooltip conditional rendering block (lines 155-162)

    This removes all tooltip-related code while preserving drag functionality (isDragging, dragMode, currentLeft, currentWidth still work).
  </action>
  <verify>grep -i "dragtooltip\|cursorposition\|handlemousemove" src/components/TaskRow/TaskRow.tsx returns no results</verify>
  <done>TaskRow.tsx has no DragTooltip imports or usage, drag functionality intact</done>
</task>

<task type="auto">
  <name>Task 2: Remove DragTooltip component files and export</name>
  <files>src/components/index.ts src/components/DragTooltip/index.tsx src/components/DragTooltip/DragTooltip.tsx src/components/DragTooltip/DragTooltip.module.css</files>
  <action>
    1. Remove DragTooltip export from src/components/index.ts (line 3)
    2. Delete src/components/DragTooltip/ directory and all its contents:
       - index.tsx
       - DragTooltip.tsx
       - DragTooltip.module.css
  </action>
  <verify>
    1. grep -i "dragtooltip" src/components/index.ts returns no results
    2. test ! -d "src/components/DragTooltip" (directory should not exist)
  </verify>
  <done>DragTooltip component completely removed from codebase</done>
</task>

</tasks>

<verification>
1. Drag a task and confirm no tooltip appears
2. Drag functionality still works (task moves/resizes)
3. No DragTooltip references remain in codebase
</verification>

<success_criteria>
- DragTooltip component and all related files deleted
- No DragTooltip imports in any files
- Drag operations work without visual popup
</success_criteria>

<output>
After completion, create `.planning/quick/1-remove-drag-popup/1-SUMMARY.md`
</output>
