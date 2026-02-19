---
phase: quick-2
plan: 2
type: execute
wave: 1
depends_on: []
files_modified: [src/components/TaskRow/TaskRow.module.css, src/components/TaskRow/TaskRow.tsx, src/hooks/useTaskDrag.ts]
autonomous: false
requirements: []
user_setup: []

must_haves:
  truths:
    - "Resize handles are visually larger and easier to see on task bars"
    - "Cursor activation zones are larger, making resize easier to trigger"
    - "Resize cursor (ew-resize) appears consistently over the activation zones"
    - "Task bar text remains readable and not obscured by larger handles"
  artifacts:
    - path: "src/components/TaskRow/TaskRow.module.css"
      provides: "Visual styling for resize handles"
      contains: ".resizeHandle { width: 6px; }"
    - path: "src/components/TaskRow/TaskRow.tsx"
      provides: "Component configuration for activation zone"
      contains: "edgeZoneWidth: 20"
    - path: "src/hooks/useTaskDrag.ts"
      provides: "Drag hook with edge zone parameter"
      contains: "edgeZoneWidth?: number"
  key_links:
    - from: "src/components/TaskRow/TaskRow.tsx"
      to: "src/hooks/useTaskDrag"
      via: "edgeZoneWidth prop"
      pattern: "edgeZoneWidth:\\s*20"
---

<objective>
Increase resize handle size for task bars: both visual appearance and cursor activation zones.

Purpose: Make task bar resizing more discoverable and easier to use by providing larger visible handles and larger mouse activation areas.

Output: Task bars with 6px visible handles (up from 2px) and 20px activation zones (up from 12px).
</objective>

<execution_context>
@D:/Projects/gantt-lib/.planning/get-shit-done/workflows/execute-plan.md
@D:/Projects/gantt-lib/.planning/get-shit-done/templates/summary.md
</execution_context>

<context>
@D:/Projects/gantt-lib/.planning/PROJECT.md
@D:/Projects/gantt-lib/.planning/STATE.md

# Current implementation
@D:/Projects/gantt-lib/src/components/TaskRow/TaskRow.tsx
@D:/Projects/gantt-lib/src/components/TaskRow/TaskRow.module.css
@D:/Projects/gantt-lib/src/hooks/useTaskDrag.ts
@D:/Projects/gantt-lib/src/utils/geometry.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Increase visual resize handle width</name>
  <files>src/components/TaskRow/TaskRow.module.css</files>
  <action>
    Update .resizeHandle CSS class:
    - Change width from 2px to 6px (triples visual size for better visibility)
    - Keep height: 100% (full height of task bar)
    - Keep background-color: rgba(255, 255, 255, 0.4) (semi-transparent white)
    - Keep position: absolute with top: 0
    - Keep cursor: ew-resize

    Do NOT modify:
    - .resizeHandleLeft (left: 0)
    - .resizeHandleRight (right: 0)
    - Any other CSS classes
  </action>
  <verify>Open src/components/TaskRow/TaskRow.module.css and confirm .resizeHandle has width: 6px</verify>
  <done>.resizeHandle width is 6px, handles are visually larger and easier to see</done>
</task>

<task type="auto">
  <name>Task 2: Increase cursor activation zone width</name>
  <files>src/components/TaskRow/TaskRow.tsx</files>
  <action>
    Update edgeZoneWidth prop passed to useTaskDrag hook:
    - Change from edgeZoneWidth: 12 to edgeZoneWidth: 20
    - This increases the cursor activation zone from 12px to 20px from each edge

    Do NOT modify:
    - Any other props passed to useTaskDrag
    - Component structure or JSX
    - Any other values in the component
  </action>
  <verify>Open src/components/TaskRow/TaskRow.tsx and confirm useTaskDrag call has edgeZoneWidth: 20</verify>
  <done>Activation zone is 20px from edges, making resize easier to trigger</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>Increased resize handle visual size (2px to 6px) and cursor activation zone (12px to 20px)</what-built>
  <how-to-verify>
    1. Start the dev server: npm run dev
    2. Open http://localhost:3000
    3. Move cursor over task bar edges (left and right sides)
    4. Verify:
       - Cursor changes to ew-resize when ~20px from edge
       - Visible handle (white bar) appears larger and more visible
       - Task text remains readable and not obscured
  </how-to-verify>
  <resume-signal>Type "approved" or describe issues</resume-signal>
</task>

</tasks>

<verification>
- Resize handles are 6px wide (visible white bars on task bar edges)
- Cursor activation zone is 20px from edges (ew-resize cursor appears earlier)
- Task bar text remains readable
- No layout or spacing issues introduced
</verification>

<success_criteria>
- Task bars have clearly visible resize handles
- Resize interaction triggers reliably with larger activation zone
- User feedback confirms improved usability
</success_criteria>

<output>
After completion, create `.planning/quick/2-increase-resize-handles/2-SUMMARY.md`
</output>
