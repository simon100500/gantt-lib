# Phase 11: lock-task - Research

**Researched:** 2026-02-22
**Domain:** React task bar interaction blocking + TypeScript type extension + SVG/inline icon
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Locked tasks cannot be moved (drag) or resized (resize-left, resize-right)
- Drag and resize interactions are fully blocked — not just constrained
- `locked` is a prop on the task object (independent from `accepted`, `progress`, etc.)
- A lock icon appears before the date range text on the task bar
- Icon placement: left of the existing date labels on the task bar
- Per-task prop: `locked?: boolean` in the task data model (`GanttTask` type)
- No chart-level lock toggle — control is per task
- Consumer sets `locked: true` in task data to freeze a task

### Claude's Discretion
- Exact lock icon (SVG, emoji, or library icon)
- Cursor style when hovering a locked task (e.g., `not-allowed` or `default`)
- Whether to show any visual feedback on failed drag attempt (e.g., subtle shake or silent ignore)
- Styling of the lock icon (size, color, opacity)

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

---

## Summary

Phase 11 adds a `locked?: boolean` prop to the `Task` type that completely blocks all drag and resize interactions for that task. The implementation touches three layers: (1) the TypeScript type definition, (2) the `useTaskDrag` hook (where interactions are initiated), and (3) the `TaskRow` component (where the icon is rendered and the cursor style is set).

The simplest and most correct interception point is in `useTaskDrag`'s `handleMouseDown` callback. When the task is locked, `handleMouseDown` returns early without setting any drag state or registering in `globalActiveDrag`. This guarantees zero interaction leakage — no drag can start, no RAF loops, no `onDragEnd` calls. The `dragHandleProps.style.cursor` returned by the hook also needs to reflect the locked state.

The lock icon should be an inline SVG rendered directly in `TaskRow` before the date-range label span. No external icon library is warranted — the project explicitly targets zero/minimal deps (DX-02, bundle < 15KB gzipped DX-03). The project already uses raw `<svg>` elements in `DependencyLines`.

**Primary recommendation:** Gate `handleMouseDown` with an early return when `locked === true`; pass `locked` through `useTaskDrag` options and `TaskRowProps`; render a small inline SVG padlock before the date-range label.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18+ (current) | Component + hook layer | Already used |
| TypeScript | strict | Type extension | Already strict mode |
| Inline SVG | N/A | Lock icon | Zero-dep, already used in DependencyLines |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| CSS classes | N/A | Locked visual variant | Consistent with project CSS class prefix pattern |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline SVG icon | emoji 🔒 | Emoji is simpler but has inconsistent cross-platform rendering and cannot be styled with CSS color |
| Inline SVG icon | Heroicons / Lucide React | Adds a dependency; unnecessary for a single icon in a bundle-size-conscious library |
| Early return in handleMouseDown | Conditionally passing onMouseDown=undefined | Early return is cleaner; avoids null check at call site and keeps hook API stable |

**Installation:**
No new packages required.

---

## Architecture Patterns

### Recommended Project Structure
No new files needed. Changes span:
```
packages/gantt-lib/src/
├── types/index.ts          # Add locked?: boolean to Task interface
├── components/GanttChart/GanttChart.tsx  # Task interface duplicate — also add locked here
├── hooks/useTaskDrag.ts    # Accept locked option; gate handleMouseDown
└── components/TaskRow/
    ├── TaskRow.tsx         # Pass locked to hook; render lock icon; update arePropsEqual
    └── TaskRow.css         # Add .gantt-tr-locked modifier + .gantt-tr-lockIcon styles
```

Note: The project has two `Task` interface definitions — one in `types/index.ts` and a duplicate in `GanttChart.tsx`. Both must be updated in sync.

### Pattern 1: Early-Return Guard in handleMouseDown (Interaction Blocking)

**What:** Add `locked` to `UseTaskDragOptions`. In `handleMouseDown`, check `locked` before any other logic and return early.

**When to use:** Any time a boolean prop must completely suppress an interaction without changing the hook's return shape.

**Example:**
```typescript
// In useTaskDrag.ts — add to UseTaskDragOptions interface
export interface UseTaskDragOptions {
  // ... existing options ...
  /** When true, all drag and resize interactions are disabled for this task */
  locked?: boolean;
}

// In useTaskDrag.ts — gate at the top of handleMouseDown
const handleMouseDown = useCallback((e: React.MouseEvent) => {
  if (locked) return; // Phase 11: locked tasks cannot be dragged or resized
  // ... existing logic unchanged ...
}, [locked, /* existing deps */]);
```

