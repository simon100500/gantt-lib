---
phase: quick-38
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/TaskList/TaskList.tsx
autonomous: true
requirements:
  - Q38-snap-on-add
must_haves:
  truths:
    - "When a user adds a dependency via the task list, the successor task immediately snaps to the correct position relative to the predecessor with lag=0"
    - "FS: successor starts immediately after predecessor ends"
    - "SS: successor starts at same time as predecessor starts"
    - "FF: successor ends at same time as predecessor ends"
    - "SF: successor ends at same time as predecessor starts"
    - "Cascading downstream successors also reposition correctly"
    - "Locked tasks are not repositioned"
  artifacts:
    - path: "packages/gantt-lib/src/components/TaskList/TaskList.tsx"
      provides: "handleAddDependency with auto-snap logic"
      contains: "cascadeByLinks"
  key_links:
    - from: "TaskList.tsx handleAddDependency"
      to: "calculateSuccessorDate"
      via: "import from dependencyUtils"
      pattern: "calculateSuccessorDate"
    - from: "TaskList.tsx handleAddDependency"
      to: "onTaskChange callback"
      via: "call with repositioned task"
      pattern: "onTaskChange.*updatedTask"
---

<objective>
When the user adds a dependency link via the TaskList «Связи» column, the successor task must automatically snap to the correct position relative to the predecessor with lag=0.

Purpose: Without this, adding a link creates a logical constraint but leaves the bar in an incorrect position — requiring the user to manually drag to satisfy the constraint.

Output: Modified `TaskList.tsx` where `handleAddDependency` computes the successor's new dates using `calculateSuccessorDate` (lag=0) and emits them together with the new dependency in a single `onTaskChange` call. This triggers `GanttChart.handleTaskChange` which detects date change and cascades further downstream.
</objective>

<execution_context>
@C:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

Key files:
- packages/gantt-lib/src/components/TaskList/TaskList.tsx  (handleAddDependency to modify)
- packages/gantt-lib/src/utils/dependencyUtils.ts  (calculateSuccessorDate available)
</context>

<interfaces>
From packages/gantt-lib/src/utils/dependencyUtils.ts:

```typescript
/**
 * Calculate successor date based on predecessor dates, link type, and lag.
 * - FS: result = predecessorEnd + lag  → constrains successorStart
 * - SS: result = predecessorStart + lag → constrains successorStart
 * - FF: result = predecessorEnd + lag  → constrains successorEnd
 * - SF: result = predecessorStart + lag → constrains successorEnd
 */
export function calculateSuccessorDate(
  predecessorStart: Date,
  predecessorEnd: Date,
  linkType: LinkType,
  lag: number = 0
): Date;
```

From packages/gantt-lib/src/components/TaskList/TaskList.tsx — current handleAddDependency (lines 96-132):

```typescript
const handleAddDependency = useCallback((
  successorTaskId: string,
  predecessorTaskId: string,
  linkType: LinkType
) => {
  // ... guards (self-link, duplicate, cycle) ...
  const newDep: TaskDependency = { taskId: predecessorTaskId, type: linkType, lag: 0 };
  const hypothetical = tasks.map(t =>
    t.id === successorTaskId
      ? { ...t, dependencies: [...(t.dependencies ?? []), newDep] }
      : t
  );
  const validation = validateDependencies(hypothetical);
  if (!validation.isValid) {
    setCycleError(true);
    setTimeout(() => setCycleError(false), 3000);
    return;
  }
  const updatedTask = hypothetical.find(t => t.id === successorTaskId)!;
  onTaskChange?.(updatedTask);           // <-- currently only emits dependency, no date snap
  setSelectingPredecessorFor(null);
}, [tasks, onTaskChange]);
```

The predecessor task is in `tasks` array, findable by `predecessorTaskId`.
Successor duration must be preserved (endDate - startDate).
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Auto-snap successor dates on dependency add</name>
  <files>packages/gantt-lib/src/components/TaskList/TaskList.tsx</files>
  <action>
Import `calculateSuccessorDate` from `../../utils/dependencyUtils` at the top of the file (add to existing import from that module).

Modify `handleAddDependency` — after cycle validation passes and before calling `onTaskChange`, compute the successor's new dates:

1. Find the predecessor task: `const predecessor = tasks.find(t => t.id === predecessorTaskId)`
2. If predecessor not found, fall through to existing behavior (emit without snap)
3. Parse predecessor dates as UTC Dates: `new Date(predecessor.startDate as string)` and `new Date(predecessor.endDate as string)`
4. Call `calculateSuccessorDate(predStart, predEnd, linkType, 0)` — this returns the constraint anchor date
5. Compute the successor's new dates (preserving duration):
   - Get `origSuccessor = tasks.find(t => t.id === successorTaskId)`
   - `durationMs = new Date(origSuccessor.endDate as string).getTime() - new Date(origSuccessor.startDate as string).getTime()`
   - For FS and SS (constraintDate is the new startDate): `newStart = constraintDate`, `newEnd = new Date(constraintDate.getTime() + durationMs)`
   - For FF and SF (constraintDate is the new endDate): `newEnd = constraintDate`, `newStart = new Date(constraintDate.getTime() - durationMs)`
6. Build `updatedTask` with BOTH the new dependency AND the snapped dates:
   ```ts
   const snappedTask: Task = {
     ...updatedTask,   // already has new dependency from hypothetical
     startDate: newStart.toISOString().split('T')[0],
     endDate: newEnd.toISOString().split('T')[0],
   };
   onTaskChange?.(snappedTask);
   ```

This single `onTaskChange` call with changed dates triggers `GanttChart.handleTaskChange`, which detects date change and runs `cascadeByLinks` to reposition further downstream successors — no GanttChart changes needed.

Add `calculateSuccessorDate` to the deps array of `handleAddDependency` useCallback (it is a stable imported function, so this is harmless but correct).

Note: The snap only moves the successor's bar to be adjacent (lag=0). If the successor was already positioned correctly (dates already satisfy the constraint), the dates will still be updated to exact adjacency — this is desired behavior per spec.
  </action>
  <verify>
    <automated>cd D:/Projects/gantt-lib && npm run build --workspace=packages/gantt-lib 2>&1 | tail -5</automated>
  </verify>
  <done>
    Build passes with no TypeScript errors. When a user adds a FS dependency in the task list, the successor bar immediately snaps so its startDate equals the predecessor's endDate. Same logic applies to SS (start=start), FF (end=end), SF (end=start).
  </done>
</task>

</tasks>

<verification>
After implementation, verify manually in the browser:
1. Open /mcp or any page with the Gantt chart and task list visible
2. Use the «+» button on a task to pick a predecessor
3. Observe: the successor task bar immediately moves adjacent to the predecessor per the selected link type
4. Verify locked tasks are NOT repositioned (the existing `cascadeByLinks` in GanttChart already handles this)
</verification>

<success_criteria>
- TypeScript build succeeds (no type errors)
- `calculateSuccessorDate` is imported and called in `handleAddDependency`
- All 4 link types (FS, SS, FF, SF) produce correct snapping behavior
- Duration of successor task is preserved after snap
- No regression: existing chip display, overflow popover, and remove-chip behavior unchanged
</success_criteria>

<output>
After completion, create `.planning/quick/38-0/38-SUMMARY.md` following the summary template.
</output>
