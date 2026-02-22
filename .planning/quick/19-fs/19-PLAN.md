---
phase: quick-19
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/hooks/useTaskDrag.ts
autonomous: true
requirements: []
must_haves:
  truths:
    - "Dragging the left edge of an FS child task cannot move its start date before the predecessor's start date"
    - "Existing resize-right and move constraints are unaffected"
    - "Soft mode (disableConstraints=true) bypasses the left-edge constraint, same as move"
  artifacts:
    - path: "packages/gantt-lib/src/hooks/useTaskDrag.ts"
      provides: "FS left-edge constraint applied in resize-left branch"
  key_links:
    - from: "handleGlobalMouseMove resize-left branch"
      to: "minAllowedLeft clamp"
      via: "same FS predecessor.startDate logic as move"
      pattern: "resize-left.*minAllowedLeft"
---

<objective>
Apply the existing FS "child cannot start before predecessor's start date" constraint to the resize-left (left-edge drag) interaction.

Purpose: Currently this constraint only blocks the move operation. A user can drag the left edge leftward past the predecessor's start date, violating the FS relationship. The fix makes resize-left behave consistently with move in hard mode.

Output: Modified useTaskDrag.ts where resize-left is clamped by the same minAllowedLeft logic as move.
</objective>

<execution_context>
@C:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@packages/gantt-lib/src/hooks/useTaskDrag.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Apply FS left-edge constraint to resize-left mode</name>
  <files>packages/gantt-lib/src/hooks/useTaskDrag.ts</files>
  <action>
In `handleGlobalMouseMove`, locate the hard-mode constraint block that starts at line ~205:

```
if (mode === 'move' && allTasks.length > 0 && !globalActiveDrag.disableConstraints) {
```

Change the condition to also cover `resize-left`:

```
if ((mode === 'move' || mode === 'resize-left') && allTasks.length > 0 && !globalActiveDrag.disableConstraints) {
```

The rest of the block is identical — it iterates FS predecessors, computes `predStartLeft`, accumulates `minAllowedLeft`, then clamps `newLeft = Math.max(minAllowedLeft, newLeft)`.

For `resize-left`, clamping `newLeft` is correct: the right edge (`initialLeft + initialWidth`) is fixed, so `newWidth` is already computed as `rightEdge - snappedLeft`. After clamping `newLeft`, `newWidth` must be recomputed to stay consistent:

```ts
// After the clamp block (applies to both move and resize-left):
if (mode === 'resize-left') {
  const rightEdge = globalActiveDrag.initialLeft + globalActiveDrag.initialWidth;
  newWidth = Math.max(globalActiveDrag.dayWidth, rightEdge - newLeft);
}
```

Add this recalculation immediately after the closing brace of the constraint block (after line ~228). This ensures that after `newLeft` is clamped, `newWidth` reflects the actual bar width rather than the unclamped snapped value.

Do NOT touch the cascade block below (it guards on `mode === 'move' || mode === 'resize-right'` — resize-left correctly produces no cascade).
  </action>
  <verify>
1. In the demo, open a task that has an FS predecessor.
2. Drag the LEFT edge of the child task leftward past the predecessor's start date.
3. The bar's left edge should stop at the predecessor's start date boundary and not move further left.
4. Drag the left edge rightward — it should move freely (shrinking the bar).
5. Drag the bar itself (move mode) leftward — still clamped as before.
6. With `disableConstraints={true}`, the left edge should drag freely past the boundary.
  </verify>
  <done>
Dragging the left edge of an FS child cannot move the task's start date before its predecessor's start date when constraints are enabled. The bar width updates correctly after clamping. Soft mode is unaffected.
  </done>
</task>

</tasks>

<verification>
Run `npm run build` in the monorepo root (or `cd packages/gantt-lib && npm run build`) to confirm TypeScript compiles without errors after the change.
</verification>

<success_criteria>
- TypeScript build passes with no errors
- Left-edge drag of an FS child is clamped at the predecessor's start date in hard mode
- Right-edge drag and move behavior unchanged
- Soft mode (disableConstraints) bypasses the constraint as expected
</success_criteria>

<output>
After completion, create `.planning/quick/19-fs/19-SUMMARY.md` following the summary template.
</output>
