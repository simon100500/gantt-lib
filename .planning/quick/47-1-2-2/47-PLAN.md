---
phase: quick-047
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
  - packages/gantt-lib/src/components/TaskList/TaskList.css
autonomous: true
requirements: [QUICK-047]
must_haves:
  truths:
    - "1 dependency: single chip shown directly in cell (click selects it, trash deletes)"
    - "2+ dependencies: only a gray 'N связей' chip shown; clicking it opens popover with all deps"
    - "Inside the popover each dep row has a direct trash button that deletes without needing prior selection"
    - "Deletion from popover works correctly (no stale state bug)"
  artifacts:
    - path: "packages/gantt-lib/src/components/TaskList/TaskListRow.tsx"
      provides: "Updated chip rendering logic"
    - path: "packages/gantt-lib/src/components/TaskList/TaskList.css"
      provides: "Styles for N-связей summary chip"
  key_links:
    - from: "TaskListRow chips array"
      to: "Popover with direct delete buttons"
      via: "chips.length >= 2 branch"
---

<objective>
Simplify the dependency chips display in TaskListRow:
- 1 dep → show the single chip as-is (existing behavior)
- 2+ deps → show only a single gray "N связей" summary chip that opens a Popover with all dep chips inside

Fix deletion from popover: instead of requiring chip selection first, each dep row in the popover gets a direct trash button that calls onRemoveDependency immediately.

Purpose: Simpler, less cluttered deps cell; working delete from popover.
Output: Updated TaskListRow.tsx and TaskList.css
</objective>

<execution_context>
@D:/Projects/gantt-lib/.planning/quick/47-1-2-2/47-PLAN.md
</execution_context>

<context>
@D:/Projects/gantt-lib/packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
@D:/Projects/gantt-lib/packages/gantt-lib/src/components/TaskList/TaskList.css
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update chip rendering logic and fix popover deletion</name>
  <files>
    packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
    packages/gantt-lib/src/components/TaskList/TaskList.css
  </files>
  <action>
**In TaskListRow.tsx:**

1. Remove the current `visibleChips` / `hiddenChips` split logic (lines 104-105):
   ```ts
   // DELETE these two lines:
   const visibleChips = chips.length >= 3 ? chips.slice(0, 1) : chips.slice(0, 2);
   const hiddenChips  = chips.length >= 3 ? chips.slice(1)    : chips.slice(2);
   ```

2. Add a `useState` for popover open state to keep the popover open after delete:
   ```ts
   const [overflowOpen, setOverflowOpen] = useState(false);
   ```

3. In the deps cell JSX (the `<>` fragment inside the normal render branch), replace the current visibleChips map + overflow Popover with the following logic:

   **Case: chips.length === 0** — render nothing (existing: no chips, just the + button)

   **Case: chips.length === 1** — render the single chip exactly as before (with chip-wrapper, chip, and conditional trash button). Copy the existing single-chip rendering from the visibleChips.map block. The chip click selects it; trash button calls handleDeleteSelected (which reads selectedChip from props — this still works for the single-chip case).

   **Case: chips.length >= 2** — render ONLY the "N связей" summary chip as a Popover trigger. Inside the PopoverContent, render all chips in a list where each row has:
   - The chip label span (styled as `gantt-tl-dep-chip`, no selection highlighting needed)
   - A direct trash button that calls `onRemoveDependency?.(task.id, dep.taskId, dep.type)` and calls `onChipSelect?.(null)` — NO dependency on selectedChip state

   Use controlled Popover with `open={overflowOpen}` and `onOpenChange={setOverflowOpen}` so the popover stays open after a chip is deleted (because Radix uncontrolled popovers may close on DOM changes). Actually use uncontrolled but add `onClick={(e) => e.stopPropagation()}` on the PopoverContent wrapper.

   The summary chip button should have class `gantt-tl-dep-summary-chip` (new class) styled as gray.

**New JSX structure for chips.length >= 2:**

