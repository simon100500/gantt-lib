# Phase 17: action-buttons-panel - Research

**Researched:** 2026-03-08
**Domain:** React component architecture, CSS layout, UI/UX patterns
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Layout**: Separate panel column positioned between TaskList and Gantt chart timeline
- **Panel scrolls synchronized** with task rows (same scroll container as TaskList)
- **Panel is visible only when `showTaskList=true`** — it is part of the TaskList feature, not independent
- **Two buttons per row**: Insert after (+) and Delete (✕)
- **SVG icon buttons** — compact, no text labels
- **Hover-only visibility**: buttons appear when hovering over the row
- **Consolidation**: Insert after button (currently in TaskListRow deps cell, added in quick-65) — remove from deps cell, move to action panel
- **Consolidation**: Delete button (trash icon, currently hover in TaskListRow) — remove from TaskListRow, move to action panel
- **Callbacks**: Insert after → calls existing `onInsertAfter` prop; Delete → calls existing `onDelete` prop
- **No new props needed** on GanttChart (callbacks already exist from Phase 16)

### Claude's Discretion
- Panel width (narrow — just enough for two icon buttons)
- Exact icon SVG shapes for + and ✕
- CSS hover state coordination between row and panel buttons
- Header cell for the panel column (empty or minimal)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

## Summary

Phase 17 consolidates task row action buttons (insert after and delete) into a dedicated action buttons panel column positioned between the TaskList and Gantt chart timeline. This refactoring improves UI cleanliness by removing scattered inline buttons and centralizing all row-level actions in a consistent location.

**Primary recommendation:** Add a new narrow column (40-50px wide) to TaskList containing per-row SVG icon buttons, synchronized with TaskList scroll, using the existing CSS hover-reveal pattern established for the current delete button.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18+ | Component framework | Project uses React 19, TaskList already built with React patterns |
| CSS3 | - | Styling and layout | TaskList uses plain CSS with CSS variables (no CSS Modules) |
| TypeScript | 5.7+ | Type safety | All TaskList components are strongly typed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| SVG icons | Inline | Action button icons | Project uses inline SVG components (see DepIcons.tsx pattern) |

### Existing Patterns (Reused from Phase 16)
| Pattern | Source | Purpose |
|---------|--------|---------|
| Hover-reveal buttons | `.gantt-tl-row:hover .gantt-tl-row-trash` | Show buttons only on row hover |
| CSS prefix `gantt-tl-` | TaskList.css | Class naming convention for TaskList styles |
| Flexbox layout | TaskList table structure | Column-based row layout |
| Sticky positioning | TaskList header | Synchronized scrolling behavior |

**Installation:**
No new dependencies needed. All required libraries and patterns already exist in the project.

## Architecture Patterns

### Recommended Project Structure
```
src/components/TaskList/
├── TaskList.tsx          # Add action panel column to header and body
├── TaskListRow.tsx       # Remove inline delete/insert buttons
├── TaskList.css          # Add action panel styles, remove old button styles
├── DepIcons.tsx          # Reference for SVG icon pattern (may add new icons)
└── index.tsx             # No changes needed
```

### Pattern 1: Panel Column Integration
**What:** Add a new narrow column to TaskList's flexbox layout, positioned as the last column before the border-right separator.

**When to use:** Adding fixed-width columns to a flexbox-based table layout.

**Example:**
```tsx
// TaskList.tsx header
<div className="gantt-tl-header" style={{ height: `${headerHeight + 0.5}px` }}>
  {/* Existing columns... */}
  <div className="gantt-tl-headerCell gantt-tl-cell-deps">...</div>
  {/* NEW: Action panel header cell */}
  <div className="gantt-tl-headerCell gantt-tl-cell-actions"></div>
</div>

// TaskListRow.tsx data row
<div className="gantt-tl-row">
  {/* Existing cells... */}
  <div className="gantt-tl-cell gantt-tl-cell-deps">...</div>
  {/* NEW: Action panel cell */}
  <div className="gantt-tl-cell gantt-tl-cell-actions">
    <button className="gantt-tl-action-btn gantt-tl-action-insert" onClick={handleInsertAfter}>
      <PlusIcon />
    </button>
    <button className="gantt-tl-action-btn gantt-tl-action-delete" onClick={handleDelete}>
      <TrashIcon />
    </button>
  </div>
</div>
```

### Pattern 2: SVG Icon Components
**What:** Inline React functional components returning SVG elements, following the DepIcons.tsx pattern.

**When to use:** Creating consistent iconography across the UI.

**Example:**
```tsx
// Source: src/components/TaskList/DepIcons.tsx (existing pattern)
const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <path d="M3 6h18" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);
```