**Why this location:** `handleMouseDown` is the only entry point for all three drag modes (move, resize-left, resize-right). Blocking here is complete — the global drag singleton (`globalActiveDrag`) is never populated, so `handleGlobalMouseMove` and `handleGlobalMouseUp` never process events for this task.

### Pattern 2: Cursor Style from Hook (Locked Visual Feedback)

**What:** The hook's `getCursorStyle()` already returns `'grab'` or `'grabbing'`. Extend it to return `'not-allowed'` when locked.

**Example:**
```typescript
const getCursorStyle = useCallback((): string => {
  if (locked) return 'not-allowed'; // Phase 11
  if (isDragging) return 'grabbing';
  return 'grab';
}, [locked, isDragging]);
```

`dragHandleProps.style.cursor` flows into TaskRow's `taskBar` style, so no change is needed in TaskRow itself for the cursor.

### Pattern 3: Inline SVG Lock Icon in TaskRow

**What:** Render a small inline SVG padlock inside the task bar, before the existing date-range label. The icon uses `currentColor` so it inherits the task bar's `--gantt-task-bar-text-color`.

**When to use:** Only when `task.locked === true`.

**Example:**
```tsx
{task.locked && (
  <svg
    className="gantt-tr-lockIcon"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-label="Locked"
  >
    {/* Standard padlock path - body + shackle */}
    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z"/>
  </svg>
)}
```

**Placement in JSX:** Inside `.gantt-tr-taskBar`, before the `<span className="gantt-tr-taskDuration">` (which shows the date range). This matches the CONTEXT.md decision: icon appears to the left of date range text.

**CSS for the icon:**
```css
.gantt-tr-lockIcon {
  width: 12px;
  height: 12px;
  margin-right: 4px;
  flex-shrink: 0;
  opacity: 0.85;
  position: relative;
  z-index: 2; /* same as gantt-tr-taskDuration, above progress bar */
}
```

### Pattern 4: React.memo arePropsEqual Update

**What:** `locked` is a new prop that affects rendering (shows/hides icon, changes cursor). It must be added to the `arePropsEqual` comparison in TaskRow.

**Example:**
```typescript
const arePropsEqual = (prevProps: TaskRowProps, nextProps: TaskRowProps) => {
  return (
    // ... existing comparisons ...
    prevProps.task.locked === nextProps.task.locked  // Phase 11
  );
};
```

Omitting this would mean a task toggled from unlocked to locked would not re-render, keeping the wrong cursor and missing the lock icon.

### Pattern 5: CSS Locked Modifier Class (Optional Visual Distinction)

**What:** Add a `gantt-tr-locked` class to the task bar when `task.locked === true`. This allows consumer CSS overrides (e.g., reduced opacity, different border) without changing the default behavior.

**Example:**
```tsx
className={`gantt-tr-taskBar ${isDragging ? 'gantt-tr-dragging' : ''} ${task.locked ? 'gantt-tr-locked' : ''}`}
```

```css
/* Default: subtle visual cue that the task is immovable */
.gantt-tr-taskBar.gantt-tr-locked {
  cursor: not-allowed;
}
```

Note: cursor is already set via inline style from `dragHandleProps.style.cursor`. The CSS class is for consumer override patterns (DX-05: CSS variables for theming).

### Anti-Patterns to Avoid

- **Blocking in handleGlobalMouseMove:** By the time the global handler fires, the drag is already started. The correct gate is at `handleMouseDown`.
- **Conditional rendering of `onMouseDown`:** Setting `onMouseDown={task.locked ? undefined : dragHandleProps.onMouseDown}` works but requires the hook to still be called (rules of hooks). The `locked` option in the hook itself is cleaner and more testable.
- **Adding `locked` only to GanttChart.Task, not types/index.ts:** Both `Task` definitions must stay in sync. The library's public type export comes from `types/index.ts`.
- **Omitting `locked` from arePropsEqual:** Would prevent re-renders when locked state changes, causing stale cursor and missing icon.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Lock icon | Custom icon component | Inline `<svg>` | Already the project pattern (DependencyLines SVG) |
| Interaction blocking | Mouse event capture/prevent | Early return in handleMouseDown | Simpler, no DOM side effects |

