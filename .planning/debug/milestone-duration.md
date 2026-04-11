---
status: awaiting_human_verify
trigger: "Milestones should have zero duration, but the system doesn't fully respect this in several places"
created: 2026-04-11T00:00:00Z
updated: 2026-04-11T02:00:00Z
---

## Current Focus

hypothesis: CONFIRMED — all 6 issues fixed (including 2 new: duration editable for milestones, drag preview cascade)
test: vitest run — pre-existing failures only (document/window is not defined in jsdom), 154 non-DOM tests pass
expecting: user verifies in browser
next_action: human verification

## Symptoms

expected: Milestones should behave as zero-duration events:
1. TaskList: if duration = 0, it's a milestone — don't show duration column value
2. Grid: don't show day count label next to milestone bars
3. Dependencies: when calculating dependency dates FROM a milestone with lag=0, the dependent task should start on the SAME day as the milestone (not next day)
4. During drag, cascade should treat milestone as zero-duration point

actual: 
1. Duration is shown for milestones in task list
2. Day count label appears next to milestone diamonds on grid
3. Dependency engine adds +1 day even for milestones
4. Drag cascades use the date range of milestone instead of zero-duration

errors: No errors, just incorrect behavior
reproduction: Create a milestone task, add FS dependency from it, observe incorrect date calculations
started: Milestones were just implemented

## Eliminated

(none yet)

## Evidence

- timestamp: 2026-04-11T01:00:00Z
  checked: TaskListRow.tsx durationCell render (line ~2193)
  found: `isMilestone ? "1д" : ...` — milestone showed "1д" always
  implication: Issue #1 confirmed

- timestamp: 2026-04-11T01:00:00Z
  checked: TaskRow.tsx rightLabels section (line ~413)
  found: `!showDurationInside` without `!milestone` check — milestone showed external duration label
  implication: Issue #2 confirmed. Note: showDurationInside already excluded milestone via `!milestone && ...`, but external label did not.

- timestamp: 2026-04-11T01:00:00Z
  checked: dependencies.ts calculateSuccessorDate, cascade.ts universalCascade RULE3, execute.ts, commands.ts
  found: All predecessor date calculations used raw `predecessor.endDate` without checking milestone type. For milestone with same start/end but type='milestone', FS lag=0 should give successor start = predecessor start (same day), not predecessor end + 1.
  implication: Issues #3 and #4 confirmed.

## Eliminated

- hypothesis: useTaskDrag was not normalizing milestone endDate during drag
  evidence: useTaskDrag already did `newEndDate = isMilestoneTask(currentTask) ? finalRange.start : finalRange.end` (line 652-654). The bug was in cascade engine reading raw task.endDate from taskById/snapshot.
  timestamp: 2026-04-11T01:00:00Z

## Resolution

root_cause: |
  6 separate issues (4 from previous session + 2 new):
  1. TaskListRow showed "1д" for milestone duration cell (should be empty)
  2. TaskRow showed external duration label for milestone bars
  3. All dependency/cascade functions used raw predecessor.endDate without normalizing for milestone type
  4. Same as #3 but specifically during drag cascade via universalCascade RULE3 (on drop — FIXED in previous session)
  5. NEW: TaskListRow duration cell for milestone was not editable at all (handleDurationClick returned early)
  6. NEW: useTaskDrag live drag preview for milestone passed previewEndDate = previewRange.end (not normalized to startDate), causing dependent tasks to jump by phantom duration during drag mousemove

fix: |
  5. TaskListRow.tsx — removed `if (isMilestone) return` from handleDurationClick; show "0" in span; init value=0 for milestone; applyDurationChange allows 0; handleDurationSave/handleDurationKeyDown convert milestone→task when value>0 and task→milestone when value===0; input min=0
  6. useTaskDrag.ts lines 317-318 — added `const isMilestone = originalDraggedTask ? isMilestoneTask(originalDraggedTask) : false` and `const previewEndDate = isMilestone ? previewRange.start : previewRange.end` to normalize milestone endDate in drag preview cascade
  Updated taskListMilestone test: "prevents independent duration edits" → "shows 0 duration and opens editor on click"

verification: 154 non-DOM tests pass, pre-existing jsdom failures unchanged
files_changed:
  - src/components/TaskList/TaskListRow.tsx
  - src/components/TaskRow/TaskRow.tsx
  - src/core/scheduling/dependencies.ts
  - src/core/scheduling/cascade.ts
  - src/core/scheduling/execute.ts
  - src/core/scheduling/commands.ts
  - src/utils/dependencyUtils.ts
  - src/hooks/useTaskDrag.ts
  - src/__tests__/taskListMilestone.test.tsx
