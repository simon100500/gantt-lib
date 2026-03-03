---
phase: quick-040
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
  - packages/gantt-lib/src/components/TaskList/TaskList.css
autonomous: true
requirements: [QUICK-040]

must_haves:
  truths:
    - "When a chip is selected, the predecessor row's Связи cell shows only 'Зависит от [successor name]' — no chips, no + button"
    - "Hovering over that element changes the text to 'Удалить'"
    - "Clicking the element deletes the dependency (same as before)"
  artifacts:
    - path: "packages/gantt-lib/src/components/TaskList/TaskListRow.tsx"
      provides: "Predecessor deps cell full-replacement rendering when isSelectedPredecessor"
    - path: "packages/gantt-lib/src/components/TaskList/TaskList.css"
      provides: "Hover text swap via CSS: .gantt-tl-dep-delete-label + :hover .gantt-tl-dep-delete-hover"
  key_links:
    - from: "TaskListRow isSelectedPredecessor branch"
      to: "handleDeleteSelected"
      via: "onClick on the replacement element"
      pattern: "handleDeleteSelected"
---

<objective>
Replace the predecessor row's Связи cell content with a single "Зависит от [name]" element when a chip is selected, with hover state showing "Удалить".

Purpose: Cleaner UX — the predecessor row communicates the selected relationship contextually instead of showing its own chips alongside a floating delete button.
Output: Modified TaskListRow.tsx + CSS hover trick rule.
</objective>

<execution_context>
@D:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@.planning/STATE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Replace predecessor deps cell content + CSS hover text swap</name>
  <files>packages/gantt-lib/src/components/TaskList/TaskListRow.tsx, packages/gantt-lib/src/components/TaskList/TaskList.css</files>
  <action>
Two changes, one task.

**TaskListRow.tsx — predecessor cell replacement**

The existing deps cell JSX (lines 258-338) renders chips, overflow popover, delete button, and add button.

When `isSelectedPredecessor && !disableDependencyEditing` is true, replace ALL cell content with a single button element. Do NOT render chips, overflow, or the + button in this branch.

To get the successor task name, derive it inside the component:
```tsx
const successorTaskName = useMemo(() => {
  if (!selectedChip) return '';
  const t = allTasks.find(t => t.id === selectedChip.successorId);
  return t?.name ?? '';
}, [selectedChip, allTasks]);
```

Replacement JSX inside the deps cell when `isSelectedPredecessor && !disableDependencyEditing`:
```tsx
<button
  type="button"
  className="gantt-tl-dep-delete-label"
  onClick={handleDeleteSelected}
  aria-label="Удалить связь"
>
  <span className="gantt-tl-dep-delete-label-default">Зависит от {successorTaskName}</span>
  <span className="gantt-tl-dep-delete-label-hover">Удалить</span>
</button>
```

The existing `{isSelectedPredecessor && !disableDependencyEditing && (<button ... Удалить</button>)}` block (lines 315-325) must be REMOVED — it is superseded by the new branch.

The full deps cell structure becomes:
```tsx
<div
  className="gantt-tl-cell gantt-tl-cell-deps"
  onClick={isPicking && !isSourceRow ? handlePredecessorPick : undefined}
>
  {isSelectedPredecessor && !disableDependencyEditing ? (
    <button
      type="button"
      className="gantt-tl-dep-delete-label"
      onClick={handleDeleteSelected}
      aria-label="Удалить связь"
    >
      <span className="gantt-tl-dep-delete-label-default">Зависит от {successorTaskName}</span>
      <span className="gantt-tl-dep-delete-label-hover">Удалить</span>
    </button>
  ) : (
    <>
      {/* Visible chips (max 2) */}
      {visibleChips.map(({ dep, label }) => {
        const isChipSelected = ...;
        return (<span ...>{label}</span>);
      })}

      {/* Overflow Popover */}
      {hiddenChips.length > 0 && (...)}

      {/* "+" add button */}
      {!disableDependencyEditing && !isPicking && (...)}
    </>
  )}
</div>
```

**TaskList.css — hover text swap**

Add after the existing `.gantt-tl-dep-delete-selected` block:

```css
/* Predecessor cell full-replacement: "Зависит от [name]" → hover → "Удалить" */
.gantt-tl-dep-delete-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  background: transparent;
  border: none;
  border-radius: 4px;
  padding: 2px 4px;
  font-size: 0.75rem;
  font-family: inherit;
  cursor: pointer;
  color: #374151;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;
}

.gantt-tl-dep-delete-label-hover {
  display: none;
  color: #ef4444;
  font-weight: 600;
}

.gantt-tl-dep-delete-label:hover .gantt-tl-dep-delete-label-default {
  display: none;
}

.gantt-tl-dep-delete-label:hover .gantt-tl-dep-delete-label-hover {
  display: inline;
}
```

Remove (or leave as-is since unused) the `.gantt-tl-dep-delete-selected` and `.gantt-tl-dep-delete-selected:hover` rules — the old red button class is no longer rendered. Leaving dead CSS is acceptable; removing is cleaner. Remove them.
  </action>
  <verify>
    <automated>cd D:/Projects/gantt-lib && npx tsc --noEmit -p packages/gantt-lib/tsconfig.json 2>&1 | head -20</automated>
  </verify>
  <done>
- Predecessor deps cell shows "Зависит от [successor name]" as full-width button when chip selected
- Hovering changes text to red "Удалить"
- Clicking deletes the dependency and clears selectedChip
- No chips/+ button visible in the predecessor cell during this state
- TypeScript compiles clean
  </done>
</task>

</tasks>

<verification>
Manual check: select a chip on a successor row, observe that the predecessor row's Связи cell is entirely replaced by "Зависит от [name]". Hover: text becomes "Удалить". Click: dependency is removed.
</verification>

<success_criteria>
Predecessor row Связи cell fully replaced (no chips, no +) when chip selected. Hover text swap works. Delete on click works.
</success_criteria>

<output>
After completion, create `.planning/quick/040-dep-delete-zuvisit-ot-hover/040-SUMMARY.md`
</output>
