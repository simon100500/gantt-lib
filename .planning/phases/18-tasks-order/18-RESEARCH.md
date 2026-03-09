# Phase 18: tasks-order - Research

**Researched:** 2026-03-09
**Domain:** HTML5 Drag and Drop API, React drag-and-drop patterns, TaskList row reordering
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Drag handle (⋮⋮) appears left of row number on hover
- Grab by handle initiates drag of the full row
- HTML5 Drag and Drop API — no additional dependencies
- Semi-transparent ghost copy of the row follows the cursor during drag
- Escape cancels dragging — row returns to original position
- Row numbers are dynamic: always 1, 2, 3... top to bottom (reflect current order)
- Numbers update only after drop (onDrop) — do NOT change during drag
- The dragged row stays at its original position (becomes semi-transparent) until drop
- Row number in dragged row stays normal (no visual changes)
- `onReorder?: (tasks: Task[]) => void` — passes the full reordered array
- onReorder is called only after drag completes (onDrop)
- On Escape cancel: onReorder is NOT called — handled on UI side
- Prop name: onReorder (clearly indicates order change)
- Automatic synchronization: TaskList and chart use the same tasks array
- Chart scroll does not change on reorder
- The moved task becomes selected (highlighted) after drop
- Dependency lines automatically redraw for the new task order

### Claude's Discretion
- Exact visual style of the drag handle (icon, size, padding)
- HTML5 drag ghost styling (standard or custom via setDragImage)
- Animation of row insertion at new position

### Deferred Ideas (OUT OF SCOPE)
- Up/down keyboard navigation buttons — future phase
- Multi-select and group move — future phase
- Drag-reordering directly in the chart (not only in TaskList) — future phase
</user_constraints>

---

## Summary

Phase 18 adds drag-and-drop row reordering to the TaskList. The user drags a row by its handle (shown on hover, left of the row number), drops it at the new position, and the library calls `onReorder(tasks[])` with the fully reordered array. The chart and dependency lines automatically synchronize because both consume the same `tasks` prop from the parent.

This is a self-contained UI feature within the existing `TaskList` / `TaskListRow` components. It requires no new dependencies — HTML5 DnD is built into the browser. The controlled-component pattern already in place (library never stores tasks, only calls callbacks) naturally extends to reorder: the parent's `setState` receives the new array from `onReorder`.

**Primary recommendation:** Implement drag state entirely inside `TaskList` via `useState` (draggingIndex, dragOverIndex). `TaskListRow` receives `draggable` and the four HTML5 drag event handlers as props. Row reordering logic lives in `TaskList` — it splices the array on drop and calls `onReorder` + `onTaskSelect` for the moved task.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| HTML5 DnD API | Browser native | Row drag-and-drop | Zero dependencies, locked decision |
| React useState | — | Track draggingIndex, dragOverIndex, dragOriginIndex | Minimal local state for drag lifecycle |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| React useRef | — | Store dragOriginIndex without re-render | Avoids stale closure in onDrop |
| CSS opacity | — | Dragging row visual (0.4 opacity) | Standard HTML5 DnD dragging feedback |
| CSS cursor: grab/grabbing | — | Handle cursor feedback | Signals draggable affordance |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| HTML5 DnD API | react-beautiful-dnd / dnd-kit | Much better UX but adds ~10-20KB dependency — locked out by decision |
| useState for drag indices | useRef only | useState gives React-driven re-renders for visual drop indicator; refs alone can't trigger CSS classes |

**Installation:** None required — HTML5 DnD is built-in.

---

## Architecture Patterns

### Recommended Project Structure

No new files needed. Changes go to:
```
packages/gantt-lib/src/components/TaskList/
├── TaskList.tsx       ← add drag state, onReorder prop, drag callbacks
├── TaskListRow.tsx    ← add draggable prop, drag handle JSX, drag event handlers
└── TaskList.css       ← add drag handle styles, drag-over indicator styles
```

