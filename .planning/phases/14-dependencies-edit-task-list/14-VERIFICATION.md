---
phase: 14-dependencies-edit-task-list
verified: 2026-03-03T12:00:00Z
status: passed
score: 13/13 must-haves verified
re_verification: false
human_verification:
  - test: "Visual flow — column header renders and type switcher works"
    expected: "Header shows «Связи [ОН ▾]»; clicking opens Popover with ОН/НН/ОО/НО; selecting НН updates header to «Связи [НН ▾]»"
    why_human: "JSX structure is correct but dropdown interaction requires a browser to verify Radix Popover open/close behavior"
  - test: "Picker mode UX flow"
    expected: "Clicking «+» on row A enters picker mode; other rows show crosshair cursor on «Связи» cell and blue highlight on hover; clicking row B in «Связи» cell adds chip to row B showing «ОН(N)» where N is row A's 1-based index; row A shows opacity 0.4 (disabled)"
    why_human: "CSS cascade behavior (.gantt-tl-row-picking .gantt-tl-cell-deps) and cursor styling requires a browser; argument order correctness (post-checkpoint fix) is a UX semantic that cannot be fully validated from static code"
  - test: "Cycle detection error banner"
    expected: "Attempting A→B when B→A already exists shows red banner «Цикл зависимостей!» for 3 seconds then auto-dismisses"
    why_human: "setTimeout behavior and visual banner appearance require a running app"
  - test: "Escape and outside-click cancel picker mode"
    expected: "Pressing Escape or clicking outside the TaskList overlay while in picker mode clears picker state and removes highlight from all rows"
    why_human: "Event listener interaction with overlayRef.current.contains() requires browser DOM"
---

# Phase 14: Dependencies Edit Task List — Verification Report

**Phase Goal:** Add an editable «Связи» (Dependencies) column to the TaskList component, allowing users to view, add, and remove task dependencies directly from the task list UI, with support for dependency type selection and cycle detection.
**Verified:** 2026-03-03T12:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | TaskList renders a «Связи» column header showing the active link type (default «Связи [ОН ▾]») | VERIFIED | TaskList.tsx L155-189: header div with `.gantt-tl-cell-deps`, Popover trigger renders `Связи [{LINK_TYPE_LABELS[activeLinkType]} &#9662;]`; `activeLinkType` defaults to `'FS'` → label `'ОН'` |
| 2 | Clicking the header opens a Popover with ОН, НН, ОО, НО options; selecting one updates the header label | VERIFIED | TaskList.tsx L162-184: `Popover` with `open={typeMenuOpen}`, four options rendered via `LINK_TYPE_ORDER.map`, each calls `setActiveLinkType(lt)` + `setTypeMenuOpen(false)` |
| 3 | GanttChart accepts and forwards `disableDependencyEditing` prop; when true, type switcher is disabled | VERIFIED | GanttChart.tsx L108 (prop declared), L141 (destructured, default false), L422 (forwarded to `<TaskList>`); TaskList.tsx L166 (`disabled={disableDependencyEditing}` on trigger button) |
| 4 | TaskList tracks `activeLinkType` (default 'FS') and `selectingPredecessorFor` (null) state | VERIFIED | TaskList.tsx L71-72: `useState<LinkType>('FS')` and `useState<string | null>(null)` |
| 5 | TaskList attaches Escape and outside-click listeners when `selectingPredecessorFor !== null`, cancels picker mode on trigger | VERIFIED | TaskList.tsx L78-94: `useEffect` conditioned on `selectingPredecessorFor`, attaches `keydown` and `mousedown` (capture) listeners, removes on cleanup; uses `overlayRef.current?.contains()` for outside-click detection |
| 6 | `cycleError` state and `handleAddDependency` / `handleRemoveDependency` callbacks are defined in TaskList | VERIFIED | TaskList.tsx L74 (`cycleError`), L96-132 (`handleAddDependency` with self-link guard, duplicate guard, `validateDependencies` call, 3s error flash), L134-145 (`handleRemoveDependency`) |
| 7 | Each task row shows dependency chips in «Связи» cell: format «ОН(2)» (type abbreviation + predecessor row number) | VERIFIED | TaskListRow.tsx L85-93: `useMemo` computes `chips` from `task.dependencies`, each chip label is `` `${labels[dep.type]}(${predecessorIndex + 1})` `` using 1-based index in `allTasks` |
| 8 | Maximum 2 chips shown inline; additional chips hidden behind «+N ещё» Popover listing all deps with × delete | VERIFIED | TaskListRow.tsx L95-96: `visibleChips = chips.slice(0, 2)`, `hiddenChips = chips.slice(2)`; L258-289: overflow `Popover` with `+{hiddenChips.length} ещё` trigger, full `chips` list with × buttons |
| 9 | Chip hover reveals × button; clicking × immediately removes that dependency via `onRemoveDependency` | VERIFIED | TaskListRow.tsx L243-254: chip span with `.gantt-tl-dep-chip-remove` button (only shown when `!disableDependencyEditing`); CSS L272: `.gantt-tl-dep-chip:hover .gantt-tl-dep-chip-remove { display: inline-flex }`; L165-168: `handleRemoveChip` calls `onRemoveDependency(task.id, dep.taskId, dep.type)` |
| 10 | «+» button in cell activates predecessor picker mode for that row (sets `selectingPredecessorFor`) | VERIFIED | TaskListRow.tsx L292-301: `+` button visible when `!disableDependencyEditing && !isPicking`; L153-156: `handleAddClick` calls `onSetSelectingPredecessorFor?.(task.id)` |
| 11 | In picker mode: other rows show crosshair cursor on «Связи» cell and highlight on hover; clicking adds dependency | VERIFIED | TaskListRow.tsx L178: `isPicking && !isSourceRow` adds `gantt-tl-row-picking` class; CSS L357-365: `.gantt-tl-row-picking .gantt-tl-cell-deps { cursor: crosshair }` and `:hover` rule; L238: cell `onClick={isPicking && !isSourceRow ? handlePredecessorPick : undefined}`; L158-163: `handlePredecessorPick` calls `onAddDependency?.(task.id, selectingPredecessorFor, activeLinkType)` |
| 12 | Current task's own row in picker mode shows disabled (opacity 0.4, not-allowed cursor) | VERIFIED | TaskListRow.tsx L179: `isSourceRow` adds `gantt-tl-row-picking-self`; CSS L367-370: `.gantt-tl-row-picking-self .gantt-tl-cell-deps { opacity: 0.4; cursor: not-allowed }` |
| 13 | `disableDependencyEditing=true` hides + and × buttons; chips remain visible (read-only) | VERIFIED | TaskListRow.tsx L244: `{!disableDependencyEditing && (<button ... chip-remove />)}`; L274: same guard in overflow list; L292: `{!disableDependencyEditing && !isPicking && (<button ... dep-add />)}`; chip spans themselves are always rendered |

