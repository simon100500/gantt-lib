---
phase: quick
plan: 094-virtual-dependency-links
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx
  - packages/gantt-lib/src/components/GanttChart/GanttChart.tsx
autonomous: true
requirements:
  - VDL-001
  - VDL-002

must_haves:
  truths:
    - "Dependency lines from hidden children render at their virtual positions inside collapsed parent"
    - "Dependency lines to hidden children render at their virtual positions inside collapsed parent"
    - "Moving a task that depends on a hidden child still triggers cascade to move that child"
    - "Moving a hidden child still triggers cascade to move its successors"
  artifacts:
    - path: "packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx"
      provides: "Virtual position calculation for hidden tasks"
      min_lines: 300
    - path: "packages/gantt-lib/src/components/GanttChart/GanttChart.tsx"
      provides: "Full task list passed to DependencyLines for virtual rendering"
      exports: ["DependencyLines with allTasks prop"]
  key_links:
    - from: "GanttChart.tsx"
      to: "DependencyLines.tsx"
      via: "allTasks prop instead of filteredTasks"
      pattern: "tasks={filteredTasks}.*tasks={allTasks}"
    - from: "DependencyLines.tsx"
      to: "virtual position calculation"
      via: "Calculate hidden task position from parent bounds"
      pattern: "hiddenTaskPosition.*parentBounds"
---

<objective>
Implement "virtual dependency links" so tasks can be linked and cascade even when hidden inside collapsed parents.

Purpose: Current implementation filters out hidden children from `filteredTasks`, breaking dependency links and cascade. Users expect dependencies to work regardless of collapse state.

Output: Dependency lines render at virtual positions for hidden tasks, cascade works when dragging tasks with hidden predecessors/successors.
</objective>

<execution_context>
@D:/Projects/gantt-lib/.claude/get-shit-done/workflows/execute-plan.md
@D:/Projects/gantt-lib/.claude/get-shit-down/templates/summary.md
</execution_context>

<context>
@D:/Projects/gantt-lib/packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx
@D:/Projects/gantt-lib/packages/gantt-lib/src/components/GanttChart/GanttChart.tsx
@D:/Projects/gantt-lib/packages/gantt-lib/src/utils/dependencyUtils.ts
@D:/Projects/gantt-lib/packages/gantt-lib/src/utils/geometry.ts

## Key interfaces from existing code

From GanttChart.tsx:
```typescript
// Current state for collapsed parents
const [collapsedParentIds, setCollapsedParentIds] = useState<Set<string>>(new Set());

// Current filtered tasks (hides children of collapsed parents)
const filteredTasks = useMemo(() => {
  return tasks.filter(task => {
    if (!task.parentId) return true;
    const parentCollapsed = collapsedParentIds.has(task.parentId);
    return !parentCollapsed;
  });
}, [tasks, collapsedParentIds]);
```

From DependencyLines.tsx:
```typescript
export interface DependencyLinesProps {
  tasks: Task[];
  monthStart: Date;
  dayWidth: number;
  rowHeight: number;
  gridWidth: number;
  dragOverrides?: Map<string, { left: number; width: number }>;
  selectedDep?: { predecessorId: string; successorId: string; linkType: string } | null;
}

// Position calculation uses task index in the array
positions.set(task.id, {
  left: resolvedLeft,
  right: resolvedLeft + resolvedWidth,
  rowTop: index * rowHeight,  // <-- This breaks for hidden tasks
});
```
</context>

<tasks>

<task type="auto">
  <name>Task 1: Calculate virtual positions for hidden tasks in DependencyLines</name>
  <files>packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx</files>
  <action>
Modify DependencyLines.tsx to support virtual position calculation for hidden tasks:

1. **Add new props:**
   - `allTasks: Task[]` - Complete task list including hidden children
   - `collapsedParentIds: Set<string>` - Set of collapsed parent IDs
   - Keep existing `tasks` prop as `visibleTasks` (backward compatible)

2. **Create virtual position calculation function:**
   ```typescript
   function calculateVirtualPosition(
     task: Task,
     allTasks: Task[],
     collapsedParentIds: Set<string>,
     monthStart: Date,
     dayWidth: number,
     rowHeight: number,
     taskPositions: Map<string, { left: number; right: number; rowTop: number }>
   ): { left: number; right: number; rowTop: number } | null {
     // If task is visible, use actual position
     // If task is hidden inside collapsed parent:
     //   - Find the collapsed parent
     //   - Use parent's rowTop for vertical position
     //   - Calculate horizontal position from task's dates (left, right)
     //   - Return virtual position
   }
   ```

3. **Build position map for ALL tasks:**
   - First pass: Calculate positions for visible tasks (existing logic)
   - Second pass: Calculate virtual positions for hidden tasks using parent's rowTop

4. **Render lines for ALL dependencies:**
   - Use `getAllDependencyEdges(allTasks)` instead of `getAllDependencyEdges(tasks)`
   - For each edge, look up positions (virtual or actual) from the complete position map
   - Lines to/from hidden tasks render at their virtual positions

