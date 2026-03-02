# Phase 14: dependencies-edit-task-list - Research

**Researched:** 2026-03-03
**Domain:** React component UI interaction — dependency editing in TaskList column
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Chip display format
- Chips: `ОН(2)`, `НН(5)` — type abbreviation + predecessor row index (rowIndex + 1)
- Overflow: show 2–3 chips, hide the rest behind `+N ещё` button
- Lag is NOT shown in the chip — only type and row number
- Add button `+` appears at the end of the chip list in the cell

#### Global link type switcher
- Switcher lives in the column header: `«Связи [ОН ▾]»`
- Click on header opens dropdown (Popover) with options: ОН, НН, ОО, НО (abbreviations only)
- Active type shown in brackets next to the word «Связи»
- Default type on TaskList open: ОН (= FS)

#### Predecessor picker mode
- After pressing `+` — TaskList enters predecessor selection mode
- In selection mode: rows in the «Связи» column are highlighted on hover
- Click on any row (except current task's row) — adds dependency with the selected global type
- Cancel: Escape OR click outside TaskList
- Cycle (A → B → A): block add + show error toast/message
- Self-reference: current task row not selectable

#### Dependency deletion
- Hover on chip → × appears; click → immediate delete (no confirmation)
- `+N ещё` button opens Popover with full dependency list; deletion available there too
- `disableDependencyEditing` prop (analogous to `disableTaskNameEditing`) — hides `+`, `×` and type menu; column becomes read-only

#### State location
- `activeLinkType` — stored in `TaskList`, passed down to `TaskListRow`
- `selectingPredecessorFor` — stored in `TaskList`, passed down to `TaskListRow`

#### LinkType mapping
- FS ↔ ОН (окончание→начало)
- SS ↔ НН (начало→начало)
- FF ↔ ОО (окончание→окончание)
- SF ↔ НО (начало→окончание)

#### Cycle detection
- Use existing `validateDependencies()` from `dependencyUtils.ts` (calls `detectCycles` internally)

### Claude's Discretion
- Positioning of `+N ещё` Popover (use existing Popover component)
- Exact animation/style of chips and × button
- Row highlight style in predecessor selection mode

### Deferred Ideas (OUT OF SCOPE)
- Lag editing for existing dependencies (separate phase)
- Changing the type of an already-created dependency via UI (separate phase)
</user_constraints>

---

## Summary

Phase 14 adds a **«Связи» (Dependencies) column** to the existing `TaskList` component. The feature is purely a UI interaction layer on top of the already-complete dependency data model (`Task.dependencies: TaskDependency[]`, `LinkType`, `validateDependencies()`). No new libraries are required — the column is built using the project's existing React/TypeScript stack, Radix UI `Popover`, and `gantt-tl-*` CSS class conventions.

The key interaction complexity is the **predecessor picker mode**: a two-click flow where a user presses `+` on a row, the entire TaskList enters a selection mode (`selectingPredecessorFor` state), rows become clickable targets, Escape or outside-click cancels. This is a well-understood interaction pattern that can be handled entirely with existing React state and DOM event listeners (the same `keydown` Escape pattern used throughout the project).

The chip overflow Popover (`+N ещё`) and the link type dropdown in the header both reuse the existing `Popover / PopoverContent / PopoverTrigger` component (Radix UI, `portal={true}`). No new UI primitive is needed.

**Primary recommendation:** Extend `TaskList` with `activeLinkType` + `selectingPredecessorFor` state, add `onAddDependency` / `onRemoveDependency` callbacks to `TaskListRow`, and render the new column with chips using inline CSS that follows the established `gantt-tl-*` prefix pattern.

---

## Standard Stack

### Core (already in project — no new installs needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18+ | Component state, event handling | Project foundation |
| TypeScript | strict | Props/state typing | Project-wide strict mode |
| `@radix-ui/react-popover` | already installed | Popover for type switcher + chip overflow list | Used in DatePicker; `portal={true}` prevents overflow-clip |
| CSS custom properties + `gantt-tl-*` classes | — | Styling with project-established prefix | Existing convention |

### Supporting (already in project)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `dependencyUtils.ts` → `validateDependencies()` | — | Cycle detection before adding a dependency | Every `onAddDependency` call |
| `detectCycles()` | — | Internal function used by `validateDependencies` | Not called directly |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Radix Popover for both type menu and chip overflow | Custom `<div>` dropdown | Radix already installed, handles portal, focus management, keyboard a11y for free |
| Inline state in `TaskList` | Lifting state to `GanttChart` | CONTEXT.md locked state in `TaskList`; no need for GanttChart to know about picker mode |

**Installation:** No new packages required.

---

## Architecture Patterns

### Recommended File Changes

```
packages/gantt-lib/src/components/TaskList/
├── TaskList.tsx          # Add activeLinkType, selectingPredecessorFor state; add column header; pass new props to TaskListRow
├── TaskListRow.tsx       # Add «Связи» cell with chips, + button, picker hover highlight
├── TaskList.css          # Add gantt-tl-dep-* CSS classes for the new column
packages/gantt-lib/src/components/GanttChart/
└── GanttChart.tsx        # Add disableDependencyEditing prop; pass through to TaskList
```

### Pattern 1: Column State Lifted to TaskList

**What:** `activeLinkType` (default `'FS'`) and `selectingPredecessorFor` (task ID or `null`) live in `TaskList`. They are passed as props to every `TaskListRow`.

**When to use:** State that is shared across all rows (the global type switcher affects all rows; only one row can be the picker target at a time).

```typescript
// In TaskList.tsx
const [activeLinkType, setActiveLinkType] = useState<LinkType>('FS');
const [selectingPredecessorFor, setSelectingPredecessorFor] = useState<string | null>(null);
```

### Pattern 2: Keyboard Cancel via useEffect on TaskList container

**What:** When `selectingPredecessorFor !== null`, attach a `keydown` listener for Escape to cancel. Also cancel on click outside the `.gantt-tl-overlay` element.

**Why:** The click-outside pattern is already handled in the Radix Popover for the type menu. For the picker mode itself, use a `document` level `mousedown` listener and ref comparison — the same pattern used everywhere in the codebase.

```typescript
// In TaskList.tsx
useEffect(() => {
  if (!selectingPredecessorFor) return;
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') setSelectingPredecessorFor(null);
  };
  const handleMouseDown = (e: MouseEvent) => {
    if (!overlayRef.current?.contains(e.target as Node)) {
      setSelectingPredecessorFor(null);
    }
  };
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('mousedown', handleMouseDown, true);
  return () => {
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('mousedown', handleMouseDown, true);
  };
}, [selectingPredecessorFor]);
```

### Pattern 3: onAddDependency Callback with Cycle Check

**What:** `TaskListRow` calls `onAddDependency(currentTaskId, predecessorTaskId, activeLinkType)`. `TaskList` runs `validateDependencies` on the would-be updated task array before committing.

```typescript
// In TaskList.tsx
const handleAddDependency = useCallback((successorTaskId: string, predecessorTaskId: string, linkType: LinkType) => {
  // Build hypothetical tasks array with new dependency
  const hypothetical = tasks.map(t =>
    t.id === successorTaskId
      ? { ...t, dependencies: [...(t.dependencies ?? []), { taskId: predecessorTaskId, type: linkType, lag: 0 }] }
      : t
  );
  const validation = validateDependencies(hypothetical);
  if (!validation.isValid) {
    // Show error — cycle detected
    setCycleError(true);
    setTimeout(() => setCycleError(false), 3000);
    return;
  }
  const updatedTask = hypothetical.find(t => t.id === successorTaskId)!;
  onTaskChange?.(updatedTask);
  setSelectingPredecessorFor(null);
}, [tasks, onTaskChange]);
```

### Pattern 4: Chip Rendering with Overflow

**What:** Show first 2 chips inline, then a `+N ещё` Popover trigger.

```typescript
// In TaskListRow.tsx
const chips = (task.dependencies ?? []).map((dep, i) => ({
  dep,
  predecessorIndex: tasks.findIndex(t => t.id === dep.taskId), // rowIndex
  label: `${LINK_TYPE_LABELS[dep.type]}(${predecessorIndex + 1})`,
}));
const visibleChips = chips.slice(0, 2);
const hiddenChips = chips.slice(2);
```

### Pattern 5: Predecessor Row Click Handling

**What:** In picker mode, every row's «Связи» cell becomes a click target. The current task's row is disabled (no self-loop). Existing tasks that already have a dependency from the current task should optionally be indicated as already-linked (but not mandatory per CONTEXT.md).

```typescript
// In TaskListRow.tsx
const handlePredecessorPick = useCallback((e: React.MouseEvent) => {
  e.stopPropagation();
  if (!selectingPredecessorFor || selectingPredecessorFor === task.id) return;
  onAddDependency?.(selectingPredecessorFor, task.id, activeLinkType!);
}, [selectingPredecessorFor, task.id, onAddDependency, activeLinkType]);
```

### Pattern 6: disableDependencyEditing Prop

**What:** Mirror of `disableTaskNameEditing`. When `true`: hide `+` buttons, hide `×` on chips, hide the type switcher dropdown (header shows type but is not clickable).

**Propagation path:** `GanttChartProps.disableDependencyEditing` → `GanttChart` → `TaskList.disableDependencyEditing` → `TaskListRow.disableDependencyEditing`.

### Anti-Patterns to Avoid

- **Storing `selectingPredecessorFor` in GanttChart:** CONTEXT.md explicitly locked state to `TaskList`. GanttChart must not know about picker mode.
- **Calling `detectCycles()` directly:** Always call `validateDependencies()` — it handles both missing-task and cycle checks.
- **Using `task.id` as the chip label number:** Use `rowIndex + 1` (visual position in table), NOT task ID.
- **Closing picker mode on chip `×` click:** Chip deletion should NOT exit picker mode — they are independent interactions. A `×` click should call `onRemoveDependency` only; `e.stopPropagation()` prevents accidental row picks.
- **Not using `portal={true}` on Popover:** The `gantt-tl-overlay` has `overflow: hidden` at its parent. Popovers without portal will be clipped.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cycle detection | Custom DFS | `validateDependencies()` in `dependencyUtils.ts` | Already tested, handles all edge cases |
| Floating dropdown menu | Custom positioned `<div>` | `Popover` + `PopoverContent portal={true}` | Radix handles focus trap, collision detection, z-index, keyboard dismiss |
| Outside-click detection for type menu | Manual DOM listener | Radix `onOpenChange` callback | Radix fires `onOpenChange(false)` on outside click automatically |
| Link type ↔ Russian abbreviation mapping | Inline ternaries | `const LINK_TYPE_LABELS: Record<LinkType, string>` constant | Single source of truth, used in both header and chips |

**Key insight:** The data model is complete. This phase is 100% UI interaction layered on top of existing types and utilities.

---

## Common Pitfalls

### Pitfall 1: Row Index Stale After Task Reorder
**What goes wrong:** If tasks array order changes (external), chip labels show wrong row numbers.
**Why it happens:** Chip labels are computed from `tasks.findIndex(t => t.id === dep.taskId)` — this depends on current `tasks` prop order.
**How to avoid:** Recompute chip row indices from current `tasks` prop in `TaskListRow`. Pass `allTasks` (the full tasks array) as a prop to `TaskListRow` so it can compute the predecessor index.
**Warning signs:** Chip shows `ОН(0)` (index not found, findIndex returns -1).

### Pitfall 2: Picker Mode Persists After Task Click Opens DatePicker
**What goes wrong:** User in picker mode accidentally clicks a date cell, DatePicker opens, picker mode remains active.
**Why it happens:** DatePicker's `stopPropagation` prevents the picker row selection, but the mode stays active.
**How to avoid:** Date cell and name cell clicks in picker mode should also cancel picker mode OR the cells should be visually disabled during picker mode. Simplest: call `setSelectingPredecessorFor(null)` on any click that reaches a non-«Связи» cell in picker mode.

### Pitfall 3: React.memo Breaks Row Re-render in Picker Mode
**What goes wrong:** `TaskListRow` is wrapped in `React.memo`. When `selectingPredecessorFor` changes, rows that need to show/hide the hover highlight don't re-render.
**Why it happens:** `React.memo` custom comparison (if any) may exclude `selectingPredecessorFor`.
**How to avoid:** Ensure `selectingPredecessorFor` is included in the props passed to `TaskListRow` and that the memo comparison includes it. Simplest: since `TaskListRow` uses a simple `React.memo` (no custom comparator), adding the prop to the interface is sufficient — React.memo will detect the prop change automatically.

### Pitfall 4: Cycle Error UX
**What goes wrong:** User tries A→B→A; validation rejects it; no feedback visible.
**Why it happens:** No error message state defined.
**How to avoid:** Add a `cycleError: boolean` state (or string message) in `TaskList`. Display it as a transient banner or tooltip. Auto-dismiss after ~3 seconds. CONTEXT.md says «показать всплывающее сообщение об ошибке».

### Pitfall 5: disableDependencyEditing Not Propagated to GanttChart
**What goes wrong:** Library consumer passes `disableDependencyEditing` but GanttChart doesn't forward it.
**Why it happens:** Missing prop in `GanttChartProps` interface and in the `GanttChart` → `TaskList` prop chain.
**How to avoid:** Add to `GanttChartProps`, destructure in `GanttChart`, pass to `TaskList`, which passes to each `TaskListRow`.

### Pitfall 6: Duplicate Dependencies
**What goes wrong:** User clicks same predecessor twice, creating duplicate `{ taskId, type }` entries.
**Why it happens:** No deduplication guard in `onAddDependency`.
**How to avoid:** Before adding, check `task.dependencies.some(d => d.taskId === predecessorId && d.type === linkType)`. Skip silently or show a message.

---

## Code Examples

### LinkType Label Constant
```typescript
// Source: CONTEXT.md locked decisions
export const LINK_TYPE_LABELS: Record<LinkType, string> = {
  FS: 'ОН',
  SS: 'НН',
  FF: 'ОО',
  SF: 'НО',
};
```

### Chip Component (inline in TaskListRow)
```typescript
// Chip: e.g. «ОН(2)»
<span className="gantt-tl-dep-chip">
  {LINK_TYPE_LABELS[dep.type]}({predecessorRowIndex + 1})
  {!disableDependencyEditing && (
    <button
      className="gantt-tl-dep-chip-remove"
      onClick={(e) => { e.stopPropagation(); onRemoveDependency?.(task.id, dep.taskId, dep.type); }}
      aria-label="Удалить связь"
    >
      ×
    </button>
  )}
</span>
```

### Header Cell with Type Switcher
```typescript
// In TaskList.tsx header
<div className="gantt-tl-headerCell gantt-tl-cell-deps">
  <Popover open={typeMenuOpen} onOpenChange={setTypeMenuOpen}>
    <PopoverTrigger asChild>
      <button
        className="gantt-tl-dep-type-trigger"
        disabled={disableDependencyEditing}
      >
        Связи [{LINK_TYPE_LABELS[activeLinkType]} ▾]
      </button>
    </PopoverTrigger>
    <PopoverContent portal={true} align="start">
      {(['FS', 'SS', 'FF', 'SF'] as LinkType[]).map(lt => (
        <button
          key={lt}
          className={`gantt-tl-dep-type-option${activeLinkType === lt ? ' active' : ''}`}
          onClick={() => { setActiveLinkType(lt); setTypeMenuOpen(false); }}
        >
          {LINK_TYPE_LABELS[lt]}
        </button>
      ))}
    </PopoverContent>
  </Popover>
</div>
```

### Picker Mode Row Highlight CSS
```css
/* gantt-tl-* prefix convention */
.gantt-tl-row-picking .gantt-tl-cell-deps {
  cursor: crosshair;
}
.gantt-tl-row-picking .gantt-tl-cell-deps:hover {
  background-color: rgba(59, 130, 246, 0.15);
}
.gantt-tl-row-picking-self .gantt-tl-cell-deps {
  opacity: 0.4;
  cursor: not-allowed;
}
```

### Full Dependencies Cell Structure
```typescript
// In TaskListRow.tsx «Связи» cell
<div
  className={`gantt-tl-cell gantt-tl-cell-deps
    ${isPicking ? (isSelf ? 'gantt-tl-row-picking-self' : 'gantt-tl-row-picking') : ''}`}
  onClick={isPicking && !isSelf ? handlePredecessorPick : undefined}
>
  {visibleChips.map(chip => <DependencyChip key={...} chip={chip} />)}
  {hiddenChips.length > 0 && (
    <OverflowPopover hiddenChips={hiddenChips} onRemove={onRemoveDependency} task={task} disabled={disableDependencyEditing} />
  )}
  {!disableDependencyEditing && !isPicking && (
    <button className="gantt-tl-dep-add" onClick={handleAddClick}>+</button>
  )}
</div>
```

---

## Integration Points Summary

| Point | Existing Code | Change Needed |
|-------|--------------|---------------|
| `Task.dependencies` | Already exists in `types/index.ts` | No change |
| `LinkType` | Already exists in `types/index.ts` | No change |
| `validateDependencies()` | Already exists in `dependencyUtils.ts` | No change — call from `TaskList.handleAddDependency` |
| `Popover / PopoverContent / PopoverTrigger` | Already in `components/ui/Popover.tsx` | No change — reuse as-is |
| `TaskList.tsx` | Has `disableTaskNameEditing` pattern | Add `disableDependencyEditing`, `activeLinkType`, `selectingPredecessorFor`, column header, `allTasks` prop pass-through |
| `TaskListRow.tsx` | Has `disableTaskNameEditing` pattern | Add «Связи» cell, chips, `+` button, picker hover |
| `GanttChart.tsx` | Has `disableTaskNameEditing` prop | Add `disableDependencyEditing` to `GanttChartProps`, forward to `TaskList` |
| `TaskList.css` | Has `gantt-tl-*` classes | Add `gantt-tl-dep-*` classes for new elements |
| `styles.css` (aggregator) | Imports `TaskList.css` | No change needed (already imported) |

---

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| N/A — first time adding dep editing | New column in TaskList | Dependencies were previously read-only in TaskList |
| N/A | Two-state picker flow (`selectingPredecessorFor`) | Standard multi-step selection UX pattern |

---

## Open Questions

1. **Error message UX for cycle detection**
   - What we know: CONTEXT.md says «показать всплывающее сообщение об ошибке»
   - What's unclear: Exact component — inline banner inside `TaskList`, or a tooltip near the clicked row?
   - Recommendation: Add a simple `<div className="gantt-tl-dep-error">Обнаружен цикл зависимостей</div>` that appears below the header when `cycleError` is true, auto-dismisses after 3 seconds. Marked as Claude's Discretion.

2. **allTasks prop on TaskListRow**
   - What we know: `TaskListRow` needs `allTasks` to compute predecessor row indices (for chip labels) and to validate cycles.
   - What's unclear: Whether to pass all tasks or a pre-computed index map.
   - Recommendation: Pass `allTasks: Task[]` as a prop. `TaskList` already has `tasks` prop — pass it through. Computing the index inside `TaskListRow` is straightforward with `useMemo`.

3. **Column width for «Связи»**
   - What we know: Current columns: № (40px), Name (flex), Start (68px), End (68px)
   - What's unclear: Optimal width — chips can vary from 1 to 3+ wide.
   - Recommendation: Fixed width `120px` or `flex: 1` shared with name. Given the layout, a dedicated fixed `120px` column keeps predictable layout. Name column can remain `flex: 1`. Planner can adjust.

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection of `TaskList.tsx`, `TaskListRow.tsx`, `GanttChart.tsx`, `dependencyUtils.ts`, `types/index.ts`, `Popover.tsx`, `TaskList.css`, `ui.css` — all read from disk 2026-03-03
- `14-CONTEXT.md` — locked decisions from user discussion 2026-03-03

### Secondary (MEDIUM confidence)
- `STATE.md` — accumulated project decisions and patterns (Phase 12-01, 13-01 entries)

### Tertiary (LOW confidence)
- None — all findings based on direct code inspection

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed, verified by reading imports
- Architecture: HIGH — directly derived from existing `TaskList.tsx` patterns and CONTEXT.md locked decisions
- Pitfalls: HIGH — identified from code reading (React.memo pattern, overflow CSS, portal requirement)

**Research date:** 2026-03-03
**Valid until:** 2026-04-03 (stable internal code, no external dependencies to track)