GanttChart.tsx also needs a minor change: add `onReorder` to props and wire it through to `TaskList`.

### Pattern 1: Index-based HTML5 DnD State in Parent

**What:** `TaskList` owns drag state (`draggingIndex: number | null`, `dragOverIndex: number | null`). `TaskListRow` is a pure "display + event source" component.

**When to use:** When the parent already owns the data array (which it does — controlled component pattern).

**Example:**
```typescript
// In TaskList.tsx
const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
const dragOriginIndexRef = useRef<number | null>(null);

const handleDragStart = useCallback((index: number) => {
  setDraggingIndex(index);
  dragOriginIndexRef.current = index;
}, []);

const handleDragOver = useCallback((index: number) => {
  setDragOverIndex(index);
}, []);

const handleDrop = useCallback((dropIndex: number) => {
  const originIndex = dragOriginIndexRef.current;
  if (originIndex === null || originIndex === dropIndex) {
    setDraggingIndex(null);
    setDragOverIndex(null);
    dragOriginIndexRef.current = null;
    return;
  }
  const reordered = [...tasks];
  const [moved] = reordered.splice(originIndex, 1);
  reordered.splice(dropIndex, 0, moved);
  onReorder?.(reordered);
  onTaskSelect?.(moved.id);
  setDraggingIndex(null);
  setDragOverIndex(null);
  dragOriginIndexRef.current = null;
}, [tasks, onReorder, onTaskSelect]);

const handleDragEnd = useCallback(() => {
  // Called on Escape or drop outside — restore without calling onReorder
  setDraggingIndex(null);
  setDragOverIndex(null);
  dragOriginIndexRef.current = null;
}, []);
```

### Pattern 2: Escape Cancel via onDragEnd

**What:** HTML5 DnD fires `dragend` on the drag source when drag ends (whether by drop or Escape). The `dropEffect` on the `dataTransfer` object reveals whether a real drop occurred.

**When to use:** For implementing cancel-on-Escape without a keydown listener.

**Example:**
```typescript
// In TaskListRow.tsx — drag source
const handleDragEnd = (e: React.DragEvent) => {
  // dropEffect is 'none' on Escape cancel or drop outside valid target
  onDragEnd?.();
};
```

Note: because `handleDrop` on the drop target is called BEFORE `dragend` on the source, the drop state is already cleared in TaskList when `dragend` fires. `handleDragEnd` in TaskList is therefore only needed for the cancel/Escape case.

### Pattern 3: Drag Handle with `draggable` Attribute Scoping

**What:** The full row is NOT marked `draggable={true}`. Only the drag handle element is. This avoids conflicts with text selection and existing click interactions.

**When to use:** Always — dragging the whole row by its handle is the correct UX affordance.

**Example:**
```typescript
// In TaskListRow.tsx
<div
  className="gantt-tl-row ..."
  // NOT draggable here
>
  <div className="gantt-tl-cell gantt-tl-cell-number">
    <span
      className="gantt-tl-drag-handle"
      draggable={true}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      ⠿  {/* or SVG grip icon */}
    </span>
    <span className="gantt-tl-num-label">{rowIndex + 1}</span>
  </div>
  ...
</div>
```

However: HTML5 DnD on a child element means the row's `onDragOver` and `onDrop` need to be on the row div itself (the drop target). The entire row must accept drag-over to show the insertion indicator.

**Alternative approach (simpler):** Mark the entire row `draggable={true}`, use `onMouseDown` on the handle to set a flag, and `onDragStart` on the row checks the flag before allowing drag. This avoids needing to propagate events. The flag approach is clean given existing `handleRowClickInternal` patterns.

### Pattern 4: Drop Indicator via CSS Class

**What:** When `dragOverIndex === rowIndex`, add a `gantt-tl-row-drag-over` class that renders a top border highlight line.

**When to use:** During drag, updated on every `onDragOver` event.

```css
.gantt-tl-row-drag-over {
  border-top: 2px solid #3b82f6;
}
```

