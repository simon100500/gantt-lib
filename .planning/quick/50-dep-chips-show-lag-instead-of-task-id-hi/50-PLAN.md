---
phase: quick-50
plan: 50
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
autonomous: true
requirements:
  - QUICK-50
must_haves:
  truths:
    - "Dep chip shows '+N' when lag > 0"
    - "Dep chip shows '-N' when lag < 0"
    - "Dep chip shows only the SVG icon (no text) when lag is 0 or undefined"
    - "Task number/index is no longer shown in any dep chip"
  artifacts:
    - path: "packages/gantt-lib/src/components/TaskList/TaskListRow.tsx"
      provides: "Updated DepChip component and call sites"
      contains: "lag !== 0"
  key_links:
    - from: "DepChipProps.lag"
      to: "dep.lag"
      via: "prop pass-through at both DepChip call sites"
      pattern: "lag=\\{.*dep\\.lag"
---

<objective>
Replace the task-number display inside dependency chips with the lag value, formatted as "+N" or "-N". When lag is 0 or absent, show nothing — the chip displays only the SVG icon.

Purpose: Chips become more informative (lag is more useful than a task index) and visually cleaner when lag is zero.
Output: Updated TaskListRow.tsx with modified DepChip component.
</objective>

<execution_context>
@D:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@D:/Users/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

<!-- Current DepChip interface (extracted from TaskListRow.tsx lines 48-59): -->
<interfaces>
From packages/gantt-lib/src/components/TaskList/TaskListRow.tsx:

```typescript
// DepChipProps — existing interface
interface DepChipProps {
  taskNumber: number;                     // REMOVE — replaced by lag
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

// Current render (line 110):
<><Icon />{taskNumber}</>

// TaskDependency type (from types/index.ts line 13-19):
export interface TaskDependency {
  taskId: string;
  type: LinkType;
  lag?: number;   // already present
}
```

<!-- Call sites using taskNumber: -->
// Popover list (line 406-419): chips.map(({ dep, taskNumber }) => <DepChip taskNumber={taskNumber} ... />)
// Single chip (line 426-437):   <DepChip taskNumber={chips[0].taskNumber} ... />
// chips useMemo (line 202-209): returns { dep, taskNumber: predecessorIndex + 1 }
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Replace taskNumber with lag in DepChip</name>
  <files>packages/gantt-lib/src/components/TaskList/TaskListRow.tsx</files>
  <action>
Make four targeted edits to TaskListRow.tsx:

1. **DepChipProps interface** (around line 48-59): Replace `taskNumber: number;` with `lag?: number;`

2. **DepChip destructuring** (around line 69-80): Replace `taskNumber,` with `lag,` in the destructured parameter list.

3. **DepChip render** (line 110): Replace:
   ```tsx
   <><Icon />{taskNumber}</>
   ```
   with:
   ```tsx
   <><Icon />{lag != null && lag !== 0 ? (lag > 0 ? `+${lag}` : `${lag}`) : ''}</>
   ```

4. **chips useMemo** (around line 202-209): Remove `taskNumber: predecessorIndex + 1,` from the returned object. The `predecessorIndex` lookup and `allTasks.findIndex` call are no longer needed — simplify to:
   ```ts
   return (task.dependencies ?? []).map(dep => ({ dep }));
   ```
   Update the destructuring in both call sites from `({ dep, taskNumber })` to `({ dep })`.

5. **Both DepChip call sites**: Remove the `taskNumber={...}` prop from both the popover list map and the single-chip render.

Do NOT change any other logic, CSS classes, event handlers, or other props.
  </action>
  <verify>
    <automated>cd D:/Projects/gantt-lib && npx tsc --noEmit -p packages/gantt-lib/tsconfig.json 2>&1 | tail -20</automated>
  </verify>
  <done>
TypeScript compiles with no errors. DepChipProps no longer contains taskNumber. Both DepChip call sites pass lag instead. Chip renders "+N"/"-N" for non-zero lag, empty string for zero/absent lag.
  </done>
</task>

</tasks>

<verification>
After the task completes:
- `npx tsc --noEmit` passes with zero errors
- In the browser, dep chips in the «Связи» column show "+3", "-1", etc. for non-zero lags
- Dep chips with lag=0 or no lag show only the SVG icon, no trailing number
- The summary chip ("N связей") is unaffected
</verification>

<success_criteria>
All dep chips (both inline single-chip and popover list) display lag as "+N"/"-N" or nothing (lag=0). No task index numbers appear anywhere in dep chips. TypeScript compiles cleanly.
</success_criteria>

<output>
After completion, create `.planning/quick/50-dep-chips-show-lag-instead-of-task-id-hi/50-SUMMARY.md` with what was changed, files modified, and commit hash.
</output>
