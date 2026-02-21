---
phase: quick-015
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/GanttChart/GanttChart.tsx
  - packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx
autonomous: true
requirements: [QUICK-015]
must_haves:
  truths:
    - "Dependency lines move in real-time while dragging a task bar (move or resize)"
    - "Dependency lines also shift for cascade chain members during hard-mode drag"
    - "Lines snap back correctly when drag is cancelled"
  artifacts:
    - path: "packages/gantt-lib/src/components/GanttChart/GanttChart.tsx"
      provides: "Merged pixel-overrides map passed to DependencyLines each RAF"
    - path: "packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx"
      provides: "Accepts dragOverrides prop and uses pixel positions when available"
  key_links:
    - from: "GanttChart.tsx handleDragStateChange"
      to: "DependencyLines dragOverrides"
      via: "drageOverrides state merging draggedTask + cascadeOverrides"
    - from: "DependencyLines taskPositions useMemo"
      to: "dragOverrides Map"
      via: "override lookup before falling back to date-computed position"
---

<objective>
Make dependency lines redraw in real-time during drag, matching the task bar positions each animation frame.

Purpose: Currently DependencyLines reads task dates from stable props, so lines only update after drag commits to state. Task bars move instantly (using pixel-level state inside useTaskDrag and overridePosition for cascade), but lines stay frozen until mouseup.

Output: Modified GanttChart and DependencyLines so lines follow task bars each RAF during any drag.
</objective>

<execution_context>
@C:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@packages/gantt-lib/src/components/GanttChart/GanttChart.tsx
@packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx
@packages/gantt-lib/src/components/TaskRow/TaskRow.tsx
@packages/gantt-lib/src/hooks/useTaskDrag.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Track dragged task ID + pixel position in GanttChart and expose merged overrides</name>
  <files>packages/gantt-lib/src/components/GanttChart/GanttChart.tsx</files>
  <action>
Two changes in GanttChart.tsx:

**1. Add draggedTaskOverride state** to track the currently-dragged task's pixel position:
```ts
const [draggedTaskOverride, setDraggedTaskOverride] = useState<{ taskId: string; left: number; width: number } | null>(null);
```

**2. Update handleDragStateChange** to also capture taskId. Currently the callback signature lacks taskId. The drag state comes from onDragStateChange in TaskRow which is called from useTaskDrag — but TaskRow doesn't forward taskId in that state.

The simplest approach: In GanttChart, each TaskRow already receives its task.id. Wrap onDragStateChange per task using useCallback with the taskId captured in closure. Replace the single `handleDragStateChange` with a factory or use a stable callback that reads taskId from a ref. Since creating a new callback per row would break React.memo (arePropsEqual compares nothing for this callback), use the existing pattern: the callback is excluded from comparison, so per-task inline callbacks are safe.

Change the `tasks.map` in JSX: instead of passing `handleDragStateChange` directly, pass a stable per-task wrapper. Actually, the cleanest approach is: keep `handleDragStateChange` accepting `state` but ALSO add a new separate prop to TaskRow `onDragStart` that fires once with taskId when drag begins — but that adds API surface.

Simplest correct approach: extend the existing drag state object to include `taskId`. Modify `handleDragStateChange` signature in GanttChart to accept `state & { taskId?: string }` — but the callback is typed in TaskRowProps.

**Actual approach:** Don't modify the TaskRow/useTaskDrag interface. Instead, in GanttChart, for each task row create an `onDragStateChange` callback that closes over `task.id`. Since these callbacks are excluded from arePropsEqual comparison (see TaskRow.tsx line 79: "onChange, onCascadeProgress, onCascade excluded"), new function identity per render is already allowed for those callbacks. But `onDragStateChange` IS excluded from the comment but IS it excluded from arePropsEqual? Check: arePropsEqual does NOT compare onDragStateChange (it's not listed). So creating per-task callbacks is safe.

Replace:
```ts
const handleDragStateChange = useCallback((state: {...}) => { ... }, []);

// in JSX:
onDragStateChange={handleDragStateChange}
```

With:
```ts
// Remove handleDragStateChange useCallback entirely.
// In tasks.map, create per-task callback inline (safe: excluded from memo comparison):
onDragStateChange={(state) => {
  if (state.isDragging) {
    setDragGuideLines(state);
    setDraggedTaskOverride({ taskId: task.id, left: state.left, width: state.width });
  } else {
    setDragGuideLines(null);
    setDraggedTaskOverride(null);
  }
}}
```

