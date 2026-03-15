---
phase: 20
slug: month-view
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-16
---

# Phase 20 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (via `@vitejs/plugin-react`) |
| **Config file** | `packages/gantt-lib/vitest.config.ts` |
| **Quick run command** | `cd packages/gantt-lib && npx vitest run src/__tests__/dateUtils.test.ts` |
| **Full suite command** | `cd packages/gantt-lib && npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd packages/gantt-lib && npx vitest run src/__tests__/dateUtils.test.ts`
- **After every plan wave:** Run `cd packages/gantt-lib && npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 20-01-01 | 01 | 0 | date utils | unit | `cd packages/gantt-lib && npx vitest run src/__tests__/dateUtils.test.ts` | ❌ W0 | ⬜ pending |
| 20-01-02 | 01 | 0 | date utils | unit | `cd packages/gantt-lib && npx vitest run src/__tests__/dateUtils.test.ts` | ❌ W0 | ⬜ pending |
| 20-02-01 | 02 | 1 | GanttChart viewMode prop | manual | n/a | manual-only | ⬜ pending |
| 20-02-02 | 02 | 1 | TimeScaleHeader week-view | manual | n/a | manual-only | ⬜ pending |
| 20-02-03 | 02 | 1 | GridBackground week-view | manual | n/a | manual-only | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/gantt-lib/src/__tests__/dateUtils.test.ts` — add `getWeekSpans` test suite
- [ ] `packages/gantt-lib/src/__tests__/dateUtils.test.ts` — add `getWeekStartDays` test suite

*(All tests go in the existing file — no new test files needed)*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `viewMode='day'` default renders identically to before | backward compat | visual rendering, no unit test | Switch to `viewMode='day'` (or omit prop) — chart looks identical to current |
| Week-view header row 2 shows correct start-of-week day numbers | header spec | visual rendering | Switch to `viewMode='week'` — row 2 shows 01, 08, 15, 22, 29 etc. |
| Drag in week-view preserves exact day precision | drag behavior | user interaction | Drag a task in week-view — dates are exact (not rounded to week start) |
| TodayIndicator positions correctly in week-view | grid alignment | visual rendering | Today line falls at correct intra-week pixel position |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
