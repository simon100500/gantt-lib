---
phase: quick-099
plan: 99
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/TaskList/TaskList.tsx
autonomous: true
requirements: []
must_haves:
  truths:
    - "Pressing Escape clears the selected task row highlight"
    - "Clicking outside the TaskList overlay clears the selected task row highlight"
    - "Clicking inside the TaskList overlay does NOT clear the selection"
  artifacts:
    - path: "packages/gantt-lib/src/components/TaskList/TaskList.tsx"
      provides: "Extended Escape/outside-click handler that covers selectedTaskId"
  key_links:
    - from: "TaskList useEffect (Escape/mousedown handler)"
      to: "onTaskSelect(null)"
      via: "Extended condition guard: selectedTaskId added to existing deps"
---

<objective>
Deselect the highlighted task row when the user presses Escape or clicks outside the TaskList overlay.

Purpose: Pressing Esc or clicking on the chart/empty area should clear the row highlight, which is the standard UX expectation for selection states.
Output: Modified TaskList.tsx with extended keyboard/mouse deselection logic.
</objective>

<execution_context>
@C:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@packages/gantt-lib/src/components/TaskList/TaskList.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Extend Escape/outside-click handler to also clear selectedTaskId</name>
  <files>packages/gantt-lib/src/components/TaskList/TaskList.tsx</files>
  <action>
In TaskList.tsx, the existing `useEffect` (around line 230) handles Escape and outside-click for `selectingPredecessorFor` and `selectedChip`. Extend it to also handle `selectedTaskId`/`onTaskSelect`.

Specific changes:

1. Change the early-return condition from:
   ```ts
   if (!selectingPredecessorFor && !selectedChip) return;
   ```
   to:
   ```ts
   if (!selectingPredecessorFor && !selectedChip && !selectedTaskId) return;
   ```

2. In the `handleKeyDown` handler, add `onTaskSelect?.(null)` alongside the existing clears:
   ```ts
   const handleKeyDown = (e: KeyboardEvent) => {
     if (e.key === 'Escape') {
       setSelectingPredecessorFor(null);
       setSelectedChip(null);
       onSelectedChipChange?.(null);
       onTaskSelect?.(null);   // <-- ADD THIS
     }
   };
   ```

3. In the `handleMouseDown` handler, add `onTaskSelect?.(null)` for the outside-click path. The outside click already bails early when target is inside `overlayRef` or inside `.gantt-popover` — those guards mean the call only fires when clicking truly outside the task list:
   ```ts
   const handleMouseDown = (e: MouseEvent) => {
     const target = e.target as Element;
     if (overlayRef.current?.contains(target)) return;
     if (target.closest?.('.gantt-popover')) return;
     setSelectingPredecessorFor(null);
     setSelectedChip(null);
     onSelectedChipChange?.(null);
     onTaskSelect?.(null);   // <-- ADD THIS
   };
   ```

4. Add `selectedTaskId` and `onTaskSelect` to the `useEffect` dependency array:
   ```ts
   }, [selectingPredecessorFor, selectedChip, selectedTaskId, onTaskSelect, onSelectedChipChange]);
   ```

No other changes needed. GanttChart's `handleTaskSelect` already calls `setSelectedTaskId(taskId)` and accepts `null`, so calling `onTaskSelect(null)` from TaskList will correctly clear the highlight in GanttChart state, which propagates back via the `selectedTaskId` prop.
  </action>
  <verify>
    <automated>cd D:/Projects/gantt-lib && npm run build --workspace=packages/gantt-lib 2>&1 | tail -5</automated>
  </verify>
  <done>
    - Build passes with no TypeScript errors
    - Pressing Escape while a task row is highlighted clears the highlight
    - Clicking on the chart area (outside the task list) clears the row highlight
    - Clicking within the task list does NOT clear the selection
  </done>
</task>

</tasks>

<verification>
Manual smoke test after build:
1. Open the demo app with the task list visible
2. Click any task row — it highlights
3. Press Escape — highlight clears
4. Click the task row again — it highlights
5. Click anywhere on the gantt chart grid area — highlight clears
6. Verify clicking inside the task list (on another row or header) does NOT clear selection unintentionally (row click sets new selection, header click has no effect on selection)
</verification>

<success_criteria>
- TypeScript build passes with no new errors
- Escape key deselects highlighted task row
- Click outside TaskList overlay deselects highlighted task row
- Click inside TaskList overlay does not unexpectedly clear selection
</success_criteria>

<output>
After completion, create `.planning/quick/99-esc/quick-099-SUMMARY.md`
</output>