**Score:** 13/13 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/gantt-lib/src/components/TaskList/TaskList.css` | All `gantt-tl-dep-*` CSS classes | VERIFIED | 20 occurrences of `gantt-tl-dep-` confirmed; includes header cell, type trigger, dropdown menu/options, chips, chip-remove, overflow trigger/list/item/remove, add button, picker state rules (`.gantt-tl-row-picking`, `.gantt-tl-row-picking-self`), error banner |
| `packages/gantt-lib/src/components/TaskList/TaskList.tsx` | `activeLinkType` + `selectingPredecessorFor` state, `LINK_TYPE_LABELS`, `handleAddDependency`, `handleRemoveDependency`, `cycleError`, column header with type Popover, props forwarded to `TaskListRow` | VERIFIED | Full implementation confirmed at lines 11-211; all items present and substantive |
| `packages/gantt-lib/src/components/GanttChart/GanttChart.tsx` | `disableDependencyEditing` in `GanttChartProps`, destructured, forwarded to `TaskList` | VERIFIED | Prop present at L108, destructured at L141, passed at L422 |
| `packages/gantt-lib/src/components/TaskList/TaskListRow.tsx` | «Связи» cell with chips, overflow Popover, add button, picker interaction, `disableDependencyEditing` guard | VERIFIED | Complete implementation at lines 85-302; `TaskListRow` and `TaskListRowProps` both exported |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `GanttChart.tsx` | `TaskList.tsx` | `disableDependencyEditing` prop | WIRED | Prop declared in `GanttChartProps` (L108), destructured (L141), passed to `<TaskList disableDependencyEditing={disableDependencyEditing}>` (L422) |
| `TaskList.tsx` | `validateDependencies()` in `dependencyUtils.ts` | import and call in `handleAddDependency` | WIRED | Imported at L6: `import { validateDependencies } from '../../utils/dependencyUtils'`; called at L122: `const validation = validateDependencies(hypothetical)` with result used at L123 |
| `TaskListRow.tsx` «+» button | `TaskList.selectingPredecessorFor` state | `onSetSelectingPredecessorFor(task.id)` callback | WIRED | `onSetSelectingPredecessorFor` in props (L35), destructured (L66), called in `handleAddClick` (L155); passed from TaskList as `onSetSelectingPredecessorFor={setSelectingPredecessorFor}` (L208) |
| `TaskListRow.tsx` «Связи» cell click (picker mode) | `TaskList.handleAddDependency` | `onAddDependency(task.id, selectingPredecessorFor, activeLinkType)` | WIRED | `onAddDependency` in props (L37), destructured (L67), called in `handlePredecessorPick` (L162); passed from TaskList as `onAddDependency={handleAddDependency}` (L209) |
| `TaskListRow.tsx` × button | `TaskList.handleRemoveDependency` | `onRemoveDependency(task.id, dep.taskId, dep.type)` | WIRED | `onRemoveDependency` in props (L39), destructured (L68), called in `handleRemoveChip` (L167); passed from TaskList as `onRemoveDependency={handleRemoveDependency}` (L210) |

---

### Requirements Coverage

No requirement IDs were declared in either plan's frontmatter (`requirements: []`). Phase goal satisfaction is assessed via truth verification above.

---

### Anti-Patterns Found

No blockers or critical stubs detected in modified files.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `packages/gantt-lib/src/components/TaskList/TaskListRow.tsx` | 85-93 | `useMemo` uses `labels` (derived from `linkTypeLabels` prop) as a dependency — `labels` is re-created on every render when `linkTypeLabels` is undefined (falls back to `DEFAULT_LABELS` via `??` operator, but `DEFAULT_LABELS` is module-level const so stable) | Info | No functional issue; `DEFAULT_LABELS` is module-level const so object identity is stable |
| Pre-existing: `src/__tests__/useTaskDrag.test.ts` (L716, L1070) | 716, 1070 | TypeScript errors (predicate type mismatch) — introduced before Phase 14 (phases 4/6) | Info | Pre-existing, out of scope for Phase 14 |
| Pre-existing: `src/components/index.ts` (L7) | 7 | `export { DragGuideLines }` — named export from default-export module — introduced before Phase 14 | Info | Pre-existing, out of scope for Phase 14 |

---

### Human Verification Required

#### 1. Column Header Renders Correctly

**Test:** Start dev server (`cd packages/website && npm run dev`), open http://localhost:3000, enable task list. Look at the rightmost header column.
**Expected:** Shows «Связи [ОН ▾]». Clicking opens Popover dropdown with four options: ОН, НН, ОО, НО. Selecting НН updates header to «Связи [НН ▾]».
**Why human:** Radix Popover open/close behavior and HTML entity rendering (&#9662;) require browser to verify.

#### 2. Picker Mode UX Flow

**Test:** Click «+» on any task row. Observe all other rows' «Связи» cells. Click one of them. Observe the source row while in picker mode.
**Expected:** After clicking «+» on row A: other rows show crosshair cursor on «Связи» cell and blue highlight on hover. Row A shows opacity 0.4 (disabled). Clicking row B in «Связи» column adds chip «ОН(A_index)» to row B (B depends on A; A is predecessor).
**Why human:** CSS cascade behavior with cursor and hover effects requires a browser. The post-checkpoint argument order fix (3b81bdd) corrected dependency direction — semantic correctness requires manual verification.

#### 3. Cycle Detection Error Banner

**Test:** Create dependency A→B, then try to create B→A.
**Expected:** Red banner «Цикл зависимостей!» appears below the «Связи» column header and auto-dismisses after approximately 3 seconds. The second dependency is not added.
**Why human:** `setTimeout(() => setCycleError(false), 3000)` and visual banner placement require browser.

#### 4. Escape and Outside-Click Cancel Picker Mode

**Test:** Click «+» on a row to enter picker mode. Press Escape. Repeat: click «+», then click outside the task list overlay.
**Expected:** Both actions cancel picker mode — all rows lose crosshair/highlight styling, «+» buttons reappear on all rows.
**Why human:** `document.addEventListener` with `overlayRef.current?.contains()` boundary detection requires browser DOM interaction.

---

### Gaps Summary

No gaps found. All 13 observable truths are verified by direct code inspection. All four required artifacts exist, are substantive (full implementations, not stubs), and are wired correctly. All five key links are present and connected. The three TypeScript errors reported by `tsc --noEmit` are pre-existing (introduced in phases 4 and 6, confirmed by git log) and are explicitly documented as out of scope in both plan summaries.

The only items flagged for human verification are visual/interactive behaviors that are structurally correct in the code but cannot be confirmed without a browser. The overall architecture is sound and the goal is achieved.

---

_Verified: 2026-03-03T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
