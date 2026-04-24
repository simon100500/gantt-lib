---
phase: 30
slug: resource-mode
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-24
---

# Phase 30 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest `3.2.4` with jsdom |
| **Config file** | `packages/gantt-lib/vitest.config.ts` |
| **Quick run command** | `cd packages/gantt-lib && npm test -- src/__tests__/resourceTimelineLayout.test.ts src/__tests__/resourceTimelineChart.test.tsx src/__tests__/resourceTimelineDrag.test.tsx src/__tests__/resourceModeRegression.test.tsx` |
| **Full suite command** | `cd packages/gantt-lib && npm test` |
| **Estimated runtime** | ~60 seconds targeted, ~180 seconds full suite |

---

## Sampling Rate

- **After every task commit:** Run the targeted test command for files touched by that task.
- **After every plan wave:** Run `cd packages/gantt-lib && npm test`.
- **Before `$gsd-verify-work`:** Full suite must be green.
- **Max feedback latency:** 180 seconds.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 30-01-01 | 01 | 1 | RP-03/RP-04/RP-05 | T-30-01 | Invalid resource dates do not crash layout | unit | `cd packages/gantt-lib && npm test -- src/__tests__/resourceTimelineLayout.test.ts` | ❌ W0 | ⬜ pending |
| 30-01-02 | 01 | 1 | RP-01/RP-02/RP-11 | — | Resource mode branches before task-only dependency/hierarchy code | component/regression | `cd packages/gantt-lib && npm test -- src/__tests__/resourceModeRegression.test.tsx src/__tests__/export-contract.test.ts` | ❌ W0 partial | ⬜ pending |
| 30-02-01 | 02 | 2 | RP-02/RP-05/RP-10 | T-30-02 | Custom item content cannot resize the row geometry contract | component | `cd packages/gantt-lib && npm test -- src/__tests__/resourceTimelineChart.test.tsx` | ❌ W0 | ⬜ pending |
| 30-03-01 | 03 | 3 | RP-06/RP-07/RP-08/RP-09 | T-30-03 | Drag callbacks only fire for valid, unlocked resource moves | interaction | `cd packages/gantt-lib && npm test -- src/__tests__/resourceTimelineDrag.test.tsx` | ❌ W0 | ⬜ pending |
| 30-04-01 | 04 | 4 | RP-01/RP-10/RP-11 | — | Public exports and docs match runtime behavior | regression/docs | `cd packages/gantt-lib && npm test -- src/__tests__/export-contract.test.ts src/__tests__/resourceModeRegression.test.tsx` | ❌ W0 partial | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/gantt-lib/src/__tests__/resourceTimelineLayout.test.ts` — covers lane assignment, inclusive overlap, row height, and invalid-date diagnostics.
- [ ] `packages/gantt-lib/src/__tests__/resourceTimelineChart.test.tsx` — covers resource headers, item bars, empty rows, `renderItem`, and `getItemClassName`.
- [ ] `packages/gantt-lib/src/__tests__/resourceTimelineDrag.test.tsx` — covers horizontal drag, vertical move, drop outside rows, `readonly`, and `locked`.
- [ ] `packages/gantt-lib/src/__tests__/resourceModeRegression.test.tsx` — covers omitted mode compatibility and resource-mode exclusion of task list/dependency behavior.
- [ ] Extend `packages/gantt-lib/src/__tests__/export-contract.test.ts` — covers `ResourceTimelineChart` and resource public types.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Documentation example readability | RP-01/RP-02/RP-10 | Markdown examples are not executed by current test suite | Read `packages/gantt-lib/README.md` and `docs/reference/04-props.md`; confirm examples show omitted `mode` task mode and `mode="resource-planner"` resource mode |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 180s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-04-24