### Anti-Patterns to Avoid

- **Storing task data in drag DataTransfer:** `dataTransfer.setData()` is needed for inter-app drag but slows things down and is unreliable for same-component reorder. Use index-based state instead.
- **Calling onReorder during dragOver:** Only call on drop. The parent's state update on every dragOver would cause excessive re-renders.
- **Making the entire row draggable without a handle guard:** Breaks text selection, name editing double-click, and date picker interactions.
- **Using `e.preventDefault()` in onDrop without `e.preventDefault()` in onDragOver:** The browser blocks drops on elements that don't explicitly allow them in `onDragOver`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Array splice reorder | Custom immutable reorder util | One-liner: `splice` + spread | Trivially simple, no abstraction needed |
| Drag ghost customization | Complex setDragImage canvas | CSS on the existing row element | Standard behavior is acceptable per decisions |
| Cancel-on-Escape | keydown global listener | `onDragEnd` with no prior `onDrop` | HTML5 DnD fires dragend reliably on Escape |

**Key insight:** HTML5 DnD already handles the hard parts (ghost image, cursor, event sequencing). The only custom logic needed is the array index manipulation on drop.

---

## Common Pitfalls

### Pitfall 1: onDragOver Must Call preventDefault

**What goes wrong:** Drop never fires — browser ignores drop on elements that don't call `e.preventDefault()` in `onDragOver`.
**Why it happens:** HTML5 DnD default is to disallow drops everywhere.
**How to avoid:** Always `e.preventDefault()` in `onDragOver` handler on the row/body element.
**Warning signs:** `onDrop` never fires even though visual feedback looks correct.

### Pitfall 2: Dragging Row Number Changes During Drag

**What goes wrong:** `rowIndex` prop updates on every state change to `dragOverIndex`, causing number flicker.
**Why it happens:** React re-renders all rows when `dragOverIndex` changes.
**How to avoid:** Row numbers display `rowIndex + 1` from the prop (which reflects array order). Since the array only changes AFTER drop (when `onReorder` is called and parent updates `tasks`), numbers stay stable during drag. This is exactly the locked decision.

### Pitfall 3: Drag Conflicts with Existing Click Handlers

**What goes wrong:** `onDragStart` fires when user tries to click (not drag), triggering drag state.
**Why it happens:** HTML5 DnD starts on `mousedown` + minimum movement.
**How to avoid:** The drag handle is a separate small element. Clicks on it are intentional drags. The existing `handleRowClickInternal` on the row div fires on `click`, not `mousedown`, so there's no conflict.

### Pitfall 4: onDragStart on Handle vs Row-level draggable

**What goes wrong:** If the whole row is `draggable={true}`, the existing name editing double-click and input interactions may accidentally initiate a drag.
**Why it happens:** `draggable={true}` intercepts mouse events before React synthetic events.
**How to avoid:** Either (a) put `draggable={true}` only on the handle span, with the row as the drop target via `onDragOver`/`onDrop`, or (b) use `draggable={true}` on the row with a `isDragEnabled` state flag set only when mousedown on handle. Option (a) is simpler given the existing code structure.

### Pitfall 5: setDragImage with null in Firefox

**What goes wrong:** Firefox ignores `setDragImage(null, 0, 0)` — throws or falls back to default.
**Why it happens:** Firefox requires a valid DOM element.
**How to avoid:** Either use default ghost (acceptable per decisions) or pass a real DOM element.

### Pitfall 6: Drag Handle click propagation

**What goes wrong:** Clicking the drag handle also selects the row via `handleNumberClick`.
**Why it happens:** Click event bubbles from handle to number cell to row.
**How to avoid:** `e.stopPropagation()` in drag handle's `onClick` if it has one, or ensure `onDragStart` doesn't trigger row selection.

---

## Code Examples

Verified patterns from HTML5 DnD specification and React docs:

