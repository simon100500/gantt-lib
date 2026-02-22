---
status: fixing
trigger: "SF dependency lag shows -1 instead of 0 when successor's end (B_end) equals predecessor's start (A_start)"
created: 2026-02-22T00:00:00Z
updated: 2026-02-22T00:01:00Z
---

## Current Focus

hypothesis: CONFIRMED - two bugs in useTaskDrag.ts
test: Fix both bugs and verify
expecting: Lag = 0 when B's visual end = A's start
next_action: Apply fix 1 (remove -1 from recalculateIncomingLags) and fix 2 (correct SF constraint boundary)

## Symptoms

expected: Lag = 0 when B's visual end date equals A's start date (SF constraint at zero offset)
actual: Lag = -1 even when B_end = A_start
errors: No runtime errors - just wrong numeric value displayed
reproduction: Open gantt app, find SF dependency tasks (elevator equipment), drag task B so its end aligns with task A's start - lag shows -1 instead of 0
started: After two fix attempts both failed

## Eliminated

- hypothesis: Bug is in DependencyLines.tsx calculateEffectiveLag formula
  evidence: The formula is correct. pixelsToDate(right - dayWidth) correctly converts exclusive right pixel to inclusive visual end date. With correct constraint clamping (B.right = predStartLeft + dayWidth), the formula gives lag=0.
  timestamp: 2026-02-22T00:01:00Z

- hypothesis: endDate is exclusive (day after visual end)
  evidence: calculateTaskBar (geometry.ts line 37) does width = (duration + 1) * dayWidth and handleComplete (useTaskDrag.ts line 654) does durationDays = (width/dayWidth) - 1. Both confirm endDate is INCLUSIVE (the actual visual last day). The comment "endDate is exclusive" in useTaskDrag.ts is WRONG.
  timestamp: 2026-02-22T00:01:00Z

## Evidence

- timestamp: 2026-02-22T00:01:00Z
  checked: geometry.ts calculateTaskBar
  found: width = (duration + 1) * dayWidth where duration = endDate - startDate. This confirms endDate is INCLUSIVE.
  implication: The comment in useTaskDrag.ts SF branch claiming "endDate is exclusive" is incorrect, leading to wrong -1 adjustment.

- timestamp: 2026-02-22T00:01:00Z
  checked: useTaskDrag.ts handleComplete (line 654)
  found: durationDays = Math.round(finalWidth / dayWidth) - 1; confirms newEndDate is inclusive visual end.
  implication: When the SF constraint correctly places B.right = predStartLeft + dayWidth, newEndDate = predStart (same day), and without -1 adjustment lag = 0.

- timestamp: 2026-02-22T00:01:00Z
  checked: useTaskDrag.ts SF constraint (lines 354-360)
  found: Clamps B.right = predStartLeft (= 150*dayWidth). But for lag=0, B's last day should BE day 150, meaning B.right (exclusive) = 151*dayWidth. So clamping to 150*dayWidth makes B end on day 149 = lag -1.
  implication: SF constraint off by 1 day. Should clamp B.right <= predStartLeft + dayWidth.

- timestamp: 2026-02-22T00:01:00Z
  checked: useTaskDrag.ts recalculateIncomingLags SF (lines 250-255)
  found: Subtracts 1 day from newEndDate claiming it is exclusive. But newEndDate IS already the inclusive visual end. The -1 converts it to the day BEFORE the visual end, causing lag to be 1 too negative.
  implication: Remove the -1 adjustment entirely.

- timestamp: 2026-02-22T00:01:00Z
  checked: DependencyLines.tsx calculateEffectiveLag SF (lines 65-75)
  found: Uses pixelsToDate(succPosition.right - dayWidth) which correctly produces inclusive visual end date. No fix needed here.
  implication: Display formula is correct, only useTaskDrag.ts has bugs.

- timestamp: 2026-02-22T00:01:00Z
  checked: Combined trace with both fixes
  found: At lag=0 (B.right = predStartLeft + dayWidth = 151*dayWidth): newEndDate = baseDate+150; lag = 150 - 150 = 0. DependencyLines: pixelsToDate(151-1=150 days) = baseDate+150; lag = 0.
  implication: Both fixes together produce correct result.

## Resolution

root_cause: Two bugs in useTaskDrag.ts:
  1. recalculateIncomingLags SF branch (line 251) incorrectly subtracts 1 day from newEndDate claiming it is exclusive, but endDate is actually inclusive (visual last day). This makes stored lag 1 too negative.
  2. SF constraint (line 357-358) clamps B.right = predStartLeft instead of predStartLeft + dayWidth. Since right is exclusive, B.right = predStartLeft means B ends the day BEFORE A starts (lag=-1), not the same day (lag=0).

fix: Remove -1 adjustment in recalculateIncomingLags SF; change SF constraint to use predStartLeft + dayWidth.
verification:
files_changed:
  - packages/gantt-lib/src/hooks/useTaskDrag.ts
