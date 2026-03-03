---
phase: quick-042
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
  - packages/gantt-lib/src/components/TaskList/TaskList.css
autonomous: true
requirements: [QUICK-042]

must_haves:
  truths:
    - "When a chip in the Связи cell is selected (gantt-tl-dep-chip-selected), a small trash icon button appears inline immediately to its right"
    - "Clicking the trash button deletes the dependency (same effect as the predecessor-row Удалить button)"
    - "The trash button does not appear when the chip is not selected"
    - "The predecessor-row Удалить label (isSelectedPredecessor path) is unchanged and still works"
  artifacts:
    - path: "packages/gantt-lib/src/components/TaskList/TaskListRow.tsx"
      provides: "Chip wrapper + trash button rendered when isChipSelected is true"
      contains: "gantt-tl-dep-chip-wrapper"
    - path: "packages/gantt-lib/src/components/TaskList/TaskList.css"
      provides: "Styles for chip wrapper and trash button"
      contains: "gantt-tl-dep-chip-trash"
  key_links:
    - from: "gantt-tl-dep-chip-trash button"
      to: "handleDeleteSelected"
      via: "onClick prop"
      pattern: "onClick.*handleDeleteSelected"
---

<objective>
Render a small inline trash icon button immediately to the right of a dependency chip when that chip is selected (gantt-tl-dep-chip-selected class). Clicking the button removes the dependency. The existing predecessor-row "Удалить" button is left intact.

Purpose: Give the user a direct, contextual delete action on the successor row without requiring them to look at a different row.
Output: Modified TaskListRow.tsx and TaskList.css.
</objective>

<execution_context>
@C:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

Key facts from codebase:
- `handleDeleteSelected` is already defined in TaskListRow — call it from the trash button
- `isChipSelected` is already computed per chip inside the `visibleChips.map(...)` call
- The overflow Popover also renders chips — the trash button should appear there too when a chip is selected
- Do NOT touch the `isSelectedPredecessor` block (lines 281-291 in TaskListRow.tsx)

<interfaces>
From packages/gantt-lib/src/components/TaskList/TaskListRow.tsx (current chip rendering):

```tsx
// visibleChips.map — target section
{visibleChips.map(({ dep, label }) => {
  const isChipSelected =
    selectedChip?.successorId === task.id &&
    selectedChip?.predecessorId === dep.taskId &&
    selectedChip?.linkType === dep.type;
  return (
    <span
      key={`${dep.taskId}-${dep.type}`}
      className={`gantt-tl-dep-chip${isChipSelected ? ' gantt-tl-dep-chip-selected' : ''}`}
      onClick={(e) => handleChipClick(dep, e)}
    >
      {label}
    </span>
  );
})}

// handleDeleteSelected (already exists — reuse as-is)
const handleDeleteSelected = useCallback((e: React.MouseEvent) => {
  e.stopPropagation();
  if (!selectedChip) return;
  onRemoveDependency?.(selectedChip.successorId, selectedChip.predecessorId, selectedChip.linkType as LinkType);
  onChipSelect?.(null);
}, [selectedChip, onRemoveDependency, onChipSelect]);
```

Trash icon SVG paths (viewBox="0 0 24 24", stroke-based, size 12x12):
- `<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>`
- `<path d="M3 6h18"/>`
- `<path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>`
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Wrap selected chip + render inline trash button in TaskListRow.tsx</name>
  <files>packages/gantt-lib/src/components/TaskList/TaskListRow.tsx</files>
  <action>
In the `visibleChips.map(...)` section, wrap each chip+button pair in a `<span className="gantt-tl-dep-chip-wrapper">` when the chip is selected. When `isChipSelected` is false, render the chip span as before (no wrapper needed, but wrapping always is also fine for simplicity).

Recommended pattern — always wrap for simplicity:

```tsx
{visibleChips.map(({ dep, label }) => {
  const isChipSelected =
    selectedChip?.successorId === task.id &&
    selectedChip?.predecessorId === dep.taskId &&
    selectedChip?.linkType === dep.type;
  return (
    <span key={`${dep.taskId}-${dep.type}`} className="gantt-tl-dep-chip-wrapper">
      <span
        className={`gantt-tl-dep-chip${isChipSelected ? ' gantt-tl-dep-chip-selected' : ''}`}
        onClick={(e) => handleChipClick(dep, e)}
      >
        {label}
      </span>
      {isChipSelected && !disableDependencyEditing && (
        <button
          type="button"
          className="gantt-tl-dep-chip-trash"
          onClick={handleDeleteSelected}
          aria-label="Удалить связь"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
            <path d="M3 6h18"/>
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      )}
    </span>
  );
})}
```

Apply the same pattern inside the overflow Popover's `chips.map(...)` block (inside `gantt-tl-dep-overflow-item`). Wrap the chip span and conditionally render the trash button in the same way.

Do NOT modify the `isSelectedPredecessor` block or `handleDeleteSelected` function — they stay exactly as they are.
  </action>
  <verify>
    <automated>cd D:/Projects/gantt-lib && npx tsc -p packages/gantt-lib/tsconfig.json --noEmit 2>&1 | head -30</automated>
  </verify>
  <done>TypeScript compiles with no errors. The chip wrapper and trash button are present in JSX for both the visible chip list and overflow popover.</done>
</task>

<task type="auto">
  <name>Task 2: Add CSS for chip wrapper and trash button in TaskList.css</name>
  <files>packages/gantt-lib/src/components/TaskList/TaskList.css</files>
  <action>
Append the following rules after the existing `.gantt-tl-dep-chip-selected` block (around line 278):

```css
/* Chip + trash button wrapper — keeps chip and delete button visually inline */
.gantt-tl-dep-chip-wrapper {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

/* Inline trash button — shown only when chip is selected */
.gantt-tl-dep-chip-trash {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 3px;
  padding: 1px;
  cursor: pointer;
  color: #6b7280;
  flex-shrink: 0;
  line-height: 0;
}

.gantt-tl-dep-chip-trash:hover {
  background-color: rgba(239, 68, 68, 0.12);
  color: #dc2626;
}
```

These styles keep the wrapper as a neutral inline-flex container and give the button a subtle red hover state to hint at destructive action.
  </action>
  <verify>
    <automated>cd D:/Projects/gantt-lib && grep -n "gantt-tl-dep-chip-wrapper\|gantt-tl-dep-chip-trash" packages/gantt-lib/src/components/TaskList/TaskList.css</automated>
  </verify>
  <done>Both `.gantt-tl-dep-chip-wrapper` and `.gantt-tl-dep-chip-trash` classes exist in TaskList.css with correct display and hover properties.</done>
</task>

</tasks>

<verification>
1. TypeScript build passes: `npx tsc -p packages/gantt-lib/tsconfig.json --noEmit`
2. Clicking a dep chip on a successor row selects it (chip turns dark blue)
3. A small trash icon appears inline to the right of the selected chip
4. Clicking the trash icon removes the dependency — chip disappears, predecessor row resets
5. The predecessor row's "Зависит от / Удалить" button still appears and still works
6. Non-selected chips show no trash icon
</verification>

<success_criteria>
- Selected dep chip displays an inline trash button immediately to its right
- Trash button calls handleDeleteSelected which removes the dep and clears chip selection
- disableDependencyEditing=true hides the trash button (guard already in JSX condition)
- No TypeScript errors
- Predecessor-row "Удалить" button untouched and functional
</success_criteria>

<output>
After completion, create `.planning/quick/042-dep-chip-trash-button/042-SUMMARY.md` following the summary template.
</output>