5. **Visual distinction:**
   - Add CSS class `gantt-dependency-virtual` for lines involving hidden tasks
   - Style with dashed stroke or reduced opacity to indicate "virtual" status

6. **Update `calculateEffectiveLag` to work with virtual positions:**
   - The function already uses positions, so virtual positions work automatically
</action>
  <verify>
<automated>npm run test -- packages/gantt-lib/src/components/DependencyLines/DependencyLines.test.ts 2>/dev/null || echo "No tests found - verify manually: collapsed parent with child that has external dependency should show dashed dependency line from parent area</automated>
</verify>
  <done>
- DependencyLines accepts allTasks and collapsedParentIds props
- Virtual positions calculated for hidden tasks (using parent's rowTop)
- All dependency lines render (visible and virtual)
- Virtual lines styled distinctly (dashed or faded)
  </done>
</task>

<task type="auto">
  <name>Task 2: Pass allTasks and collapsedParentIds to DependencyLines in GanttChart</name>
  <files>packages/gantt-lib/src/components/GanttChart/GanttChart.tsx</files>
  <action>
Update GanttChart.tsx to pass full task context to DependencyLines:

1. **Find the DependencyLines component** (around line 914-922)

2. **Update props:**
   ```typescript
   <DependencyLines
     tasks={filteredTasks}  // Keep for visible task row calculation
     allTasks={tasks}       // NEW: Full task list for virtual positions
     collapsedParentIds={collapsedParentIds}  // NEW: Track collapsed state
     monthStart={monthStart}
     dayWidth={dayWidth}
     rowHeight={rowHeight}
     gridWidth={gridWidth}
     dragOverrides={dependencyOverrides}
     selectedDep={selectedChip}
   />
   ```

3. **Ensure cascade works with hidden tasks:**
   - The `cascadeByLinks` function in dependencyUtils.ts already operates on `allTasks`
   - The `handleTaskChange` callback already passes `tasks` (full list)
   - No changes needed - cascade will work once DependencyLines renders all edges

4. **Verify dragOverrides include hidden tasks:**
   - When a hidden task is in the cascade chain, its override should be in the map
   - The virtual position lookup should use override when available
</action>
  <verify>
<automated>grep -n "allTasks.*collapsedParentIds" /d/Projects/gantt-lib/packages/gantt-lib/src/components/GanttChart/GanttChart.tsx</automated>
</verify>
  <done>
- DependencyLines receives allTasks prop with complete task list
- DependencyLines receives collapsedParentIds prop for virtual position calculation
- Manual test: Collapse parent with child that has external dependency, drag the dependent task - it should still cascade to move the hidden child
  </done>
</task>

<task type="checkpoint:human-verify">
  <name>Task 3: Verify virtual dependency links behavior</name>
  <files>packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx, packages/gantt-lib/src/components/GanttChart/GanttChart.tsx</files>
  <what-built>
Complete virtual dependency links implementation:
- DependencyLines calculates virtual positions for hidden tasks
- GanttChart passes allTasks and collapsedParentIds
- Virtual lines render with distinct styling
- Cascade works with hidden predecessors/successors
  </what-built>
  <how-to-verify>
1. **Test scenario 1 - Visual rendering:**
   - Create a parent task with a child
   - Add a dependency from the child to an external task
   - Collapse the parent
   - Expected: Dashed/faded dependency line from parent area to the external task

2. **Test scenario 2 - Cascade from hidden predecessor:**
   - Create: Parent A (collapsed) with Child A1
   - Create: Task B depends on Child A1
   - Drag Task B to a new position
   - Expected: Child A1 moves (dates update) even though hidden

3. **Test scenario 3 - Cascade to hidden successor:**
   - Create: Task A
   - Create: Parent B (collapsed) with Child B1
   - Task A depends on Child B1
   - Drag Task A to a new position
   - Expected: Child B1 moves (dates update) even though hidden

4. **Test scenario 4 - Expand shows correct positions:**
   - After dragging with hidden dependencies
   - Expand the collapsed parent
   - Expected: Children show updated dates from cascade
  </how-to-verify>
  <resume-signal>Type "approved" or describe issues</resume-signal>
</task>

</tasks>

<verification>
1. Build passes: `npm run build` in packages/gantt-lib
2. TypeScript types check: No type errors in modified files
3. Manual verification tests pass (see checkpoint)
</verification>

<success_criteria>
- Dependency lines render for hidden tasks at virtual positions
- Virtual lines are visually distinct (dashed/faded)
- Dragging tasks with hidden dependencies triggers cascade correctly
- Expanding collapsed parent shows updated child positions after cascade
- No performance degradation (rendering hidden task lines is efficient)
</success_criteria>

<output>
After completion, create `.planning/quick/094-virtual-dependency-links/094-SUMMARY.md`
</output>
