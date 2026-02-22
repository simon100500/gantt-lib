---
phase: quick-022-lag-label-above-line
plan: 01
subsystem: Dependency Visualization
tags: [quick-task, lag-label, direction-aware, dependency-lines, ui-fix]
dependency_graph:
  requires: []
  provides: [direction-aware-lag-positioning]
  affects: [dependency-lines-rendering]
tech_stack:
  added: []
  patterns: [reverseOrder-flag, conditional-positioning, type-expansion]
key_files:
  created: []
  modified:
    - packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx
decisions: []
metrics:
  duration: 163
  completed_date: 2026-02-22
---

# Phase Quick-022 Plan 01: Lag Label Above Line Summary

**One-liner:** Direction-aware lag label vertical positioning based on dependency arrow direction using `reverseOrder` flag.

## Objective

Fix lag label vertical positioning to be above the horizontal line when the dependency arrow goes from bottom to top (predecessor below successor). Previously, lag labels were always positioned at `fromY + 12` regardless of arrow direction, causing labels to appear below the line for upward arrows, which was visually incorrect.

## Implementation

### Task 1: Make lag label y-position direction-aware (2ff0591)

Modified `packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx`:

1. **Added `reverseOrder` to line object type definition** (line 160)
   - Extended the line object type to include `reverseOrder: boolean`
   - This flag indicates arrow direction: `true` = arrow goes UP, `false` = arrow goes DOWN

2. **Included `reverseOrder` in lines.push call** (line 224)
   - Added `reverseOrder` to the object pushed to the lines array
   - The `reverseOrder` value is already calculated earlier in the useMemo: `const reverseOrder = predecessorIndex > successorIndex`

3. **Applied conditional y-position in JSX** (line 283)
   - Changed from: `y={fromY + 12}`
   - Changed to: `y={reverseOrder ? fromY - 4 : fromY + 12}`
   - For upward arrows (reverseOrder = true): label at `fromY - 4` (ABOVE the horizontal line)
   - For downward arrows (reverseOrder = false): label at `fromY + 12` (BELOW the horizontal line)

### Changes Summary

```tsx
// Type definition (line 160)
const lines: Array<{
  id: string;
  path: string;
  hasCycle: boolean;
  lag: number;
  fromX: number;
  toX: number;
  fromY: number;
  reverseOrder: boolean;  // ADDED
}> = [];

// lines.push (line 224)
lines.push({
  id: `${edge.predecessorId}-${edge.successorId}-${edge.type}`,
  path,
  hasCycle,
  lag,
  fromX,
  toX,
  fromY,
  reverseOrder,  // ADDED
});

// JSX (line 283)
y={reverseOrder ? fromY - 4 : fromY + 12}  // CHANGED from fromY + 12
```

## Deviations from Plan

### Auto-fixed Issues

None - plan executed exactly as written.

### Auth Gates

None - no authentication required for this task.

## Verification

- TypeScript compilation: Build succeeds (`npm run build` completed successfully)
- Human verification: Approved - lag labels display at correct vertical position for all arrow directions
- Visual testing:
  - Upward arrows (predecessor below successor): label displays ABOVE the horizontal line
  - Downward arrows (predecessor above successor): label displays BELOW the horizontal line
  - No visual overlap between label and arrow line
  - No visual overlap between label and task bar

## Success Criteria Met

- Lag labels display at correct vertical position for all arrow directions
- No regression to existing label styling or positioning (x-position, text anchor, etc.)
- Clean visual appearance without overlapping elements

## Files Modified

- `packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx`: Added direction-aware lag label positioning

## Related Context

This quick task builds on:
- Quick 021: Added lag number display to dependency connection lines
- Phase 9: FF dependency implementation with type-aware connection points
- Phase 8: SS dependency implementation with direction-aware rendering

## Next Steps

No next steps - this is a complete quick task for UI improvement.