**3. Build merged overrides for DependencyLines** — combine draggedTaskOverride + cascadeOverrides into a single Map each render:
```ts
const dependencyOverrides = useMemo(() => {
  const map = new Map(cascadeOverrides);
  if (draggedTaskOverride) {
    map.set(draggedTaskOverride.taskId, {
      left: draggedTaskOverride.left,
      width: draggedTaskOverride.width,
    });
  }
  return map;
}, [cascadeOverrides, draggedTaskOverride]);
```

**4. Pass to DependencyLines:**
```tsx
<DependencyLines
  tasks={tasks}
  monthStart={monthStart}
  dayWidth={dayWidth}
  rowHeight={rowHeight}
  gridWidth={gridWidth}
  dragOverrides={dependencyOverrides}
/>
```
  </action>
  <verify>TypeScript compiles: `cd packages/gantt-lib && npx tsc --noEmit`</verify>
  <done>GanttChart passes `dragOverrides` (a Map) to DependencyLines; draggedTaskOverride state updates each RAF during drag via the per-task onDragStateChange inline callback</done>
</task>

<task type="auto">
  <name>Task 2: Use dragOverrides in DependencyLines for real-time line positions</name>
  <files>packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx</files>
  <action>
Modify DependencyLines to accept and use a `dragOverrides` prop.

**1. Add prop to interface:**
```ts
export interface DependencyLinesProps {
  // ... existing props ...
  /** Real-time pixel overrides for task positions during drag (taskId -> {left, width}) */
  dragOverrides?: Map<string, { left: number; width: number }>;
}
```

**2. Accept in component signature:**
```ts
export const DependencyLines: React.FC<DependencyLinesProps> = React.memo(({
  tasks,
  monthStart,
  dayWidth,
  rowHeight,
  gridWidth,
  dragOverrides,
}) => {
```

**3. Update taskPositions useMemo to use overrides when available:**

In the `taskPositions` computation, after calculating `{ left, width }` from dates, check dragOverrides:
```ts
tasks.forEach((task, index) => {
  const startDate = new Date(task.startDate);
  const endDate = new Date(task.endDate);
  const computed = calculateTaskBar(startDate, endDate, monthStart, dayWidth);

  // Use real-time pixel override if available (during drag)
  const override = dragOverrides?.get(task.id);
  const resolvedLeft = override?.left ?? computed.left;
  const resolvedWidth = override?.width ?? computed.width;

  indices.set(task.id, index);
  positions.set(task.id, {
    left: resolvedLeft + 10,   // same +10 offset as before (arrowhead entry offset)
    right: resolvedLeft + resolvedWidth,
    rowTop: index * rowHeight,
  });
});
```

**4. Add `dragOverrides` to the useMemo dependency array:**
```ts
}, [tasks, monthStart, dayWidth, rowHeight, dragOverrides]);
```

**5. Remove React.memo or update its comparator** to re-render when dragOverrides changes. React.memo with default shallow comparison will NOT detect Map mutations (same reference). Since GanttChart passes `dependencyOverrides` from a `useMemo` that produces a new Map instance each time cascadeOverrides or draggedTaskOverride changes, the reference WILL change — so default React.memo shallow comparison will trigger re-render correctly. No change needed to the memo wrapper.

Do NOT add dragOverrides to the `lines` useMemo dependency — lines depend on taskPositions which already incorporates the override. The dependency chain is: dragOverrides changes -> taskPositions recomputes -> lines recomputes. This is correct.

Wait — `lines` useMemo depends on `[tasks, taskPositions, taskIndices, cycleInfo]`. Since taskPositions is a new Map object each time it recomputes, this dependency IS correctly tracked. No change needed there.
  </action>
  <verify>`cd packages/gantt-lib && npx tsc --noEmit` passes with no errors</verify>
  <done>DependencyLines redraws each RAF during drag — lines follow dragged task bar and cascade chain bars in real-time; after drag completes and overrides clear, lines snap to committed task dates</done>
</task>

</tasks>

<verification>
1. Run TypeScript check: `cd packages/gantt-lib && npx tsc --noEmit` — should pass with 0 errors
2. Run dev server: `npm run dev` from repo root
3. Open gantt demo, drag a task — dependency lines should track the bar in real-time
4. Drag a task with FS successors (hard mode) — cascade bars and their lines should all move together each frame
5. Release drag — lines should remain correct at final positions
</verification>

<success_criteria>
- Dependency lines move in real-time while dragging any task bar
- Cascade chain dependency lines also update each RAF during drag
- No TypeScript errors
- No visual regression on static (non-drag) line rendering
</success_criteria>

<output>
After completion, create `.planning/quick/015-redraw-dep-lines-on-drag/015-SUMMARY.md`
</output>
