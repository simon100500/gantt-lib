---
phase: quick-048
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
  - packages/gantt-lib/src/components/TaskList/TaskList.css
autonomous: true
requirements: [QUICK-048]
must_haves:
  truths:
    - "Clicking a dep chip in the popover selects it and highlights the SVG arrow (same as in the cell)"
    - "Hovering a dep chip in the popover reveals the trash button (same as hovering a chip in the cell)"
    - "Clicking the trash button on a popover chip deletes the dep (same as in the cell)"
    - "Single-chip cell behavior is unchanged"
  artifacts:
    - path: "packages/gantt-lib/src/components/TaskList/TaskListRow.tsx"
      provides: "Unified DepChip local component used both in cell and popover"
    - path: "packages/gantt-lib/src/components/TaskList/TaskList.css"
      provides: "Hover-based trash visibility for chip wrapper"
  key_links:
    - from: "DepChip (inside popover)"
      to: "handleChipClick + onChipSelect + onScrollToTask"
      via: "onClick prop passed down into unified component"
      pattern: "handleChipClick"
---

<objective>
Unify dep chip rendering so the same component and behavior is used both in the deps cell (1-dep case) and inside the overflow popover (2+ deps case).

Purpose: Currently the popover has a plain non-interactive chip span with a permanently-visible trash button — it doesn't select the dep, doesn't highlight the arrow, and doesn't match the single-chip pattern. The user wants identical behavior everywhere.
Output: A single `DepChip` local component (defined inside TaskListRow.tsx) rendered in both contexts. Hover shows trash, click selects, trash deletes.
</objective>

<execution_context>
@D:/Projects/gantt-lib/.planning/quick/48-unified-dep-chip/48-PLAN.md
</execution_context>

<context>
@D:/Projects/gantt-lib/.planning/STATE.md
@D:/Projects/gantt-lib/packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
@D:/Projects/gantt-lib/packages/gantt-lib/src/components/TaskList/TaskList.css
</context>

<tasks>

<task type="auto">
  <name>Task 1: Extract DepChip component and wire it into cell and popover</name>
  <files>packages/gantt-lib/src/components/TaskList/TaskListRow.tsx</files>
  <action>
Define a local `DepChip` functional component INSIDE TaskListRow.tsx (above or inline — NOT a separate file, to keep context minimal). It receives:

```typescript
interface DepChipProps {
  label: string;
  dep: { taskId: string; type: LinkType };
  taskId: string;                  // the successor task.id
  selectedChip: TaskListRowProps['selectedChip'];
  disableDependencyEditing: boolean;
  onChipSelect: TaskListRowProps['onChipSelect'];
  onRowClick: TaskListRowProps['onRowClick'];
  onScrollToTask: TaskListRowProps['onScrollToTask'];
  onRemoveDependency: TaskListRowProps['onRemoveDependency'];
  onChipSelectClear: () => void;   // alias: onChipSelect?.(null)
}
```

Behavior of DepChip:
- Renders a `.gantt-tl-dep-chip-wrapper` wrapping:
  1. A `<span className={...}>` for the chip label — same selected-state logic as current single-chip code. `onClick` → calls the same `handleChipClick` logic (check isSame, toggle, call onChipSelect, onRowClick, onScrollToTask).
  2. A `<button className="gantt-tl-dep-chip-trash">` — always rendered (NOT conditionally), hidden by default via CSS class `gantt-tl-dep-chip-trash` (see Task 2 for CSS). Only shown on wrapper hover OR when chip is selected. `onClick` → calls onRemoveDependency + onChipSelectClear. Only rendered when `!disableDependencyEditing`.

Implementation notes:
- Do NOT lift state into DepChip. It receives everything via props.
- The `handleChipClick` logic currently in TaskListRow can be extracted as a plain helper or kept inline inside DepChip — either is fine, just avoid duplicating the toggle logic.
- After defining DepChip, update TaskListRow JSX:
  - **Single-chip case (chips.length === 1):** Replace the existing `<span className="gantt-tl-dep-chip-wrapper">...</span>` block with `<DepChip ... />`. Remove the conditionally-rendered trash button JSX — DepChip handles it internally.
  - **Popover items (chips.length >= 2):** Replace each `<div className="gantt-tl-dep-overflow-item">` contents with `<DepChip ... />`. Remove the explicit trash `<button>` from the overflow item — DepChip handles it internally.