### Pattern 3: Hover-Reveal Buttons
**What:** CSS-based visibility toggle using parent hover state, following the existing `.gantt-tl-row-trash` pattern.

**When to use:** Action buttons that should appear only on user interaction to reduce visual clutter.

**Example:**
```css
/* Source: TaskList.css (existing pattern for trash button) */
.gantt-tl-row-trash {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
}

.gantt-tl-row:hover .gantt-tl-row-trash {
  opacity: 1;
  pointer-events: auto;
}

/* NEW: Apply same pattern to action panel buttons */
.gantt-tl-action-btn {
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
}

.gantt-tl-row:hover .gantt-tl-action-btn {
  opacity: 1;
  pointer-events: auto;
}
```

### Anti-Patterns to Avoid
- **Hardcoding button coordinates:** Use flexbox layout, not absolute positioning (current trash button uses absolute, but panel should use flex for cleaner maintainability)
- **Duplicating icon definitions:** Export reusable icon components from DepIcons.tsx or create new ActionIcons.tsx
- **Breaking scroll synchronization:** Panel must use same scroll container as TaskList body (no separate scrolling)
- **Inline event handlers in JSX:** Use useCallback for performance (already established pattern in TaskListRow)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Icon system | Custom SVG strings or external icon libraries | Inline React SVG components (DepIcons pattern) | Consistent styling, no external deps, tree-shakeable |
| Hover state management | useState for hover visibility | CSS `:hover` pseudo-class | Simpler, no React re-renders, matches existing pattern |
| Button positioning | Absolute positioning calculations | Flexbox layout with fixed-width column | Responsive, handles window resize, simpler alignment |
| Callback wiring | New prop drilling | Existing `onDelete` and `onInsertAfter` callbacks | API already stable from Phase 16, no changes needed |

**Key insight:** The TaskList already has all the infrastructure needed (flexbox layout, hover-reveal CSS, callback props). This phase is purely structural refactoring, not new functionality.

## Common Pitfalls

### Pitfall 1: Breaking Vertical Scroll Synchronization
**What goes wrong:** Action panel doesn't scroll in sync with TaskList rows, causing misalignment.

**Why it happens:** Adding the panel as a separate scroll container or using position: fixed independently.

**How to avoid:** The action panel column must be part of the same `.gantt-tl-body` flex container as other cells. The panel itself doesn't scroll—its parent `.gantt-tl-body` scrolls (already synchronized with GanttChart via shared scroll container).

**Warning signs:** Panel buttons stay fixed while rows move behind them during vertical scroll.

### Pitfall 2: Hover State Not Propagating to Panel
**What goes wrong:** Buttons don't appear when hovering over the row, only when hovering directly over the panel.

**Why it happens:** CSS selector targets `.gantt-tl-cell-actions:hover` instead of `.gantt-tl-row:hover .gantt-tl-action-btn`.

**How to avoid:** Use parent selector pattern: `.gantt-tl-row:hover .gantt-tl-action-btn { opacity: 1 }`. The hover state originates from the row, not the panel cell.

**Warning signs:** Buttons flicker or only appear when mouse is directly over the narrow panel column.

### Pitfall 3: Removing Existing Buttons Too Early
**What goes wrong:** Delete or insert functionality breaks during transition.

**Why it happens:** Removing inline buttons from TaskListRow before the action panel is fully implemented and tested.

**How to avoid:** Implement action panel first, verify callbacks work, then remove old buttons. Keep TrashIcon and PlusIcon components accessible during transition.

**Warning signs:** TypeScript errors about missing props, or buttons that don't respond to clicks.

### Pitfall 4: Forgetting to Update taskListWidth
**What goes wrong:** TaskList overlay is too narrow, panel column gets cut off or wrapped.

**Why it happens:** Default `taskListWidth={520}` may not account for the new panel column width.

**How to avoid:** Calculate new width: existing columns (40 + flex + 68 + 68 + 120) + panel width (40-50) = ~366 + panel = ~410-420. Consider increasing default or making it configurable.

**Warning signs:** Panel column is squished or last border is cut off.

### Pitfall 5: Not Cleaning Up Old CSS
**What goes wrong:** Leftover CSS from inline buttons causes visual artifacts or conflicts.

**Why it happens:** Removing the JSX elements but forgetting to remove the associated CSS classes.

**How to avoid:** Remove `.gantt-tl-row-trash`, `.gantt-tl-dep-insert` and related CSS after confirming new panel works.

**Warning signs:** Buttons appearing in unexpected locations, hover effects not working consistently.

## Code Examples

Verified patterns from official sources:

