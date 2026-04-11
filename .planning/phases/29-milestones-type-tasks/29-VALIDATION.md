---
phase: 29
slug: milestones-type-tasks
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-11
---

# Phase 29 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `packages/gantt-lib/vitest.config.ts` |
| **Quick run command** | `cd packages/gantt-lib && npm test -- src/__tests__/taskRowMilestone.test.tsx src/__tests__/taskListMilestone.test.tsx src/__tests__/dependencyLinesMilestone.test.tsx src/__tests__/useTaskDragMilestone.test.ts` |
| **Full suite command** | `cd packages/gantt-lib && npm test` |
| **Estimated runtime** | ~45 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd packages/gantt-lib && npm test -- src/__tests__/taskRowMilestone.test.tsx src/__tests__/taskListMilestone.test.tsx src/__tests__/dependencyLinesMilestone.test.tsx src/__tests__/useTaskDragMilestone.test.ts`
- **After every plan wave:** Run `cd packages/gantt-lib && npm test`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 45 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 29-01-01 | 01 | 1 | PH29-1 | unit | `cd packages/gantt-lib && npm test -- src/__tests__/taskRowMilestone.test.tsx` | ❌ W0 | ⬜ pending |
| 29-01-02 | 01 | 1 | PH29-1 | unit | `cd packages/gantt-lib && npm test -- src/__tests__/taskListMilestone.test.tsx` | ❌ W0 | ⬜ pending |
| 29-02-01 | 02 | 2 | PH29-2 | component | `cd packages/gantt-lib && npm test -- src/__tests__/taskRowMilestone.test.tsx src/__tests__/dependencyLinesMilestone.test.tsx` | ❌ W0 | ⬜ pending |
| 29-02-02 | 02 | 2 | PH29-3 | hook | `cd packages/gantt-lib && npm test -- src/__tests__/useTaskDragMilestone.test.ts` | ❌ W0 | ⬜ pending |
| 29-03-01 | 03 | 3 | PH29-4 | component | `cd packages/gantt-lib && npm test -- src/__tests__/taskListMilestone.test.tsx` | ❌ W0 | ⬜ pending |
| 29-03-02 | 03 | 3 | PH29-5 | component | `cd packages/gantt-lib && npm test -- src/__tests__/dependencyLinesMilestone.test.tsx` | ❌ W0 | ⬜ pending |
| 29-03-03 | 03 | 3 | PH29-6 | integration | `cd packages/gantt-lib && npm test -- src/__tests__/sampleMilestones.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/gantt-lib/src/__tests__/taskRowMilestone.test.tsx` — milestone diamond render and regular one-day task regression coverage
- [ ] `packages/gantt-lib/src/__tests__/taskListMilestone.test.tsx` — start/end normalization and duration editing restrictions
- [ ] `packages/gantt-lib/src/__tests__/dependencyLinesMilestone.test.tsx` — milestone dependency anchor geometry
- [ ] `packages/gantt-lib/src/__tests__/useTaskDragMilestone.test.ts` — move-only drag behavior for milestone tasks
- [ ] `packages/gantt-lib/src/__tests__/sampleMilestones.test.tsx` — sample/demo milestone behavior coverage

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Demo chart milestone visuals match intended diamond shape and label placement | PH29-2 | SVG/CSS visual quality is easier to confirm manually than by DOM assertions alone | Run website demo, open a sample with milestone tasks, verify diamond alignment, label overlap, and lock/progress presentation |
| Website sample proves milestone authoring ergonomics | PH29-6 | Demo usefulness is product-facing, not just code-facing | Open the website example containing milestone tasks and confirm move-only interaction plus task-list edit flow |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all missing references
- [ ] No watch-mode flags
- [ ] Feedback latency < 45s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