```tsx
{chips.length >= 2 ? (
  <Popover open={overflowOpen} onOpenChange={setOverflowOpen}>
    <PopoverTrigger asChild>
      <button
        type="button"
        className="gantt-tl-dep-summary-chip"
        onClick={(e) => { e.stopPropagation(); setOverflowOpen(v => !v); }}
      >
        {chips.length} связ{chips.length === 1 ? 'ь' : chips.length >= 2 && chips.length <= 4 ? 'и' : 'ей'}
      </button>
    </PopoverTrigger>
    <PopoverContent portal={true} align="start">
      <div className="gantt-tl-dep-overflow-list" onClick={(e) => e.stopPropagation()}>
        {chips.map(({ dep, label }) => (
          <div key={`${dep.taskId}-${dep.type}`} className="gantt-tl-dep-overflow-item">
            <span className="gantt-tl-dep-chip">{label}</span>
            {!disableDependencyEditing && (
              <button
                type="button"
                className="gantt-tl-dep-chip-trash"
                aria-label="Удалить связь"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveDependency?.(task.id, dep.taskId, dep.type);
                  onChipSelect?.(null);
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                  <path d="M3 6h18" />
                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>
    </PopoverContent>
  </Popover>
) : chips.length === 1 ? (
  /* Single chip — select + trash pattern */
  <span className="gantt-tl-dep-chip-wrapper">
    <span
      className={`gantt-tl-dep-chip${
        selectedChip?.successorId === task.id &&
        selectedChip?.predecessorId === chips[0].dep.taskId &&
        selectedChip?.linkType === chips[0].dep.type
          ? ' gantt-tl-dep-chip-selected'
          : ''
      }`}
      onClick={(e) => handleChipClick(chips[0].dep, e)}
    >
      {chips[0].label}
    </span>
    {selectedChip?.successorId === task.id &&
      selectedChip?.predecessorId === chips[0].dep.taskId &&
      selectedChip?.linkType === chips[0].dep.type &&
      !disableDependencyEditing && (
      <button
        type="button"
        className="gantt-tl-dep-chip-trash"
        onClick={handleDeleteSelected}
        aria-label="Удалить связь"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
          <path d="M3 6h18" />
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </button>
    )}
  </span>
) : null}
```

Note: Russian plural for "связь": 1 → связь, 2-4 → связи, 5+ → связей. Use a helper or inline ternary:
```ts
const linkWord = chips.length === 1 ? 'связь' : chips.length <= 4 ? 'связи' : 'связей';
// So the button text: `${chips.length} ${linkWord}`
```

**In TaskList.css:**

Add the new `.gantt-tl-dep-summary-chip` class (similar to `.gantt-tl-dep-overflow-trigger` but labeled differently):

```css
/* Summary chip: "N связей" — shown when 2+ deps */
.gantt-tl-dep-summary-chip {
  display: inline-flex;
  align-items: center;
  background-color: rgba(107, 114, 128, 0.12);
  border: 1px solid rgba(107, 114, 128, 0.3);
  border-radius: 4px;
  padding: 1px 6px;
  font-size: 0.7rem;
  color: #6b7280;
  cursor: pointer;
  white-space: nowrap;
  font-family: inherit;
}

.gantt-tl-dep-summary-chip:hover {
  background-color: rgba(59, 130, 246, 0.1);
  color: #1d4ed8;
  border-color: rgba(59, 130, 246, 0.3);
}
```

Also remove or keep `.gantt-tl-dep-overflow-trigger` (it is now unused since summary chip replaces it in all cases — remove it to keep CSS clean, or leave it — leave it for safety).
  </action>
  <verify>
    <automated>cd /d/Projects/gantt-lib && npx tsc --noEmit -p packages/gantt-lib/tsconfig.json 2>&1 | head -30</automated>
  </verify>
  <done>
    - 1 dep: single chip shown in cell, click selects, trash deletes
    - 2+ deps: gray "N связей" chip shown; clicking opens popover with all deps listed, each with direct trash button
    - Trash inside popover calls onRemoveDependency directly (no selectedChip dependency) — deletion works
    - TypeScript compiles without errors
  </done>
</task>

</tasks>

<verification>
1. Open the Gantt demo page with tasks that have 1, 2, and 3+ dependencies
2. For a task with 1 dep: verify single chip shown in the cell, chip click selects (highlighted), trash icon appears, clicking trash deletes the dep
3. For a task with 2 deps: verify only "2 связи" gray chip shown, clicking it opens popover with 2 entries each having a trash button; clicking trash deletes that dep and the popover remains open (now shows "1 связь" chip inline or the popover closes and a single chip appears)
4. For a task with 3+ deps: verify "N связей" chip with correct Russian plural, popover lists all, deletion works
</verification>

<success_criteria>
- Cells with 1 dep show single chip (not a summary chip)
- Cells with 2+ deps show only "N связей" summary chip
- Popover deletion works without requiring chip pre-selection
- TypeScript compiles cleanly
</success_criteria>

<output>
After completion, create `.planning/quick/47-1-2-2/47-SUMMARY.md` with what was changed.
</output>