**Key insight:** This feature is pure state-gate logic. The entire drag system already has one entry point (`handleMouseDown`). Locking is a one-liner guard at that entry point — no new systems needed.

---

## Common Pitfalls

### Pitfall 1: Missing the Second Task Interface
**What goes wrong:** `locked` is added to `types/index.ts` but not to the duplicate `Task` interface in `GanttChart.tsx`.
**Why it happens:** The project has a re-declared `Task` interface in `GanttChart.tsx` (with `TaskDependency` also re-declared there). The public API exports from `GanttChart.tsx`, so TypeScript consumers would see the field missing or type errors.
**How to avoid:** Add `locked?: boolean` to both interfaces. Search for `export interface Task` to find both locations.
**Warning signs:** TypeScript error "Property 'locked' does not exist on type 'Task'" when consumer sets `locked: true`.

### Pitfall 2: arePropsEqual Not Updated
**What goes wrong:** Toggling `task.locked` on a task causes no re-render. The lock icon never appears, cursor stays `grab`.
**Why it happens:** `arePropsEqual` uses strict equality checks for task props. New props must be added explicitly.
**How to avoid:** Add `prevProps.task.locked === nextProps.task.locked` to `arePropsEqual`.
**Warning signs:** `locked: true` in data but no visual change on screen.

### Pitfall 3: Locked Tasks in Cascade Chains
**What goes wrong:** A locked task appears in a cascade chain (it is a successor of a dragged task). The cascade moves it anyway via `onCascadeProgress` override positions.
**Why it happens:** `getSuccessorChain` / `getTransitiveCascadeChain` finds successors by dependency graph traversal — it does not check `locked`.
**How to avoid:** Filter locked tasks out of cascade chains. In `getTransitiveCascadeChain` (or at the cascade emission site in `handleGlobalMouseMove`), skip tasks where `task.locked === true`. Also skip them in `chainForCompletion` in `handleComplete`.
**Warning signs:** A locked task bar visually moves during cascade drag preview, then snaps back on mouseup.

### Pitfall 4: Cursor Not Reflecting Lock State on Initial Render
**What goes wrong:** The hook returns `cursor: 'grab'` on first render before `locked` is considered. But since `getCursorStyle` is inside `useCallback`, it correctly reads `locked` from the closure. If `locked` is not in the dependency array of `getCursorStyle`, stale closure causes wrong cursor.
**How to avoid:** Add `locked` to the dependency array of `getCursorStyle` useCallback.

### Pitfall 5: Lock Icon Overflows or Wraps Narrow Bars
**What goes wrong:** On very short tasks (1-2 days), the task bar is only a few pixels wide. Adding an icon before the date text causes overflow/wrapping.
**Why it happens:** The task bar uses `overflow: hidden; white-space: nowrap` — content is clipped, not wrapped. The icon just gets clipped.
**How to avoid:** This is acceptable behavior (clipping is handled by existing CSS). No extra logic needed. The icon has `flex-shrink: 0` so it clips before text does, which is the correct priority (icon indicates lock state, text is less critical).

---

## Code Examples

### Full change set sketch for useTaskDrag.ts

```typescript
// Add to UseTaskDragOptions interface
locked?: boolean;

// In useTaskDrag destructuring
const { locked = false, /* ... existing ... */ } = options;

// In handleMouseDown - first line of the callback body
if (locked) return;

// In getCursorStyle
const getCursorStyle = useCallback((): string => {
  if (locked) return 'not-allowed';
  if (isDragging) return 'grabbing';
  return 'grab';
}, [locked, isDragging]);
```

### Full change set sketch for TaskRow.tsx

```typescript
// Add to TaskRowProps interface
/** When true, task cannot be dragged or resized */
locked?: boolean;  // or derive from task.locked directly

// In arePropsEqual - add:
prevProps.task.locked === nextProps.task.locked

// In useTaskDrag call - add:
locked: task.locked,

// In JSX - add lock icon inside taskBar div, before gantt-tr-taskDuration span:
{task.locked && (
  <svg
    className="gantt-tr-lockIcon"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-label="Locked"
  >
    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z"/>
  </svg>
)}

// className on taskBar div:
className={`gantt-tr-taskBar ${isDragging ? 'gantt-tr-dragging' : ''} ${task.locked ? 'gantt-tr-locked' : ''}`}
```