- The `<div className="gantt-tl-dep-overflow-item">` wrapper may be kept or removed — since DepChip renders a wrapper itself, the outer div is now redundant. Simplest: remove `gantt-tl-dep-overflow-item` divs and render `<DepChip />` directly as list children inside `.gantt-tl-dep-overflow-list`.
- Pass `onChipSelectClear={() => onChipSelect?.(null)}` to DepChip.
- The `handleChipClick` in TaskListRow (currently used by single chip) should be reused as the click handler inside DepChip — either pass it as a prop or replicate the 5-line logic inside DepChip (acceptable for a local component).
  </action>
  <verify>
TypeScript compiles without errors: `cd D:/Projects/gantt-lib && npm run build -w packages/gantt-lib 2>&1 | tail -20`
  </verify>
  <done>
- DepChip is defined once and used in both chip.length===1 cell path and chips.length>=2 popover path.
- No duplicate trash-button JSX remains in TaskListRow outside DepChip.
- Build passes with no TypeScript errors.
  </done>
</task>

<task type="auto">
  <name>Task 2: CSS — hover-based trash visibility on chip wrapper</name>
  <files>packages/gantt-lib/src/components/TaskList/TaskList.css</files>
  <action>
Currently `.gantt-tl-dep-chip-trash` is always visible when rendered (no CSS hiding). In the old code it was conditionally rendered in JSX; in the new unified DepChip it is always rendered but must be hidden by default and shown on hover or selection.

Make these CSS changes:

1. Add `display: none;` to `.gantt-tl-dep-chip-trash` as a default hidden state.

2. Add hover rule on the wrapper to show trash:
```css
.gantt-tl-dep-chip-wrapper:hover .gantt-tl-dep-chip-trash {
  display: inline-flex;
}
```

3. Add selected-state rule to show trash even without hover (chip is selected = trash stays visible):
```css
.gantt-tl-dep-chip-wrapper:has(.gantt-tl-dep-chip-selected) .gantt-tl-dep-chip-trash {
  display: inline-flex;
}
```

Note: `:has()` is supported in all modern browsers. If there is a project constraint against it (check existing CSS for usage), fall back to a JS className approach instead: when chip is selected, add `gantt-tl-dep-chip-wrapper--selected` to the wrapper and use that class for the CSS rule. But prefer `:has()` — check the existing CSS file for prior usage patterns.

4. Keep existing `.gantt-tl-dep-chip-trash:hover` background-color rule unchanged.

5. The `.gantt-tl-dep-overflow-item` rule (`justify-content: space-between; gap: 8px`) can be removed if that class is no longer used in JSX after Task 1. If kept for safety, leave it — it won't affect layout since DepChip uses wrapper flex.
  </action>
  <verify>
Visually: render a task with 1 dep → chip visible, trash hidden → hover chip → trash appears → click chip → chip turns blue/selected, trash stays → click trash → dep removed.
Render a task with 2+ deps → click "N связей" → popover opens → each chip has no visible trash → hover chip in popover → trash appears → click chip → chip selected, arrow highlights → click trash → dep removed.
  </verify>
  <done>
- Trash button is hidden by default on all chips.
- Trash appears on hover over the chip wrapper.
- Trash remains visible when the chip is selected.
- Behavior is visually identical for cell chips and popover chips.
  </done>
</task>

</tasks>

<verification>
After both tasks:
1. `npm run build -w packages/gantt-lib` passes with no TypeScript errors.
2. Manual check: 1-dep task → chip behavior unchanged (click selects, hover shows trash, trash deletes).
3. Manual check: 2+-dep task → summary chip opens popover → each dep chip inside is clickable (selects dep, highlights arrow), hoverable (shows trash), trash-deletable.
4. No duplicate JSX patterns for trash buttons in TaskListRow.tsx.
</verification>

<success_criteria>
One `DepChip` component used in both rendering contexts. Identical hover-to-show-trash and click-to-select behavior regardless of whether the chip is in the cell or the popover.
</success_criteria>

<output>
After completion, create `.planning/quick/48-unified-dep-chip/48-SUMMARY.md` with what was done, files changed, and commit hash.
</output>
