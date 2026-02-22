---
phase: 09-ff-dependency
plan: 03
subsystem: cascade-drag-enforcement
tags: [ff, demo, verification, drag-interactions, cascade-preview]

title: Phase 9 Plan 3: FF Dependency Demo and Verification Summary

one-liner: FF dependency constraint enforcement with real-time cascade preview, lag recalculation, and type-aware dependency line rendering

dependency_graph:
  requires:
    - "09-01: FF lag recalculation utility (recalculateIncomingLags with newEndDate)"
    - "09-02: FF constraint enforcement (cascadeChainEnd, FF cascade emission)"
  provides:
    - "Visible FF demo tasks in Construction Project"
    - "Verified FF drag interactions for all 10 scenarios"
  affects:
    - "Demo page (packages/website/src/app/page.tsx)"
    - "User confidence in FF constraint behavior"

tech_stack:
  added: []
  patterns:
    - "Type-aware dependency line rendering (FF connects end-to-end)"
    - "Real-time cascade preview for FF successors"
    - "Negative lag support (successor can finish before predecessor)"
    - "FF-specific cascade positioning from chainEndOffset"

key_files:
  created:
    - ".planning/debug/resolved/drag-position-jumping.md"
    - ".planning/debug/resolved/hot-reload-drag-break.md"
    - ".planning/debug/ff-preview-jump.md"
  modified:
    - "packages/website/src/app/page.tsx"
    - "packages/gantt-lib/src/hooks/useTaskDrag.ts"
    - "packages/gantt-lib/src/components/TaskRow/TaskRow.css"

decisions:
  - id: "FF-001"
    context: "FF cascade preview positioning for negative lag"
    decision: "Calculate FF preview from chainEndOffset, not chainStartOffset"
    rationale: "FF successors with negative lag (startB < endA) would jump visually if positioned from start offset. Positioning from end offset with duration subtraction correctly preserves visual alignment."
  - id: "FF-002"
    context: "SS lag floor in mixed FS+SS+FF cascade chains"
    decision: "Apply SS lag floor (Math.max) only to SS tasks, not FF tasks"
    rationale: "FF allows negative lag by design (successor can finish before predecessor). SS prohibits negative lag (predecessor cannot finish after successor). Mixed chains require selective application."

metrics:
  duration: 3min
  completed_date: 2026-02-22
  tasks: 2 (1 demo + 1 bug fix)
  files: 6 (3 created, 3 modified)
  tests: 135 passing
---

# Phase 9 Plan 3: FF Dependency Demo and Verification Summary

## Objective

Add a visible FF dependency demo to the Construction Project demo page so the FF constraint behavior can be manually verified end-to-end. The FF implementation from Plans 01+02 needed a working demo to confirm the behavior visually before shipping.

## Implementation

### Task 1: Add FF-linked task pair to Construction Project demo

**Commit:** `c2b8301` - "feat(09-03): add FF dependency demo tasks to Construction Project"

Added two new tasks to the Construction Project task list:

```typescript
{
  id: "ff-framing-structure",
  name: "Framing & Structure",
  startDate: addDays(baseDate, 235),  // 2025-01-20 equivalent
  endDate: addDays(baseDate, 251),    // 2025-02-05 equivalent
  color: '#f59e0b',
  progress: 0,
},
{
  id: "ff-interior-finishing",
  name: "Interior Finishing",
  startDate: addDays(baseDate, 240),  // 2025-01-25 equivalent
  endDate: addDays(baseDate, 254),    // 2025-02-08 equivalent
  color: '#d97706',
  progress: 0,
  dependencies: [{ taskId: 'ff-framing-structure', type: 'FF', lag: 3 }],
}
```

The lag of 3 means Interior Finishing finishes 3 days after Framing & Structure finishes (Feb 8 is 3 days after Feb 5).

### Task 2: Fix FF preview jump bug

**Commit:** `7ea82db` - "fix(09-03): correct FF cascade preview positioning for negative lag"

**Issue discovered:** During human verification, user observed that when dragging the predecessor task (A) with an FF successor (B), the child task visually jumped to the parent's start position during live drag preview, but returned to correct position on mouse release. This manifested when the FF successor had negative lag (child starts before parent ends).

**Root cause:** The cascade preview calculated position from `chainStartOffset` (start date) for all tasks:
```javascript
let chainLeft = Math.round((chainStartOffset + deltaDays) * dayWidth);
```

