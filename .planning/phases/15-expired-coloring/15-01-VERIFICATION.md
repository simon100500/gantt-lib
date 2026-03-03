---
phase: 15-expired-coloring
verified: 2026-03-04T02:30:00Z
status: passed
score: 6/6 must-haves verified
---

# Phase 15: Expired Task Coloring Verification Report

**Phase Goal:** Add visual highlighting for expired/overdue tasks in the Gantt chart with a global toggle switch
**Verified:** 2026-03-04T02:30:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | ------- | ---------- | -------------- |
| 1 | User sees red background on tasks where endDate < today AND (progress < 100% OR not accepted) | VERIFIED | TaskRow.tsx lines 154-156: `barColor = isExpired ? 'var(--gantt-expired-color)' : ...` |
| 2 | User sees normal task color when highlightExpiredTasks is false (default behavior) | VERIFIED | GanttChart.tsx line 152: default value `false`, TaskRow.tsx line 108: early return `if (!highlightExpiredTasks) return false` |
| 3 | User sees normal task color when endDate >= today even if highlightExpiredTasks is true | VERIFIED | TaskRow.tsx line 119: `endDatePassed = taskEnd.getTime() < today.getTime()` — false when future date |
| 4 | User sees normal task color when progress = 100% AND accepted = true even if endDate < today | VERIFIED | TaskRow.tsx line 123: `notAccepted = task.accepted !== true`, line 138: `notComplete || notAccepted` check |
| 5 | User sees progress bar and task name visible over red background | VERIFIED | TaskRow.tsx lines 167-169: progressColor also uses expired color, TaskRow.tsx line 324-326: task.name rendered externally |
| 6 | Developer can toggle feature via highlightExpiredTasks prop on GanttChart | VERIFIED | GanttChart.tsx line 110: `highlightExpiredTasks?: boolean` prop defined, page.tsx line 755: prop passed with toggle state |

**Score:** 6/6 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | ----------- | ------ | ------- |
| `packages/gantt-lib/src/styles.css` | `--gantt-expired-color: #ef4444` CSS variable | VERIFIED | Line 48: `--gantt-expired-color: #ef4444;` exists in :root selector |
| `packages/gantt-lib/src/components/GanttChart/GanttChart.tsx` | `highlightExpiredTasks?: boolean` prop on interface | VERIFIED | Line 110: prop added to GanttChartProps interface, destructured at line 152 with default `false` |
| `packages/gantt-lib/src/components/TaskRow/TaskRow.tsx` | isExpired calculation and conditional red background | VERIFIED | Lines 107-145: complete isExpired useMemo with time-based logic, lines 154-156: conditional barColor |
| `packages/website/src/app/page.tsx` | Demo with expired and non-expired tasks | VERIFIED | Lines 491-571: createExpiredTasks() with 8 sample tasks (4 expired, 4 not expired), lines 859-885: demo section |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | --- | --- | ------ | ------- |
| GanttChart.tsx | TaskRow.tsx | highlightExpiredTasks prop propagation | VERIFIED | GanttChart.tsx line 538: `highlightExpiredTasks={highlightExpiredTasks}` passed to TaskRow |
| TaskRow.tsx | styles.css | CSS variable reference for expired color | VERIFIED | TaskRow.tsx lines 155, 168: `var(--gantt-expired-color)` used for both barColor and progressColor |
| TaskRow.tsx | task.endDate, task.progress, task.accepted | expiration calculation in useMemo | VERIFIED | Lines 107-145: complete time-based expiration calculation using endDate, progress, accepted |

### Requirements Coverage

No requirement IDs specified in PLAN frontmatter (empty array). Phase objective fulfilled through must_haves verification.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| None | — | No anti-patterns detected | — | Clean implementation |

### Human Verification Required

### 1. Visual Red Background on Expired Tasks

**Test:** Run `cd packages/website && npm run dev`, navigate to the "Подсветка просроченных задач (Phase 15)" section
**Expected:**
- Tasks with red background (#ef4444): expired-1, expired-2, expired-3
- Tasks with normal colors: not-expired-time-1, not-expired-time-2, not-expired-1, not-expired-2, not-expired-3
- Progress bar should also be red when expired
- Task name and duration text should remain visible over red background
**Why human:** Visual appearance (color rendering, text readability) requires visual confirmation

### 2. Toggle Switch Functionality

**Test:** Click "Disable Expired Highlight" button in the main demo
**Expected:** All tasks should return to normal colors (blue, green, etc.) regardless of expiration status
**Why human:** Interactive UI behavior requires runtime testing

### 3. Time-Based Expiration Logic

**Test:** Verify the following scenarios in the expired tasks demo:
- 10-day task with 5 days elapsed, 30% progress → RED (expected 50%)
- 10-day task with 5 days elapsed, 60% progress → NORMAL (ahead of schedule)
- 5-day task with 3 days elapsed, 20% progress → RED (expected 60%)
- Task with 100% progress but not accepted → RED
- Task with 100% progress and accepted → NORMAL
**Why human:** Complex time-based calculation behavior requires verification

### Gaps Summary

No gaps found. All must-haves verified successfully.

---

**Implementation Notes:**

The implementation includes enhancements beyond the original plan based on user feedback (documented in SUMMARY.md):

1. **Time-based expiration calculation:** The logic uses `expectedProgress = (daysElapsed / durationInDays) × 100` to determine if a task is behind schedule, rather than just checking if end date passed.

2. **Red progress bar:** Both the task background AND progress bar use the expired red color (lines 167-169 in TaskRow.tsx), per user request.

3. **Edge case handling:** The implementation properly handles:
   - Tasks that haven't started yet (daysElapsed = 0)
   - Single-day tasks (durationInDays = 1)
   - Tasks ahead of schedule (progress > expected)
   - Completed but not accepted tasks (still red if end date passed)

4. **React.memo optimization:** The `highlightExpiredTasks` prop is included in the React.memo comparison function (line 86 in TaskRow.tsx) to prevent unnecessary re-renders.

5. **Backward compatibility:** Default value is `false` (line 152 in GanttChart.tsx), ensuring existing implementations aren't affected.

6. **CSS variable customization:** Users can override `--gantt-expired-color` in their own CSS to customize the expired task color.

---

_Verified: 2026-03-04T02:30:00Z_
_Verifier: Claude (gsd-verifier)_