### Minimal Row Reorder Logic
```typescript
// Source: MDN HTML5 Drag and Drop API
// onDragOver — required to enable drop
const handleDragOver = (e: React.DragEvent, index: number) => {
  e.preventDefault();                    // REQUIRED — enables drop
  e.dataTransfer.dropEffect = 'move';
  setDragOverIndex(index);
};

// onDrop — perform the reorder
const handleDrop = (e: React.DragEvent, dropIndex: number) => {
  e.preventDefault();
  const originIndex = dragOriginIndexRef.current;
  if (originIndex === null || originIndex === dropIndex) return;

  const reordered = [...tasks];
  const [moved] = reordered.splice(originIndex, 1);
  reordered.splice(dropIndex, 0, moved);

  onReorder?.(reordered);
  onTaskSelect?.(moved.id);
  setDraggingIndex(null);
  setDragOverIndex(null);
  dragOriginIndexRef.current = null;
};
```

### Drag Handle CSS
```css
/* Drag handle — hidden by default, revealed on row hover */
.gantt-tl-drag-handle {
  width: 16px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  color: #9ca3af;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
  flex-shrink: 0;
  user-select: none;
}

.gantt-tl-row:hover .gantt-tl-drag-handle {
  opacity: 1;
  pointer-events: auto;
}

.gantt-tl-drag-handle:active {
  cursor: grabbing;
}

/* Dragging row — semi-transparent */
.gantt-tl-row-dragging {
  opacity: 0.4;
}

/* Drop target indicator — top border highlight */
.gantt-tl-row-drag-over {
  border-top: 2px solid #3b82f6 !important;
}
```

