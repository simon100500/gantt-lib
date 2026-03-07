---
phase: quick-59-hover
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/TaskRow/TaskRow.tsx
  - packages/gantt-lib/src/components/TaskRow/TaskRow.css
autonomous: true
requirements: []
user_setup: []

must_haves:
  truths:
    - "Resize handles are invisible by default"
    - "Resize handles appear on task bar hover"
    - "Resize handles disappear when hover ends"
    - "The 20px resize interaction zone still works when handles are invisible"
    - "Cursor changes to ew-resize when hovering over the 20px edge zone"
  artifacts:
    - path: "packages/gantt-lib/src/components/TaskRow/TaskRow.css"
      provides: "Hover-based resize handle visibility styles"
      contains: ".gantt-tr-resizeHandle { opacity: 0 } .gantt-tr-taskBar:hover .gantt-tr-resizeHandle { opacity: 1 }"
    - path: "packages/gantt-lib/src/components/TaskRow/TaskRow.tsx"
      provides: "Task bar with hover state for resize handles"
      contains: "onMouseEnter/onMouseLeave handlers"
  key_links:
    - from: "TaskRow.tsx"
      to: "TaskRow.css"
      via: "CSS hover selector (.gantt-tr-taskBar:hover .gantt-tr-resizeHandle)"
      pattern: ".gantt-tr-taskBar:hover"
    - from: "useTaskDrag hook"
      to: "20px edge zone"
      via: "edgeZoneWidth: 20 prop"
      pattern: "edgeZoneWidth: 20"
---

<objective>
Add hover-based visibility for resize handles while maintaining the current 20px interaction zone.

Purpose: Improve visual cleanliness by hiding resize handles unless user interacts with the task bar, while keeping the same generous 20px hit zone for easy resizing.

Output: Resize handles that appear on hover with smooth transition, invisible by default, 20px interaction zone preserved.
</objective>

<execution_context>
@C:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md

# Current implementation
From packages/gantt-lib/src/components/TaskRow/TaskRow.tsx:
- edgeZoneWidth: 20 (line 196) - 20px resize zone at edges
- Resize handles rendered at lines 260, 269: `<div className="gantt-tr-resizeHandle gantt-tr-resizeHandleLeft" />`

From packages/gantt-lib/src/components/TaskRow/TaskRow.css:
- .gantt-tr-resizeHandle has width: 8px, background-color: rgba(0, 0, 0, 0.1) (lines 91-111)
- Handles are always visible with 10% opacity background

# Key requirement
User wants handles to appear ONLY on hover, but keep the 20px interaction zone working even when handles are invisible.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add hover-based visibility to resize handles</name>
  <files>packages/gantt-lib/src/components/TaskRow/TaskRow.css</files>
  <action>
    Modify .gantt-tr-resizeHandle styles:
    1. Add opacity: 0 to base .gantt-tr-resizeHandle rule (handles invisible by default)
    2. Add transition: opacity 0.15s ease to .gantt-tr-resizeHandle (smooth fade in/out)
    3. Add new rule: .gantt-tr-taskBar:hover .gantt-tr-resizeHandle { opacity: 1 } (show handles on hover)

    Keep all existing properties (width: 8px, height: 100%, cursor: ew-resize, z-index: 10, etc.)

    Important: The 20px edgeZoneWidth in useTaskDrag hook already makes the entire 20px edge zone interactive for cursor changes and drag initiation. The CSS opacity change only affects visual visibility, not interaction.
  </action>
  <verify>
    <automated>grep -A 3 "\.gantt-tr-resizeHandle" packages/gantt-lib/src/components/TaskRow/TaskRow.css | grep -E "(opacity|transition|hover)"</automated>
  </verify>
  <done>
    Resize handles are invisible by default (opacity: 0), fade in smoothly on task bar hover (transition: opacity 0.15s), and the 20px interaction zone still works for cursor changes and drag initiation.
  </done>
</task>

</tasks>

<verification>
1. Open the Gantt chart demo page
2. Hover over a task bar
3. Verify resize handles appear at left and right edges with smooth fade-in
4. Move mouse away from task bar
5. Verify resize handles fade out smoothly
6. Test that cursor changes to ew-resize when hovering near edges (even when handles are invisible)
7. Test that resizing still works by clicking near the edge (within 20px zone)
</verification>

<success_criteria>
- Resize handles are invisible by default
- Handles appear with smooth transition on task bar hover
- Handles disappear when mouse leaves task bar
- 20px edge zone still works for cursor changes and drag initiation
- No functional changes to drag/resize behavior
</success_criteria>

<output>
After completion, create `.planning/quick/59-hover/59-01-SUMMARY.md`
</output>
