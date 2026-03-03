---
phase: quick-054
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
autonomous: true
requirements: [QUICK-054]

must_haves:
  truths:
    - "Hovering over a dep chip shows a native tooltip with the predecessor task name"
    - "Tooltip works for single inline chip and for chips inside the overflow popover"
  artifacts:
    - path: "packages/gantt-lib/src/components/TaskList/TaskListRow.tsx"
      provides: "DepChip with title prop showing predecessor name"
  key_links:
    - from: "TaskListRow chips useMemo"
      to: "DepChip predecessorName prop"
      via: "allTasks lookup by dep.taskId"
      pattern: "taskById\\.get\\(dep\\.taskId\\)"
---

<objective>
Add a simple native tooltip to each dep chip that shows the predecessor task name when hovered.

Purpose: Users need to know which task a chip refers to without clicking into it — currently chips only show a type icon and optional lag number.
Output: Modified TaskListRow.tsx where DepChip receives a `predecessorName` string and renders it as `title` on the chip span.
</objective>

<execution_context>
@D:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@D:/Users/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

Key code to modify: packages/gantt-lib/src/components/TaskList/TaskListRow.tsx

Current DepChip interface (lines 16-27):
```typescript
interface DepChipProps {
  lag?: number;
  dep: { taskId: string; type: LinkType };
  taskId: string;
  selectedChip: TaskListRowProps['selectedChip'];
  disableDependencyEditing: boolean;
  onChipSelect: TaskListRowProps['onChipSelect'];
  onRowClick: TaskListRowProps['onRowClick'];
  onScrollToTask: TaskListRowProps['onScrollToTask'];
  onRemoveDependency: TaskListRowProps['onRemoveDependency'];
  onChipSelectClear: () => void;
}
```

Current chip span render (lines 72-79):
```tsx
<span className="gantt-tl-dep-chip-wrapper">
  <span
    className={`gantt-tl-dep-chip${isSelected ? ' gantt-tl-dep-chip-selected' : ''}`}
    onClick={handleClick}
  >
    <><Icon />{lag != null && lag !== 0 ? (lag > 0 ? `+${lag}` : `${lag}`) : ''}</>
  </span>
```

Current chips useMemo (lines 170-187) — already builds `{ dep, lag }` per chip using `taskById` map.
allTasks is available in TaskListRow via `allTasks` prop.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add predecessorName prop to DepChip and wire from TaskListRow chips</name>
  <files>packages/gantt-lib/src/components/TaskList/TaskListRow.tsx</files>
  <action>
1. Add `predecessorName?: string` to `DepChipProps` interface.

2. In `DepChip` component body, add `predecessorName` to the destructured props.

3. Add `title={predecessorName}` to the inner chip `<span>` (the one with class `gantt-tl-dep-chip`). This gives the browser native tooltip on hover. No new dependencies needed.

4. In `TaskListRow`'s `chips` useMemo (already has `taskById` map), extend the returned object to include `predecessorName`:
   ```typescript
   const pred = taskById.get(dep.taskId);
   // existing lag logic...
   return { dep, lag, predecessorName: pred?.name ?? dep.taskId };
   ```

5. Pass `predecessorName` to every `<DepChip>` call site in TaskListRow — there are two: the single-chip render (line ~403) and the popover list map (line ~384).
   - Single chip: `predecessorName={chips[0].predecessorName}`
   - Popover map: `predecessorName={item.predecessorName}` (rename loop variable from `{ dep, lag }` to `{ dep, lag, predecessorName }` or use the chip object directly)
  </action>
  <verify>
    <automated>cd D:/Projects/gantt-lib && npx tsc --project packages/gantt-lib/tsconfig.json --noEmit 2>&amp;1 | head -20</automated>
  </verify>
  <done>Hovering any dep chip shows the browser native tooltip with the predecessor task name. TypeScript compiles clean.</done>
</task>

</tasks>

<verification>
After task completion:
1. TypeScript compiles with no errors: `npx tsc --project packages/gantt-lib/tsconfig.json --noEmit`
2. Visually: hover over a dep chip in the demo — browser tooltip appears showing the predecessor task name (e.g. "Фундамент")
3. Works for both single inline chip and chips inside the overflow popover
</verification>

<success_criteria>
- `DepChipProps` has `predecessorName?: string`
- Chip `<span>` has `title={predecessorName}`
- `chips` useMemo returns `predecessorName: pred?.name ?? dep.taskId`
- Both DepChip call sites pass `predecessorName`
- TypeScript compiles cleanly
</success_criteria>

<output>
After completion, create `.planning/quick/054-tooltip-dep-chip/054-SUMMARY.md`
</output>
