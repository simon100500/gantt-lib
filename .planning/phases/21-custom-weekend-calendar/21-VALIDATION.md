---
phase: 21
slug: custom-weekend-calendar
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 21 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | packages/gantt-lib/vitest.config.ts |
| **Quick run command** | `npm test -- --run` |
| **Full suite command** | `npm test -- --run --coverage` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run`
- **After every plan wave:** Run `npm test -- --run --coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 21-01-01 | 01 | 0 | CAL-01 | unit | `npm test -- createIsWeekendPredicate.test.ts` | ❌ W0 | ⬜ pending |
| 21-01-02 | 01 | 1 | CAL-01 | unit | `npm test -- createIsWeekendPredicate.test.ts` | ✅ | ⬜ pending |
| 21-02-01 | 02 | 1 | CAL-02 | unit | `npm test -- geometry.test.ts` | ✅ | ⬜ pending |
| 21-03-01 | 03 | 1 | CAL-03 | unit | `npm test -- GanttChart.test.tsx` | ✅ | ⬜ pending |
| 21-04-01 | 04 | 1 | CAL-04 | visual | `npm test -- GridBackground.test.tsx` | ✅ | ⬜ pending |
| 21-05-01 | 05 | 1 | CAL-05 | integration | `npm test -- multiMonthView.test.tsx` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/gantt-lib/src/utils/__tests__/createIsWeekendPredicate.test.ts` — stubs for CAL-01, CAL-02, CAL-03
- [ ] `packages/gantt-lib/src/utils/__tests__/createDateKey.test.ts` — stub for date key utility
- [ ] Existing infrastructure covers other requirements (GridBackground, TimeScaleHeader, Calendar tests already exist)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual weekend highlighting in multi-month view | CAL-05 | Requires visual verification across month boundaries | Open demo app, set multi-month range spanning 2+ months, verify custom weekends highlighted correctly |
| Color scheme consistency | CAL-04 | Visual comparison with default weekends | Compare default weekend color with custom weekend color in same grid |

*If none: "All phase behaviors have automated verification."*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
