---
phase: quick-022-lag-label-above-line
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx
autonomous: false
requirements: []
user_setup: []
must_haves:
  truths:
    - "When dependency arrow goes UP (predecessor below successor), lag label displays ABOVE the horizontal line"
    - "When dependency arrow goes DOWN (predecessor above successor), lag label displays BELOW the horizontal line"
    - "Lag label position is calculated based on arrow direction (reverseOrder)"
  artifacts:
    - path: "packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx"
      provides: "Direction-aware lag label positioning"
      contains: "reverseOrder-based y-position calculation"
  key_links:
    - from: "lag label y-position"
      to: "reverseOrder flag"
      via: "conditional calculation based on arrow direction"
      pattern: "reverseOrder.*\\?.*:.*:"
---
<objective>
Fix lag label vertical positioning to be above the horizontal line when the dependency arrow goes from bottom to top.

Purpose: Currently, lag labels are always positioned at `fromY + 12` regardless of arrow direction. When the arrow goes UP (predecessor is below successor), the label appears below the line, which is visually incorrect. The label should be above the line for upward arrows and below for downward arrows.

Output: Lag labels positioned correctly based on arrow direction — above the line for upward arrows, below for downward arrows.
</objective>

<execution_context>
@D:/Projects/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@D:/Projects/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@D:/Projects/gantt-lib/packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx
@D:/Projects/gantt-lib/packages/gantt-lib/src/utils/geometry.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Make lag label y-position direction-aware</name>
  <files>packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx</files>
  <action>
Modify the lag label y-position calculation in the lines useMemo (around line 280) to account for arrow direction:

1. Currently the lag label is positioned at `y={fromY + 12}` regardless of direction
2. The `reverseOrder` flag already indicates direction: `true` = arrow goes UP, `false` = arrow goes DOWN
3. The horizontal segment of the path is at `fromY` (the y-coordinate where the line exits the predecessor bar)

Position the lag label:
- For upward arrows (reverseOrder = true): ABOVE the line at `fromY - 4`
- For downward arrows (reverseOrder = false): BELOW the line at `fromY + 12`

The fix requires:
1. Add `reverseOrder` to the line object pushed to the lines array (line 215)
2. Use `reverseOrder` in the JSX to conditionally set the y-position (line 281)

Changes:
```tsx
// In the lines array push (around line 215):
lines.push({
  id: `${edge.predecessorId}-${edge.successorId}-${edge.type}`,
  path,
  hasCycle,
  lag,
  fromX,
  toX,
  fromY,
  reverseOrder,  // ADD THIS
});

// In the JSX (around line 281):
y={reverseOrder ? fromY - 4 : fromY + 12}
```

Do NOT modify any other aspects of the lag label rendering (x-position, textAnchor, fontSize, fill, etc.)
</action>
  <verify>
- TypeScript compiles: `cd packages/gantt-lib && npx tsc --noEmit`
- Check that for upward arrows, label is at fromY - 4 (above the horizontal line)
- Check that for downward arrows, label is at fromY + 12 (below the horizontal line)
</verify>
  <done>
Lag labels are positioned above the horizontal line for upward-pointing arrows and below for downward-pointing arrows
</done>
</task>

<task type="checkpoint:human-verify">
  <what-built>Direction-aware lag label positioning on dependency lines</what-built>
  <how-to-verify>
1. Open the website demo (npm run dev in packages/website)
2. Find a dependency where the arrow goes UP (predecessor task is BELOW the successor task)
3. Verify the lag label is ABOVE the horizontal portion of the arrow
4. Find a dependency where the arrow goes DOWN (predecessor task is ABOVE the successor task)
5. Verify the lag label is BELOW the horizontal portion of the arrow
6. Check both positive and negative lag values
7. Verify the label doesn't overlap the arrow line or the task bar
</how-to-verify>
  <resume-signal>Type "approved" or describe issues</resume-signal>
</task>

</tasks>

<verification>
- Lag label positioned above horizontal line for upward arrows
- Lag label positioned below horizontal line for downward arrows
- No TypeScript errors
- No visual overlap between label and arrow line
- No visual overlap between label and task bar
</verification>

<success_criteria>
- Lag labels display at correct vertical position for all arrow directions
- No regression to existing label styling or positioning (x-position, text anchor, etc.)
- Clean visual appearance without overlapping elements
</success_criteria>

<output>
After completion, create `.planning/quick/022-lag-label-above-line/022-SUMMARY.md`
</output>
