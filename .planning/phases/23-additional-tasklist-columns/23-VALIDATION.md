---
phase: 23
slug: additional-tasklist-columns
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-27
---

# Phase 23 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest + @testing-library/react |
| **Config file** | `packages/gantt-lib/vitest.config.ts` |
| **Quick run command** | `npm run test -- --run src/__tests__/taskListColumns.test.tsx` |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test -- --run src/__tests__/taskListColumns.test.tsx`
- **After every plan wave:** Run `npm run test`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 23-01-01 | 01 | 1 | COL-01, COL-02, COL-03, COL-05, COL-06, COL-07, COL-08 | integration | `npm run test -- --run src/__tests__/taskListColumns.test.tsx` | ❌ W0 | ⬜ pending |
| 23-02-01 | 02 | 2 | COL-04 | integration | `npm run test -- --run src/__tests__/taskListColumns.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/gantt-lib/src/__tests__/taskListColumns.test.tsx` — cover ordering, width, renderers, editor activation, and base-column regressions for COL-01..COL-08

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
