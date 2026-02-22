---
phase: quick-021
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx
  - packages/gantt-lib/src/components/DependencyLines/DependencyLines.css
autonomous: false
requirements: []
user_setup: []

must_haves:
  truths:
    - "User can see lag number displayed on dependency connection lines when lag != 0"
    - "Lag number is positioned next to the arrow, under the horizontal line segment"
    - "Lag number is hidden when lag = 0 (default, no visual clutter)"
    - "Lag number displays integer values (positive and negative)"
    - "Lag label styling is consistent with existing dependency line styling"
  artifacts:
    - path: "packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx"
      provides: "Lag label rendering with SVG text elements"
      contains: "lag !== 0 conditional rendering"
    - path: "packages/gantt-lib/src/components/DependencyLines/DependencyLines.css"
      provides: "Lag label styling"
      contains: ".gantt-dependency-lag-label class"
  key_links:
    - from: "DependencyLines.tsx line rendering loop"
      to: "SVG text element for lag label"
      via: "edge.lag value from getAllDependencyEdges"
      pattern: "edge.lag !== 0"
    - from: "Lag label positioning"
      to: "Arrow position"
      via: "Calculated from horizontal line segment midpoint"
      pattern: "text-anchor: middle"
---

<objective>
Add lag number display to dependency connection lines

Show small integer lag values (in days) on dependency connection strips, positioned
next to the arrow under the horizontal line. Hide when lag=0 to avoid visual clutter.

Purpose: Improve visual feedback for dependency constraints by making lag values visible
directly on the diagram, eliminating need to inspect task properties.

Output: Lag labels rendered on dependency lines when lag != 0
</objective>

<execution_context>
@D:/Projects/gantt-lib/.claude/get-shit-done/workflows/execute-plan.md
@D:/Projects/gantt-lib/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx
@packages/gantt-lib/src/components/DependencyLines/DependencyLines.css
@packages/gantt-lib/src/utils/dependencyUtils.ts
@packages/gantt-lib/src/utils/geometry.ts
@packages/gantt-lib/src/types/index.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add lag label SVG rendering in DependencyLines component</name>
  <files>packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx</files>
  <action>
    In DependencyLines.tsx, extend the lines.map() in the return statement to conditionally render lag labels:

    1. In the lines useMemo, include the lag value from edge.lag in each line object:
       - Change lines array type to include lag: number
       - Push lag value from edge.lag (already available from getAllDependencyEdges)

    2. After each <path> element in the JSX render, add conditional SVG <text> for lag label:
       - Condition: {line.lag !== 0 && (...)}
       - Position calculation: use horizontal line segment midpoint
         - For FS/SS (arrivesFromRight=false): midpoint between fromX and horizontal bend point
         - For FF/SF (arrivesFromRight=true): midpoint between horizontal bend point and toX
         - Y position: fromY + 4 (4px below the horizontal line, under the arrow path)
       - Text content: line.lag > 0 ? `+${line.lag}` : `${line.lag}` (show + for positive values)
       - SVG text attributes:
         - className: "gantt-dependency-lag-label"
         - textAnchor: "middle"
         - fontSize: "10"
         - fill: "var(--gantt-dependency-line-color, #666666)"

    3. Ensure lag label follows dependency line color (cycle lag uses --gantt-dependency-cycle-color)

    Position calculation reference:
    - The horizontal segment runs from fromX to the bend point (tx - dirX*C for chamfered paths)
    - For same-row (fy === ty): simple horizontal line, label at midpoint (fromX + toX) / 2
    - For multi-row with chamfer: horizontal segment ends at tx - dirX*C (dirX = 1 for goingRight, -1 for goingLeft)
    - Use simple heuristic: label at (fromX + toX) / 2 for all cases (visually acceptable)
  </action>
  <verify>
    npm run build --workspace=packages/gantt-lib
  </verify>
  <done>
    Lag labels render as SVG text elements below dependency arrows when lag !== 0
  </done>
</task>

<task type="auto">
  <name>Task 2: Add lag label CSS styling</name>
  <files>packages/gantt-lib/src/components/DependencyLines/DependencyLines.css</files>
  <action>
    Add CSS class for lag label styling:

    1. Add .gantt-dependency-lag-label class with:
       - font-size: 10px
       - font-weight: 500
       - pointer-events: none (clicks pass through)
       - user-select: none (text not selectable)
       - opacity: 0.85 (slightly subtle, not distracting)

    2. The fill color is set inline in SVG (uses CSS var for theme support)

    3. Ensure no hover effects or transitions (static label, not interactive)

    Style should match the subtle, non-intrusive aesthetic of progress labels
  </action>
  <verify>
    grep -n "gantt-dependency-lag-label" packages/gantt-lib/src/components/DependencyLines/DependencyLines.css
  </verify>
  <done>
    Lag label styled as small, subtle text below dependency arrows
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
    Lag number display on dependency connection lines:
    - Lag values rendered as small text labels below horizontal line segments
    - Labels positioned at midpoint of horizontal segment, 4px below the line
    - Hidden when lag = 0
    - Shows "+N" for positive lag, "-N" for negative lag
    - Styled with 10px font, 0.85 opacity
  </what-built>
  <how-to-verify>
    1. Open http://localhost:3000 (website dev server)
    2. View the Construction Project demo which has tasks with various dependencies
    3. Verify dependencies with lag=0 show NO lag label
    4. Verify dependencies with non-zero lag show lag number (e.g., "+2", "-1")
    5. Check lag labels are positioned below the horizontal line segment, near the arrow
    6. Verify labels use correct color (gray for normal, red for cycle dependencies)
    7. Test with different link types (FS, SS, FF, SF) to ensure label positioning works
  </how-to-verify>
  <resume-signal>Type "approved" or describe issues with lag label positioning/styling</resume-signal>
</task>

</tasks>

<verification>
- Build completes without errors
- Lag labels render only when lag !== 0
- Labels positioned at horizontal segment midpoint, below the line
- Positive lag shows "+" prefix, negative lag shows "-" sign
- Labels inherit dependency line color (gray/red based on cycle status)
- No console errors during rendering
</verification>

<success_criteria>
- Lag values visible on dependency diagram without inspecting task data
- Zero-lag dependencies remain visually clean (no label clutter)
- Lag labels are readable but unobtrusive
- All link types (FS, SS, FF, SF) display lag correctly
</success_criteria>

<output>
After completion, create `.planning/quick/21-add-small-lag-number-in-days-to-connecti/21-01-SUMMARY.md`
</output>