### Adding Action Panel Column to TaskList Header
```tsx
// File: src/components/TaskList/TaskList.tsx
// Modify header section around line 249-284

<div className="gantt-tl-header" style={{ height: `${headerHeight + 0.5}px` }}>
  <div className="gantt-tl-headerCell gantt-tl-cell-number">№</div>
  <div className="gantt-tl-headerCell gantt-tl-cell-name">Имя</div>
  <div className="gantt-tl-headerCell gantt-tl-cell-date">Начало</div>
  <div className="gantt-tl-headerCell gantt-tl-cell-date">Окончание</div>
  <div className="gantt-tl-headerCell gantt-tl-cell-deps">{/* existing deps header */}</div>
  {/* NEW: Action panel header cell (empty or minimal icon) */}
  <div className="gantt-tl-headerCell gantt-tl-cell-actions" aria-label="Действия"></div>
</div>
```

### Adding Action Panel Cell to TaskListRow
```tsx
// File: src/components/TaskList/TaskListRow.tsx
// Modify row section around line 348-545

<div className="gantt-tl-row" style={{ minHeight: `${rowHeight}px`, position: 'relative' }} onClick={handleRowClickInternal}>
  {/* Remove existing trash button from lines 359-372 */}

  {/* Existing cells... */}
  <div className="gantt-tl-cell gantt-tl-cell-number">...</div>
  <div className="gantt-tl-cell gantt-tl-cell-name">...</div>
  <div className="gantt-tl-cell gantt-tl-cell-date">...</div>
  <div className="gantt-tl-cell gantt-tl-cell-date">...</div>

  {/* Modified deps cell — remove insert button from lines 515-541 */}
  <div className="gantt-tl-cell gantt-tl-cell-deps">
    {/* Keep chips, add button, remove insert button */}
  </div>

  {/* NEW: Action panel cell with two buttons */}
  <div className="gantt-tl-cell gantt-tl-cell-actions">
    {onInsertAfter && (
      <button
        type="button"
        className="gantt-tl-action-btn gantt-tl-action-insert"
        onClick={(e) => {
          e.stopPropagation();
          const newTask = { /* same task creation logic as lines 522-535 */ };
          onInsertAfter(task.id, newTask);
        }}
        aria-label="Вставить задачу после этой"
      >
        <PlusIcon />
      </button>
    )}
    {onDelete && (
      <button
        type="button"
        className="gantt-tl-action-btn gantt-tl-action-delete"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(task.id);
        }}
        aria-label="Удалить задачу"
      >
        <TrashIcon />
      </button>
    )}
  </div>
</div>
```

### Action Panel CSS Styles
```css
/* File: src/components/TaskList/TaskList.css */
/* Add new section after line 233 (.gantt-tl-cell-deps) */

/* Action panel cell — narrow column for icon buttons */
.gantt-tl-cell-actions {
  width: 48px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 0 4px;
  border-right: none; /* Last column, no border */
}

/* Action panel header cell */
.gantt-tl-headerCell.gantt-tl-cell-actions {
  justify-content: center;
  padding: 0;
}

/* Action buttons — hover-reveal, compact icon buttons */
.gantt-tl-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  width: 20px;
  height: 20px;
  padding: 0;
  cursor: pointer;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease, background-color 0.15s ease, border-color 0.15s ease;
}

/* Reveal buttons on row hover */
.gantt-tl-row:hover .gantt-tl-action-btn {
  opacity: 1;
  pointer-events: auto;
}

/* Insert button styling (green) */
.gantt-tl-action-insert {
  color: var(--gantt-success-color, #22c55e);
}

.gantt-tl-action-insert:hover {
  background-color: rgba(34, 197, 94, 0.1);
  border-color: var(--gantt-success-color, #22c55e);
}

/* Delete button styling (red) */
.gantt-tl-action-delete {
  color: #ef4444;
}

.gantt-tl-action-delete:hover {
  background-color: rgba(239, 68, 68, 0.1);
  border-color: #ef4444;
}
```

