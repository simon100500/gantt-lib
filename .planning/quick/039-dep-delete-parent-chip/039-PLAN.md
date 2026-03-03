---
phase: quick-039
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/TaskList/TaskList.tsx
  - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
  - packages/gantt-lib/src/components/TaskList/TaskList.css
autonomous: true
requirements: [QUICK-039]

must_haves:
  truths:
    - "Chips have no × button — clicking a chip selects it"
    - "Clicking a chip highlights the predecessor (parent) row's Связи cell with a 'Удалить' button"
    - "Clicking 'Удалить' removes the dependency and clears the selection"
    - "Clicking outside or pressing Escape clears the chip selection"
    - "Overflow Popover chips also trigger predecessor-side delete"
  artifacts:
    - path: "packages/gantt-lib/src/components/TaskList/TaskListRow.tsx"
      provides: "chip click handler, no × button, predecessor delete button rendering"
    - path: "packages/gantt-lib/src/components/TaskList/TaskList.tsx"
      provides: "selectedChip state (successorId, predecessorId, linkType) passed down"
    - path: "packages/gantt-lib/src/components/TaskList/TaskList.css"
      provides: "chip selected state, predecessor delete button styles"
  key_links:
    - from: "chip onClick in TaskListRow (successor row)"
      to: "onChipSelect callback → selectedChip state in TaskList"
      via: "prop callback"
    - from: "selectedChip state"
      to: "predecessor row rendering 'Удалить' button"
      via: "task.id === selectedChip.predecessorId check in TaskListRow"
---

<objective>
Change dependency deletion UX: remove the × button from chips. Instead, clicking a chip on a successor row causes a "Удалить" button to appear on the predecessor (parent) row's Связи cell. This symmetrizes the UX — both add and delete operations originate from the predecessor side.

Purpose: Cleaner chip appearance, consistent "from parent" interaction model for dependency management.
Output: Modified TaskListRow (no chip ×, chip click → select, predecessor row shows delete button), TaskList (selectedChip state), CSS (chip selected style + delete button style).
</objective>

<execution_context>
@D:/Projects/gantt-lib/.planning/quick/039-dep-delete-parent-chip/039-PLAN.md
</execution_context>

<context>
@D:/Projects/gantt-lib/packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
@D:/Projects/gantt-lib/packages/gantt-lib/src/components/TaskList/TaskList.tsx
@D:/Projects/gantt-lib/packages/gantt-lib/src/components/TaskList/TaskList.css

<interfaces>
<!-- Current dependency removal flow (to replace) -->
<!-- TaskListRow receives: onRemoveDependency?: (taskId, predecessorTaskId, linkType) => void -->
<!-- Chips render an × button that calls handleRemoveChip(dep, e) on click -->

<!-- New flow -->
<!-- TaskList holds: selectedChip: { successorId, predecessorId, linkType } | null -->
<!-- TaskListRow receives: selectedChip (read), onChipSelect callback -->
<!-- - On chip click: calls onChipSelect({ successorId: task.id, predecessorId: dep.taskId, linkType: dep.type }) -->
<!-- - If task.id === selectedChip.predecessorId: render "Удалить" button in deps cell -->
<!-- - "Удалить" click: calls onRemoveDependency(selectedChip.successorId, selectedChip.predecessorId, selectedChip.linkType) then clears selectedChip -->
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add selectedChip state to TaskList, pass down to TaskListRow</name>
  <files>packages/gantt-lib/src/components/TaskList/TaskList.tsx</files>
  <action>
In TaskList.tsx:

1. Add selectedChip state:
```typescript
const [selectedChip, setSelectedChip] = useState<{
  successorId: string;
  predecessorId: string;
  linkType: LinkType;
} | null>(null);
```

2. Add handleChipSelect callback:
```typescript
const handleChipSelect = useCallback((chip: { successorId: string; predecessorId: string; linkType: LinkType } | null) => {
  setSelectedChip(chip);
}, []);
```

3. Add click-outside and Escape clearing for selectedChip (combine with existing picker mode effect or add a new effect that checks selectedChip). When user clicks outside overlayRef, clear selectedChip. When Escape pressed, also clear selectedChip. The simplest approach: add `selectedChip` to the existing picker effect so both states clear on outside click/Escape.

