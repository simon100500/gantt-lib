---
phase: quick-12-fs
plan: 12
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/hooks/useTaskDrag.ts
  - packages/website/src/app/page.tsx
autonomous: true
requirements: []
must_haves:
  truths:
    - "Dragging a child task (FS + negative lag) left toward the predecessor does not cause the bar to jump/reset to the drag-start position"
    - "When the constraint boundary is reached, the bar stops smoothly at the allowed minimum position instead of snapping back to initialLeft"
    - "The dependency demo section has a toggle labeled 'Block constraints during drag' (yes/no) that enables/disables canMoveTask validation"
    - "Turning the toggle OFF allows the child bar to be dragged freely past the constraint boundary"
  artifacts:
    - path: "packages/gantt-lib/src/hooks/useTaskDrag.ts"
      provides: "Fixed constraint handling — clamp to boundary instead of revert to initialLeft"
    - path: "packages/website/src/app/page.tsx"
      provides: "Toggle UI + example task with FS negative lag for testing"
  key_links:
    - from: "handleGlobalMouseMove in useTaskDrag.ts"
      to: "canMoveTask validation result"
      via: "When !validation.allowed, clamp newLeft to constraint boundary instead of reverting to initialLeft"
    - from: "page.tsx toggle state"
      to: "GanttChart enableConstraints prop (or passed via allTasks flag)"
      via: "Boolean state controls whether canMoveTask is called"
---

<objective>
Fix the drag position reset bug that occurs when a child task with an FS + negative-lag dependency is dragged leftward, and add a diagnostic toggle to the example page.

Purpose: The current constraint handler reverts the bar to `globalActiveDrag.initialLeft` (drag-start position) on every blocked frame, causing an abrupt snap-back instead of a smooth stop at the constraint boundary. Additionally, the example page needs a way for the user to disable constraints during drag to isolate whether a visual glitch is constraint-related or a separate rendering bug.

Output:
- Fixed `useTaskDrag.ts`: constraint-blocked moves clamp to the allowed boundary position rather than reverting to drag-start
- Updated `page.tsx`: FS-with-negative-lag example task + toggle for constraint enforcement
</objective>

<execution_context>
@C:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@packages/gantt-lib/src/hooks/useTaskDrag.ts
@packages/gantt-lib/src/utils/dependencyUtils.ts
@packages/website/src/app/page.tsx
@packages/gantt-lib/src/components/GanttChart/GanttChart.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix constraint clamp — stop at boundary instead of reverting to initialLeft</name>
  <files>packages/gantt-lib/src/hooks/useTaskDrag.ts</files>
  <action>
In `handleGlobalMouseMove` (the `requestAnimationFrame` callback), locate the block that handles `mode === 'move'` constraint validation (lines ~168-198).

Current broken behavior:
```ts
if (!validation.allowed) {
  newLeft = globalActiveDrag.initialLeft;   // snaps back to drag-start
  newWidth = globalActiveDrag.initialWidth;
}
```

Replace with a clamp-to-boundary approach:

1. When `!validation.allowed`, do NOT revert to `initialLeft`. Instead, find the minimum allowed left position for this task by iterating dependencies and computing the tightest constraint:

```ts
if (!validation.allowed) {
  // Find the minimum allowed left position from all constraining predecessors
  let minAllowedLeft = 0;
  for (const dep of currentTask.dependencies ?? []) {
    const predecessor = globalActiveDrag.allTasks.find(t => t.id === dep.taskId);
    if (!predecessor) continue;
    const predecessorStart = new Date(predecessor.startDate);
    const predecessorEnd = new Date(predecessor.endDate);
    const expectedDate = calculateSuccessorDate(
      predecessorStart,
      predecessorEnd,
      dep.type,
      dep.lag ?? 0
    );
    const targetIsStart = dep.type.endsWith('S');
    // Convert expectedDate to pixel offset
    const expectedOffset = Math.round(
      (expectedDate.getTime() -
        Date.UTC(
          globalActiveDrag.monthStart.getUTCFullYear(),
          globalActiveDrag.monthStart.getUTCMonth(),
          globalActiveDrag.monthStart.getUTCDate()
        )) /
        (24 * 60 * 60 * 1000)
    );
    const expectedLeft = expectedOffset * globalActiveDrag.dayWidth;
    if (targetIsStart) {
      minAllowedLeft = Math.max(minAllowedLeft, expectedLeft);
    } else {
      // FF/SF: the end must be at expectedLeft, so left = expectedLeft - width
      minAllowedLeft = Math.max(minAllowedLeft, expectedLeft - newWidth);
    }
  }
  // Clamp: don't let bar go left of the constraint boundary
  newLeft = Math.max(minAllowedLeft, newLeft);
}
```

2. Import `calculateSuccessorDate` is already imported at the top of the file (line 6), so no additional import needed.