### Removing Old Button CSS
```css
/* File: src/components/TaskList/TaskList.css */
/* Remove or comment out these sections after verifying new panel works */

/* Lines 80-107: Remove .gantt-tl-row-trash styles */
/*
.gantt-tl-row-trash { ... }
.gantt-tl-row:hover .gantt-tl-row-trash { ... }
.gantt-tl-row-trash:hover { ... }
*/

/* Lines 453-482: Remove .gantt-tl-dep-insert styles */
/*
.gantt-tl-dep-insert { ... }
.gantt-tl-dep-insert:hover { ... }
.gantt-tl-cell-deps:hover .gantt-tl-dep-insert { ... }
*/
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Inline buttons in cells | Dedicated action panel column | Phase 17 (current) | Cleaner UI, centralized actions, consistent interaction pattern |
| Absolute positioning for delete button | Flexbox-based panel layout | Phase 17 (current) | Better maintainability, responsive behavior |
| Buttons scattered across cells | All actions in one location | Phase 17 (current) | Improved UX, easier to discover actions |

**Deprecated/outdated:**
- `.gantt-tl-row-trash` (absolute-positioned delete button): Replaced by panel column
- `.gantt-tl-dep-insert` (inline insert button in deps cell): Replaced by panel column
- Hover state only on individual cells: Now unified at row level

## Open Questions

1. **Panel width optimization**
   - What we know: Context suggests "narrow — just enough for two icon buttons"
   - What's unclear: Exact pixel width (40px vs 48px vs 52px)
   - Recommendation: Start with 48px (20px button × 2 + 4px gap + 4px padding), adjust based on visual testing

2. **Button layout direction**
   - What we know: Two buttons per row, need to fit in narrow column
   - What's unclear: Should buttons be side-by-side (horizontal) or stacked (vertical)
   - Recommendation: Side-by-side horizontal layout (matches existing deps cell pattern), fallback to vertical if 48px is too narrow

3. **Header cell content**
   - What we know: Claude's discretion allows "empty or minimal" header
   - What's unclear: Should header have an icon, text label, or be completely empty
   - Recommendation: Empty header with aria-label="Действия" for accessibility, minimal visual clutter

4. **Edge case: very narrow taskListWidth**
   - What we know: Consumers can customize taskListWidth prop
   - What's unclear: What happens if consumer sets width too narrow for panel
   - Recommendation: Document minimum recommended width (~450px), panel column flex-shrink: 0 prevents squishing

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.0.0 |
| Config file | vitest.config.ts |
| Environment | jsdom |
| Quick run command | `npm test -- src/__tests__/addDeleteTask.test.ts` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

This phase is a UI refactoring with no new logic requirements. Testing focuses on:
- Visual regression (manual verification in browser)
- Callback functionality (existing tests cover onDelete and onInsertAfter)
- CSS behavior (manual hover state verification)

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UI-REF-01 | Action panel column renders in TaskList | Manual-only | Visual inspection in demo page | ❌ Wave 0 |
| UI-REF-02 | Buttons appear on row hover | Manual-only | CSS hover state verification | ❌ Wave 0 |
| UI-REF-03 | Insert button calls onInsertAfter callback | Integration | Existing: addDeleteTask.test.ts | ✅ Phase 16 |
| UI-REF-04 | Delete button calls onDelete callback | Integration | Existing: addDeleteTask.test.ts | ✅ Phase 16 |
| UI-REF-05 | Old buttons removed from TaskListRow | Manual-only | Code inspection + visual test | ❌ Wave 0 |
| UI-REF-06 | Panel scrolls synchronized with TaskList | Manual-only | Vertical scroll test in browser | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test -- src/__tests__/addDeleteTask.test.ts` (verify existing callbacks still work)
- **Per wave merge:** `npm test` (full suite, ensure no regressions)
- **Phase gate:** Manual visual verification in demo page (browser-based UI testing)

### Wave 0 Gaps
- [ ] Manual test plan document — lists visual checks (hover states, button placement, scroll sync)
- [ ] Screenshot baseline — captures current TaskList appearance before changes
- [ ] Demo page test scenarios — verify insert/delete operations through new panel

**Reason for limited automation:** This phase is pure UI refactoring without logic changes. Existing callback tests (Phase 16) cover the functional behavior. New testing is visual (hover states, layout, positioning) which is better suited to manual browser verification than automated DOM tests.

## Sources

### Primary (HIGH confidence)
- Source code analysis: TaskList.tsx, TaskListRow.tsx, TaskList.css, DepIcons.tsx — Direct inspection of existing implementation patterns
- Context.md (Phase 17) — User decisions and implementation constraints
- vitest.config.ts — Test framework configuration

### Secondary (MEDIUM confidence)
- React documentation (flexbox layout, event handling patterns) — General React best practices already used in project
- CSS specification (hover pseudo-class, flexbox) — Standard CSS features used throughout TaskList.css

### Tertiary (LOW confidence)
- None — all findings verified against existing codebase or official documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries and patterns already exist in project, verified by source code inspection
- Architecture: HIGH - Flexbox layout pattern verified in TaskList.tsx, hover-reveal pattern verified in TaskList.css
- Pitfalls: HIGH - Scroll synchronization and hover state patterns analyzed from existing implementation, common React+CSS issues well-documented

**Research date:** 2026-03-08
**Valid until:** 30 days (stable architecture, low risk of pattern changes)

---

*Phase: 17-action-buttons-panel*
*Research completed: 2026-03-08*