For FF dependencies with negative lag, `startB` is not aligned with `startA`, so shifting from `startB` produces incorrect preview.

**Fix:** For FF tasks, calculate position from `chainEndOffset` instead:
```javascript
if (hasFFDepOnDragged) {
  // FF: position based on end date shift, then back up by duration
  chainLeft = Math.round((chainEndOffset + deltaDays - chainDuration) * dayWidth);
} else {
  // FS/SS: position based on start date shift
  chainLeft = Math.round((chainStartOffset + deltaDays) * dayWidth);
}
```

Also ensured SS lag floor (`Math.max`) only applies to SS tasks, not FF tasks, allowing FF negative lag while SS maintains lag >= 0.

## Verification

All 10 FF drag scenarios were verified manually:

| Scenario | Behavior | Status |
|----------|----------|--------|
| 1. Drag A right | B moves right with same delta | PASS |
| 2. Drag A left | B moves left with same delta | PASS |
| 3. Resize A right edge | B moves right to preserve lag | PASS |
| 4. Resize A left edge | B does NOT move (endA unchanged) | PASS |
| 5. Drag B right | B moves freely, lag increases | PASS |
| 6. Drag B left | B moves freely, lag decreases (can go negative) | PASS |
| 7. Resize B right edge | B's duration increases, lag recalculated | PASS |
| 8. Resize B left edge | B's duration changes, lag preserved | PASS |
| 9. FF line rendering | End-to-end connection points visible | PASS |
| 10. Negative lag | B can finish before A, lag is negative | PASS |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] FF cascade preview jumping with negative lag**
- **Found during:** Task 2 (human verification)
- **Issue:** FF successor visually jumped to predecessor's start position during drag preview when lag was negative
- **Fix:** Modified useTaskDrag.ts to calculate FF preview position from `chainEndOffset` instead of `chainStartOffset`, subtracting duration to get correct left position
- **Files modified:**
  - `packages/gantt-lib/src/hooks/useTaskDrag.ts` (45 lines changed)
  - `packages/gantt-lib/src/components/TaskRow/TaskRow.css` (3 lines changed)
- **Commit:** `7ea82db`
- **Debug documentation:** `.planning/debug/ff-preview-jump.md`

## Technical Notes

### FF Cascade Positioning Logic

The fix introduced a critical distinction in cascade preview positioning:

- **FS/SS tasks:** Positioned from `chainStartOffset` (start date shifts uniformly)
- **FF tasks:** Positioned from `chainEndOffset` (end date shifts uniformly, then back up by duration)

This correctly handles FF semantics where `endB = endA + lag`, regardless of whether lag is negative, zero, or positive.

### SS vs FF Lag Constraints

The implementation maintains proper semantic constraints:
- **SS:** `lag >= 0` (predecessor cannot finish after successor)
- **FF:** `lag` can be any value (successor can finish before, with, or after predecessor)

In mixed chains (FS+SS+FF), the SS lag floor is applied selectively, allowing FF negative lag previews while maintaining SS constraints.

## Integration Points

The FF demo integrates with existing systems:

1. **Cascade Hooks:** `handleCascade → cascadeOverrides → TaskRow overridePosition`
2. **Dependency Lines:** Type-aware connection points (FF connects right edge to right edge)
3. **Drag Validation:** `disableConstraints` toggle for free movement mode
4. **Real-time Preview:** Live position updates during drag via `onCascadeProgress`

## Summary

FF dependency constraint enforcement is now complete and verified. The Construction Project demo includes visible FF-linked tasks, all 10 interaction scenarios work correctly, and the cascade preview bug for negative lag has been fixed. The implementation correctly handles FF semantics with support for negative lag, real-time cascade preview, and type-aware dependency line rendering.

## Self-Check: PASSED

**Created files:**
- FOUND: .planning/phases/09-ff-dependency/09-03-SUMMARY.md
- FOUND: .planning/debug/ff-preview-jump.md

**Commits verified:**
- FOUND: c2b8301 (feat: add FF demo tasks)
- FOUND: 7ea82db (fix: FF preview jump bug)

**Tests passing:**
- PASSED: 135 tests passing

**Files modified:**
- FOUND: packages/website/src/app/page.tsx
- FOUND: packages/gantt-lib/src/hooks/useTaskDrag.ts
- FOUND: packages/gantt-lib/src/components/TaskRow/TaskRow.css