### Cascade chain filtering for locked tasks

```typescript
// In getTransitiveCascadeChain or at emission site — skip locked successors
// Option A: filter before building chain (cleanest)
const chain = [...directSuccessors].filter(t => !t.locked);

// Option B: at cascade emission site in handleGlobalMouseMove
for (const chainTask of activeChain) {
  if (chainTask.locked) continue; // skip locked tasks in cascade
  // ... existing override calculation ...
}
```

Option B (at emission site) is safer — it handles the case where `getTransitiveCascadeChain` still traverses through locked tasks to reach unlocked successors beyond them. Option A would incorrectly stop cascade propagation at a locked intermediate task.

However, since cascade does NOT modify the locked task's actual dates (only visual preview), Option A is also acceptable for v1 simplicity. The planner should decide based on whether "cascade stops at locked task" or "cascade skips locked task but continues to its successors" is the desired behavior.

**Recommendation:** For simplicity, use Option B (skip locked tasks in the override map but continue traversal). This means: locked tasks don't visually move during cascade preview, but their successors still cascade correctly.

### CSS additions to TaskRow.css

```css
/* Lock icon inside task bar */
.gantt-tr-lockIcon {
  width: 12px;
  height: 12px;
  margin-right: 4px;
  flex-shrink: 0;
  opacity: 0.85;
  position: relative;
  z-index: 2;
}

/* Locked task bar state */
.gantt-tr-taskBar.gantt-tr-locked {
  cursor: not-allowed;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| N/A | N/A | N/A | This is a new feature; no migration needed |

**Note:** The project uses no external UI library for icons. DependencyLines already uses inline `<svg>` with raw path data — this phase follows the same pattern.

---

## Open Questions

1. **Cascade behavior when a locked task is in the successor chain**
   - What we know: `getTransitiveCascadeChain` traverses by dependency graph; it does not inspect `locked`
   - What's unclear: Should cascade stop at a locked task (treating it as immovable barrier) or skip it but continue to its successors?
   - Recommendation: Skip the locked task in the visual override map but continue traversal to its successors. This preserves the semantic that `locked` means "this task cannot move" without breaking cascades for downstream tasks. Implement via Option B (filter at emission site in `handleGlobalMouseMove` and in `chainForCompletion` in `handleComplete`).

2. **`styles.css` aggregation pattern**
   - What we know: The project aggregates CSS from `TaskRow.css` into `styles.css`. Both files appear to contain class definitions (there's duplication between `styles.css` and `TaskRow.css`).
   - What's unclear: Whether new CSS classes should be added only to `TaskRow.css` (component-scoped) or also mirrored to `styles.css`.
   - Recommendation: Add to `TaskRow.css` only. The build process (`tsup` + CSS aggregation) handles the output. Do not manually duplicate into `styles.css`.

---

## Sources

### Primary (HIGH confidence)
- Codebase: `packages/gantt-lib/src/hooks/useTaskDrag.ts` — full hook implementation read directly
- Codebase: `packages/gantt-lib/src/components/TaskRow/TaskRow.tsx` — arePropsEqual, JSX structure, drag wiring
- Codebase: `packages/gantt-lib/src/types/index.ts` — Task interface, existing optional props
- Codebase: `packages/gantt-lib/src/components/GanttChart/GanttChart.tsx` — duplicate Task interface, cascade pipeline
- Codebase: `packages/gantt-lib/src/styles.css` — CSS variable names and class prefix conventions
- Codebase: `.planning/phases/11-lock-task/11-CONTEXT.md` — locked decisions

### Secondary (MEDIUM confidence)
- MDN standard padlock SVG path: The Material Design padlock path `M18 8h-1V6c0-2.76...` is a well-known Google Material icon path, widely used and verifiable from Google Fonts / Material Symbols

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; all changes are within existing project patterns
- Architecture: HIGH — entry points are fully mapped; `handleMouseDown` is the confirmed single gate
- Cascade filtering: MEDIUM — behavior of locked tasks in successor chains needs planner decision (open question 1)
- Icon path: MEDIUM — Material Design padlock path is standard but should be verified visually during implementation
- Pitfalls: HIGH — derived directly from reading actual code

**Research date:** 2026-02-22
**Valid until:** Stable (this is an internal codebase change, not a third-party API)