4. Pass to each TaskListRow:
- `selectedChip={selectedChip}` (new prop)
- `onChipSelect={handleChipSelect}` (new prop)
- Keep `onRemoveDependency={handleRemoveDependency}` (unchanged — TaskListRow will call it from the predecessor row's Удалить button)

Do NOT remove handleRemoveDependency — it is now called from the predecessor row, not the chip row.
  </action>
  <verify>TypeScript compiles: npx tsc --noEmit --project packages/gantt-lib/tsconfig.json 2>&1 | head -20</verify>
  <done>TaskList has selectedChip state, passes selectedChip and onChipSelect to each TaskListRow</done>
</task>

<task type="auto">
  <name>Task 2: Rework TaskListRow chip rendering and add predecessor delete button</name>
  <files>
    packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
    packages/gantt-lib/src/components/TaskList/TaskList.css
  </files>
  <action>
In TaskListRow.tsx:

1. Add new props to TaskListRowProps interface:
```typescript
/** Currently selected chip (for predecessor-side delete) */
selectedChip?: { successorId: string; predecessorId: string; linkType: string } | null;
/** Callback when a chip is clicked (selects it) */
onChipSelect?: (chip: { successorId: string; predecessorId: string; linkType: LinkType } | null) => void;
```

2. Destructure in the component: `selectedChip, onChipSelect`

3. Remove handleRemoveChip handler (no longer needed in this file — deletion is triggered from predecessor row).

4. Add handleChipClick handler:
```typescript
const handleChipClick = useCallback((dep: { taskId: string; type: LinkType }, e: React.MouseEvent) => {
  e.stopPropagation();
  if (disableDependencyEditing) return;
  // Toggle: clicking same chip deselects
  const isSame = selectedChip?.successorId === task.id && selectedChip?.predecessorId === dep.taskId && selectedChip?.linkType === dep.type;
  onChipSelect?.(isSame ? null : { successorId: task.id, predecessorId: dep.taskId, linkType: dep.type });
}, [selectedChip, task.id, disableDependencyEditing, onChipSelect]);
```

5. Determine if this row is the predecessor for the selected chip:
```typescript
const isSelectedPredecessor = selectedChip != null && selectedChip.predecessorId === task.id;
```

6. Add handleDeleteSelected for the predecessor delete button:
```typescript
const handleDeleteSelected = useCallback((e: React.MouseEvent) => {
  e.stopPropagation();
  if (!selectedChip) return;
  onRemoveDependency?.(selectedChip.successorId, selectedChip.predecessorId, selectedChip.linkType as LinkType);
  onChipSelect?.(null);
}, [selectedChip, onRemoveDependency, onChipSelect]);
```

7. In chip rendering (visibleChips and hiddenChips overflow Popover):
- Remove the × button (`gantt-tl-dep-chip-remove`) entirely from BOTH chip locations
- Add onClick to the chip span: `onClick={(e) => handleChipClick(dep, e)}`
- Add CSS class for selected state: add `gantt-tl-dep-chip-selected` when `selectedChip?.successorId === task.id && selectedChip?.predecessorId === dep.taskId && selectedChip?.linkType === dep.type`

8. In the dependencies cell (`gantt-tl-cell-deps`), after the visibleChips and overflow trigger, add the predecessor delete button:
```tsx
{isSelectedPredecessor && !disableDependencyEditing && (
  <button
    type="button"
    className="gantt-tl-dep-delete-selected"
    onClick={handleDeleteSelected}
    aria-label="Удалить связь"
  >
    Удалить
  </button>
)}
```
Place this button BEFORE the "+" add button. The "+" add button remains unchanged.

In TaskList.css:

1. Remove or comment out the `gantt-tl-dep-chip-remove` hover rule `.gantt-tl-dep-chip:hover .gantt-tl-dep-chip-remove` — the button no longer exists.
   Keep the `.gantt-tl-dep-chip-remove` class styles only if needed for overflow list (overflow list also no longer has ×).
   Actually: remove all `gantt-tl-dep-chip-remove` and `gantt-tl-dep-overflow-remove` rules since those buttons are eliminated.

2. Make chip clickable (cursor: pointer):
```css
.gantt-tl-dep-chip {
  cursor: pointer;
}
```

3. Add selected chip style:
```css
.gantt-tl-dep-chip-selected {
  background-color: rgba(59, 130, 246, 0.3);
  border-color: rgba(59, 130, 246, 0.7);
  font-weight: 600;
}
```

4. Add predecessor delete button style:
```css
.gantt-tl-dep-delete-selected {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: #ef4444;
  color: #ffffff;
  border: none;
  border-radius: 4px;
  padding: 1px 6px;
  font-size: 0.7rem;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
}

.gantt-tl-dep-delete-selected:hover {
  background-color: #dc2626;
}
```
  </action>
  <verify>npx tsc --noEmit --project packages/gantt-lib/tsconfig.json 2>&1 | head -20</verify>
  <done>
    - Chips have no × button, clicking a chip calls onChipSelect
    - Selected chip has visual highlight (gantt-tl-dep-chip-selected)
    - Predecessor row shows red "Удалить" button in its Связи cell when isSelectedPredecessor=true
    - Clicking "Удалить" calls onRemoveDependency and clears selection
    - TypeScript compiles without errors
  </done>
</task>

</tasks>

<verification>
After both tasks complete:
1. Run: `npx tsc --noEmit --project packages/gantt-lib/tsconfig.json` — must pass with 0 errors
2. Manual smoke test in the demo:
   - Task B depends on Task A (chip shows on Task B's row)
   - Click the chip on Task B's row → chip highlights, Task A's row shows red "Удалить" button
   - Click "Удалить" on Task A's row → dependency removed, chip disappears, button disappears
   - Click chip, then click elsewhere or press Escape → selection clears
   - Chips have NO × button in any state (not on hover, not normally)
</verification>

<success_criteria>
- No × button visible on any chip (neither inline nor in overflow Popover)
- Chip click selects it and highlights the predecessor row with a "Удалить" button
- "Удалить" button on predecessor row removes the dependency
- Clicking same chip again deselects (toggle)
- Escape and outside-click clear selection
- disableDependencyEditing=true: no chip selection, no "Удалить" button
- Zero TypeScript errors
</success_criteria>

<output>
After completion, create `.planning/quick/039-dep-delete-parent-chip/039-SUMMARY.md` with:
- What was changed
- New interaction model description
- Files modified
</output>