### onReorder prop wiring through GanttChart
```typescript
// GanttChartProps addition
onReorder?: (tasks: Task[]) => void;

// GanttChart internal handler
const handleReorder = useCallback((reorderedTasks: Task[]) => {
  onChange?.(() => reorderedTasks);
  onReorder?.(reorderedTasks);
}, [onChange, onReorder]);

// Passed to TaskList
<TaskList
  ...
  onReorder={handleReorder}
  onTaskSelect={handleTaskSelect}
/>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| jquery-ui sortable | HTML5 DnD / dnd-kit | ~2018 | No jQuery required |
| react-beautiful-dnd | dnd-kit | ~2022 (rbd deprecated) | Lighter, more flexible |
| Custom mouse events | HTML5 DnD | Always viable | Simple use cases need no library |

**Deprecated/outdated:**
- `react-beautiful-dnd`: Officially in maintenance mode as of 2022 — do not use for new work (not relevant, decision is HTML5 DnD anyway).

---

## Integration Points

### Files to Modify

**`GanttChart/GanttChart.tsx`**
- Add `onReorder?: (tasks: Task[]) => void` to `GanttChartProps`
- Add `handleReorder` callback that calls `onChange?.(() => reorderedTasks)` then `onReorder?.(reorderedTasks)`
- Pass `onReorder={handleReorder}` to `<TaskList />`

**`TaskList/TaskList.tsx`**
- Add `onReorder?: (tasks: Task[]) => void` to `TaskListProps`
- Add drag state: `draggingIndex`, `dragOverIndex` (useState), `dragOriginIndexRef` (useRef)
- Add `handleDragStart`, `handleDragOver`, `handleDrop`, `handleDragEnd` callbacks
- Pass these as props to each `<TaskListRow />`

**`TaskList/TaskListRow.tsx`**
- Add drag props: `isDragging`, `isDragOver`, `onDragStart`, `onDragOver`, `onDrop`, `onDragEnd`
- Add drag handle element in the number cell (before number span)
- Apply `gantt-tl-row-dragging` CSS class when `isDragging`
- Apply `gantt-tl-row-drag-over` CSS class when `isDragOver`
- The drag handle span: `draggable={true}`, has `onDragStart`/`onDragEnd`
- The row div: has `onDragOver`/`onDrop` (drop target)

**`TaskList/TaskList.css`**
- Add `.gantt-tl-drag-handle` styles
- Add `.gantt-tl-row-dragging` (opacity: 0.4)
- Add `.gantt-tl-row-drag-over` (border-top highlight)
- Adjust `.gantt-tl-cell-number` layout: flex row with handle + number label

### Number Column Width

The current `gantt-tl-cell-number` is `width: 40px`. Adding a 16px drag handle left of the number requires verifying this still fits (16px handle + ~16px number = 32px, fits in 40px). No width change needed.

---

## Open Questions

1. **Handle icon: Unicode dot grid vs SVG**
   - What we know: CONTEXT.md mentions "⋮⋮" (two vertical ellipsis) or "six-dot grid" icon
   - What's unclear: Whether a Unicode character (⠿ U+283F) or SVG is preferred
   - Recommendation: Use a small SVG grip icon (3×2 dot grid) for crisp rendering at all DPIs — consistent with existing TrashIcon/PlusIcon SVG pattern in the codebase

2. **draggable on handle vs row**
   - What we know: Both approaches work
   - What's unclear: Which causes fewer event conflicts with existing interactions
   - Recommendation: `draggable={true}` on the handle span only, with `onDragOver`/`onDrop` on the row div. This is the safest approach given name editing, date pickers, and dep chip interactions.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (jsdom environment) |
| Config file | `packages/gantt-lib/vitest.config.ts` |
| Quick run command | `cd packages/gantt-lib && npm test` |
| Full suite command | `cd packages/gantt-lib && npm test` |

### Phase Requirements → Test Map

Phase 18 involves UI interaction (drag events) rather than pure utility logic. The reorder array logic is the only pure-function component that can be unit tested without a DOM.

| ID | Behavior | Test Type | Automated Command | File Exists? |
|----|----------|-----------|-------------------|-------------|
| REORDER-01 | `reorderTasks(tasks, fromIndex, toIndex)` produces correct array | unit | `cd packages/gantt-lib && npm test -- --reporter=verbose` | ❌ Wave 0 |
| REORDER-02 | `reorderTasks` no-ops when fromIndex === toIndex | unit | same | ❌ Wave 0 |
| REORDER-03 | `reorderTasks` handles boundary indices (0, tasks.length-1) | unit | same | ❌ Wave 0 |
| REORDER-04 | onDragOver without preventDefault disables drop (visual test) | manual-only | N/A — browser behavior | N/A |
| REORDER-05 | Escape cancel does not call onReorder | manual-only | N/A — requires real DnD interaction | N/A |
| REORDER-06 | Moved task is selected after drop | manual-only | N/A — requires real DnD interaction | N/A |

### Sampling Rate
- **Per task commit:** `cd packages/gantt-lib && npm test`
- **Per wave merge:** `cd packages/gantt-lib && npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `packages/gantt-lib/src/__tests__/reorderTasks.test.ts` — covers REORDER-01, REORDER-02, REORDER-03

*(All other test infrastructure exists: vitest.config.ts, jsdom environment, existing test files as reference.)*

---

## Sources

### Primary (HIGH confidence)
- MDN Web Docs: HTML Drag and Drop API — event sequence, dataTransfer, dropEffect semantics
- Existing codebase (`TaskList.tsx`, `TaskListRow.tsx`, `GanttChart.tsx`) — direct inspection of current patterns, props interfaces, CSS conventions

### Secondary (MEDIUM confidence)
- Project STATE.md — confirmed hover-reveal pattern for action buttons (`opacity 0→1` on `.gantt-tl-row:hover`)
- Project CONTEXT.md — all locked decisions extracted verbatim

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — HTML5 DnD is locked by decision; patterns verified against existing codebase
- Architecture: HIGH — direct inspection of TaskList/TaskListRow source; integration points are clear
- Pitfalls: HIGH — known HTML5 DnD pitfalls (preventDefault on dragOver, drag handle scoping) are well-documented

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (stable domain)
