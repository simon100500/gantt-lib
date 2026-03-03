---
phase: quick-46
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
autonomous: true
requirements:
  - QUICK-46
must_haves:
  truths:
    - "When a task has 3+ deps, only the first chip is shown inline; the '+N ещё' button occupies the second slot"
    - "When a task has exactly 2 deps, both chips are shown inline with no overflow button"
    - "When a task has exactly 1 dep, the single chip is shown; no overflow button"
  artifacts:
    - path: "packages/gantt-lib/src/components/TaskList/TaskListRow.tsx"
      provides: "Updated visibleChips / hiddenChips slice logic"
  key_links:
    - from: "visibleChips"
      to: "hiddenChips"
      via: "conditional slice based on chips.length >= 3"
      pattern: "chips\\.length >= 3"
---

<objective>
Change the overflow threshold so that when a task has 3 or more dependencies the "+N ещё" button
replaces the second chip (not the third).

Current: chips 0-1 visible, chips 2+ hidden → "+1 ещё" appears after two chips.
Desired: when chips.length >= 3, only chip 0 is visible inline, chips 1+ are hidden → "+N ещё"
         replaces the second slot.

Purpose: Keeps the deps cell compact — the overflow indicator appears one position earlier,
         preventing the cell from ever showing two full chips plus an overflow badge.
Output: Updated visibleChips / hiddenChips computation in TaskListRow.tsx.
</objective>

<execution_context>
@D:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@D:/Projects/gantt-lib/.planning/STATE.md
@D:/Projects/gantt-lib/packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Change overflow threshold from 2 to 1 visible chip when 3+ deps exist</name>
  <files>packages/gantt-lib/src/components/TaskList/TaskListRow.tsx</files>
  <action>
Replace lines 104-105 in TaskListRow.tsx:

BEFORE:
```ts
const visibleChips = chips.slice(0, 2);
const hiddenChips = chips.slice(2);
```

AFTER:
```ts
const visibleChips = chips.length >= 3 ? chips.slice(0, 1) : chips.slice(0, 2);
const hiddenChips  = chips.length >= 3 ? chips.slice(1)    : chips.slice(2);
```

Logic:
- 1 dep  → visibleChips=[0],      hiddenChips=[]      → no overflow button (same as before)
- 2 deps → visibleChips=[0,1],    hiddenChips=[]      → no overflow button (same as before)
- 3 deps → visibleChips=[0],      hiddenChips=[1,2]   → "+2 ещё" button shown (was "+1 ещё" after two chips)
- 4 deps → visibleChips=[0],      hiddenChips=[1,2,3] → "+3 ещё" button shown

No other changes needed: the overflow Popover button text is already `+{hiddenChips.length} ещё`
and the Popover content still shows `chips` (all), so the full list remains accessible.
  </action>
  <verify>
    <automated>cd D:/Projects/gantt-lib && npm run build --workspace=packages/gantt-lib 2>&1 | tail -5</automated>
  </verify>
  <done>
    Build passes with no TypeScript errors.
    Visually: a row with 3 deps shows "ОН(1)" chip + "+2 ещё" button (not "ОН(1)" + "ОН(2)" + "+1 ещё").
    Rows with 1 or 2 deps are unchanged.
  </done>
</task>

</tasks>

<verification>
After the change, open the demo app and find a task with 3 or more dependencies.
The deps cell should render: one chip followed by "+N ещё" where N = total - 1.
Clicking "+N ещё" opens the Popover showing all chips.
Tasks with 1 or 2 deps are unaffected.
</verification>

<success_criteria>
- tasks with >= 3 deps: exactly 1 chip visible inline, remainder in overflow
- tasks with 1-2 deps: unchanged (all chips visible, no overflow button)
- TypeScript build passes
</success_criteria>

<output>
After completion, create `.planning/quick/46-3-1/46-SUMMARY.md`
</output>
