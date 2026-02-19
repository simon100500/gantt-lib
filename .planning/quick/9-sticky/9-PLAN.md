---
phase: 9-sticky
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: [src/components/GanttChart/GanttChart.tsx, src/components/GanttChart/GanttChart.module.css]
autonomous: false
requirements: []
user_setup: []

must_haves:
  truths:
    - "User can scroll task rows vertically"
    - "Header (time scale) remains fixed at top during vertical scroll"
    - "Horizontal scroll remains synchronized between header and task area"
    - "Container has constrained height (not expanding to fit all tasks)"
    - "All existing drag/resize functionality still works"
  artifacts:
    - path: "src/components/GanttChart/GanttChart.tsx"
      provides: "Container with sticky header and scrollable task area"
      contains: "position: sticky or fixed header, overflow-y on task container"
    - path: "src/components/GanttChart/GanttChart.module.css"
      provides: "Styles for sticky header positioning"
      contains: ".headerScrollContainer { position: sticky; top: 0; z-index: 10 }"
  key_links:
    - from: "GanttChart.tsx"
      to: "GanttChart.module.css"
      via: "className imports"
      pattern: "import styles from"
    - from: "headerScrollContainer"
      to: "taskScrollContainer"
      via: "synchronized horizontal scrolling"
      pattern: "scrollLeft"
---

<objective>
Add vertical scrolling to the Gantt chart task rows while keeping the time scale header fixed/sticky at the top.

Purpose: Enable viewing large numbers of tasks (100+) without the chart expanding to an impractical height, while maintaining date context visibility through a fixed header.
Output: A scrollable task area with a sticky time scale header.
</objective>

<execution_context>
@C:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/components/GanttChart/GanttChart.tsx
@src/components/GanttChart/GanttChart.module.css
@src/components/TimeScaleHeader/TimeScaleHeader.tsx
@src/components/TaskRow/TaskRow.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add container height constraint and vertical scrolling</name>
  <files>src/components/GanttChart/GanttChart.tsx, src/components/GanttChart/GanttChart.module.css</files>
  <action>
    1. Add a new optional prop `containerHeight` to GanttChartProps (default: 600px)
    2. Apply the height constraint to .chartWrapper via inline style
    3. Add `overflow-y: auto` to .taskScrollContainer in CSS
    4. Keep header at top by using a flex column layout in .chartWrapper

    CSS changes:
    - .chartWrapper: add display: flex, flex-direction: column, accept height prop
    - .headerScrollContainer: remove overflow, keep as flex item
    - .taskScrollContainer: add overflow-y: auto, flex: 1 to fill remaining space

    Do NOT change horizontal scroll synchronization logic (it should continue to work).
  </action>
  <verify>
    1. Component compiles without errors
    2. With 100 tasks, verify only ~15-20 rows are visible at a time (based on 30px row height and 600px container)
    3. Vertical scrollbar appears in task area
  </verify>
  <done>
    - Gantt chart has constrained height (default 600px, configurable via prop)
    - Task area shows vertical scrollbar when tasks exceed visible area
    - Header remains at top of container
  </done>
</task>

<task type="auto">
  <name>Task 2: Make header sticky during vertical scroll</name>
  <files>src/components/GanttChart/GanttChart.module.css</files>
  <action>
    Apply sticky positioning to the header:
    - .headerScrollContainer: add position: sticky; top: 0; z-index: 10; background-color: var(--gantt-cell-background, #ffffff);
    - Ensure header has proper shadow/border at bottom for visual separation: add border-bottom: 1px solid var(--gantt-grid-line-color, #e0e0e0);

    The sticky positioning works within the scrollable parent (.taskScrollContainer's parent context).
  </action>
  <verify>
    1. Scroll task area vertically
    2. Header (month names and day numbers) stays visible at top
    3. Header doesn't scroll out of view
    4. Horizontal scroll still syncs properly
  </verify>
  <done>
    - Time scale header remains fixed at top when scrolling tasks vertically
    - Header has visual border separating it from scrolling content
    - Horizontal scrolling continues to work (header and task area scroll in sync)
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>Vertical scrolling with sticky header implementation</what-built>
  <how-to-verify>
    1. Start dev server: npm run dev
    2. Open http://localhost:3000
    3. Verify:
       - Chart has limited height (not expanding to show all 100 tasks)
       - Vertical scrollbar appears in task area
       - Scroll down - header (month/day numbers) stays visible at top
       - Scroll horizontally - header and task area scroll together
       - Drag/resize tasks still works correctly
  </how-to-verify>
  <resume-signal>Type "approved" or describe issues</resume-signal>
  <name>Task 3: Verify sticky header implementation</name>
  <files>N/A (verification checkpoint)</files>
  <action>Manual verification by user</action>
  <verify>User confirms functionality works as expected</verify>
  <done>User approved the implementation</done>
</task>

</tasks>

<verification>
- Vertical scrolling works smoothly for task rows
- Header remains visible (sticky) during vertical scroll
- Horizontal scroll synchronization is preserved
- Container height is constrained (not expanding infinitely)
- Drag/resize functionality still works correctly
- No visual artifacts when scrolling
</verification>

<success_criteria>
- User can scroll through 100+ tasks without page becoming impractically tall
- Time scale header (months and days) stays visible at all times
- Horizontal scrolling remains synchronized
- Implementation uses CSS position: sticky (no JavaScript scroll listeners needed)
</success_criteria>

<output>
After completion, create `.planning/quick/9-sticky/9-01-SUMMARY.md`
</output>