3. Keep `newWidth` unchanged (don't reset width on constraint block).

This makes the bar stop smoothly at the constraint boundary when dragging leftward, instead of snapping all the way back to drag-start.

Also add a `disableConstraints` flag to `globalActiveDrag` and `ActiveDragState`:

```ts
// In ActiveDragState interface, add:
disableConstraints?: boolean;
```

And in `handleGlobalMouseMove`, guard the constraint check:
```ts
if (mode === 'move' && allTasks.length > 0 && !globalActiveDrag.disableConstraints) {
  ...
}
```

Add `disableConstraints` to `UseTaskDragOptions`:
```ts
/** When true, dependency constraint checking is skipped during drag (default: false) */
disableConstraints?: boolean;
```

Pass it through to `globalActiveDrag` in `handleMouseDown`:
```ts
globalActiveDrag = {
  ...
  disableConstraints: options.disableConstraints ?? false,
};
```

And wire it from `useTaskDrag` options:
```ts
const { ..., disableConstraints = false } = options;
```
  </action>
  <verify>
Run `cd D:/Projects/gantt-lib && npm run build --workspace=packages/gantt-lib 2>&1 | tail -20` — build must succeed with no TypeScript errors.
  </verify>
  <done>
TypeScript compiles cleanly. The `disableConstraints` option exists on `UseTaskDragOptions`. The constraint block clamps to boundary position instead of reverting to `initialLeft`.
  </done>
</task>

<task type="auto">
  <name>Task 2: Add FS negative-lag test task + constraint toggle to the dependency demo</name>
  <files>packages/website/src/app/page.tsx</files>
  <action>
In `page.tsx`, make the following changes to the "Task Dependencies" section:

**1. Add a new test task to `createDependencyTasks()`** — a child task with FS dependency and lag=-3:

```ts
// After task-5, before cycle-a, add:
{
  id: 'task-fs-parent',
  name: 'FS Parent',
  startDate: '2026-02-17',
  endDate: '2026-02-20',
  color: '#0ea5e9',
},
{
  id: 'task-fs-child',
  name: 'FS Child (lag=-3)',
  startDate: '2026-02-18',
  endDate: '2026-02-21',
  color: '#06b6d4',
  dependencies: [{ taskId: 'task-fs-parent', type: 'FS' as const, lag: -3 }],
},
```

This creates a scenario where child starts 2 days before parent ends (valid for FS lag=-3, since expectedStart = parentEnd - 3 = Feb 17). Dragging the child further left should be blocked at Feb 17.

**2. Add toggle state** in `Home()`:

```ts
const [blockConstraints, setBlockConstraints] = useState(true);
```

**3. Add toggle UI** in JSX, inside the dependency demo section, above the GanttChart:

```tsx
<div style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
  <label style={{ fontSize: '0.875rem', color: '#374151', cursor: 'pointer' }}>
    <input
      type="checkbox"
      checked={blockConstraints}
      onChange={(e) => setBlockConstraints(e.target.checked)}
      style={{ marginRight: '0.375rem' }}
    />
    Block constraints during drag
  </label>
  <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
    (uncheck to drag freely past dependency boundaries)
  </span>
</div>
```

**4. Pass the flag to the dependency GanttChart** — GanttChart does NOT currently have a `disableConstraints` prop, so we need to pass it down. However, `disableConstraints` is a `useTaskDrag`-level option. The cleanest approach without changing GanttChart's public API is to add a `disableConstraints` prop to `GanttChartProps` and thread it through to `TaskRow` → `useTaskDrag`.

Add to `GanttChartProps` in `GanttChart.tsx`:
```ts
/** Disable dependency constraint checking during drag (default: false) */
disableConstraints?: boolean;
```

Thread it through `GanttChart.tsx` → `TaskRow` props → `useTaskDrag` options.

In `GanttChart.tsx` component function, destructure:
```ts
disableConstraints,
```

Pass to TaskRow:
```tsx
<TaskRow
  ...
  disableConstraints={disableConstraints ?? false}
/>
```

Add to `TaskRowProps` in `TaskRow.tsx`:
```ts
/** Whether to disable constraint checking during drag */
disableConstraints?: boolean;
```

And pass from TaskRow to useTaskDrag:
```ts
useTaskDrag({
  ...
  disableConstraints,
})
```

Then in `page.tsx`, pass the prop:
```tsx
<GanttChart
  tasks={dependencyTasks}
  onChange={handleDependencyChange}
  dayWidth={24}
  rowHeight={36}
  disableConstraints={!blockConstraints}
  onValidateDependencies={...}
/>
```

Note: `blockConstraints=true` means "do block" → `disableConstraints=false` (constraints active). `blockConstraints=false` means "do not block" → `disableConstraints=true`.
  </action>
  <verify>
Run `cd D:/Projects/gantt-lib && npm run build 2>&1 | tail -30`. Then start dev server with `npm run dev` and open the browser to verify the toggle renders in the dependency section and the FS-child task appears. TypeScript must compile cleanly.
  </verify>
  <done>
- "Task Dependencies" section shows two new bars: "FS Parent" and "FS Child (lag=-3)"
- A checkbox "Block constraints during drag" is visible above the chart, checked by default
- When checked: dragging "FS Child (lag=-3)" left stops at the constraint boundary (Feb 17) smoothly
- When unchecked: dragging "FS Child (lag=-3)" moves freely past the boundary
- Build completes without TypeScript errors
  </done>
</task>

</tasks>

<verification>
1. `npm run build` in `D:/Projects/gantt-lib` completes without errors
2. In the browser dependency demo, the "FS Child (lag=-3)" task bar stops at the constraint boundary when dragged left (no jump/snap-back to drag-start)
3. Unchecking "Block constraints during drag" allows free movement past boundaries
4. Existing dependency behaviors (cycle detection, FS/SS/FF/SF lines) are unaffected
</verification>

<success_criteria>
- Dragging a task with FS + negative lag left produces a smooth stop at the boundary, not a snap-back
- `disableConstraints` prop flows through GanttChart → TaskRow → useTaskDrag
- Toggle works in the demo page
- TypeScript strict mode: no errors
</success_criteria>

<output>
After completion, create `.planning/quick/12-fs/12-SUMMARY.md` following the summary template.
</output>
