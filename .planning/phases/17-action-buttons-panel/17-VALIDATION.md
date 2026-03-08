---
phase: 17
slug: action-buttons-panel
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-08
---

# Phase 17 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.0.0 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npm test -- src/__tests__/addDeleteTask.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- src/__tests__/addDeleteTask.test.ts`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 17-01-01 | 01 | 1 | UI-REF-03 | integration | `npm test -- src/__tests__/addDeleteTask.test.ts` | ✅ Phase 16 | ⬜ pending |
| 17-01-02 | 01 | 1 | UI-REF-04 | integration | `npm test -- src/__tests__/addDeleteTask.test.ts` | ✅ Phase 16 | ⬜ pending |
| 17-02-01 | 02 | 1 | UI-REF-01 | manual | Visual inspection in demo page | ❌ Manual | ⬜ pending |
| 17-02-02 | 02 | 1 | UI-REF-02 | manual | CSS hover state verification | ❌ Manual | ⬜ pending |
| 17-03-01 | 03 | 1 | UI-REF-05 | manual | Code inspection + visual test | ❌ Manual | ⬜ pending |
| 17-03-02 | 03 | 1 | UI-REF-06 | manual | Vertical scroll test in browser | ❌ Manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Manual test plan document — lists visual checks (hover states, button placement, scroll sync)
- [ ] Screenshot baseline — captures current TaskList appearance before changes
- [ ] Demo page test scenarios — verify insert/delete operations through new panel

**Reason for limited automation:** This phase is pure UI refactoring without logic changes. Existing callback tests (Phase 16) cover the functional behavior. New testing is visual (hover states, layout, positioning) which is better suited to manual browser verification than automated DOM tests.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Action panel column renders in TaskList | UI-REF-01 | Visual layout requires human judgment | 1. Open demo page 2. Verify narrow panel column appears on right side of TaskList 3. Verify column width is ~48px 4. Verify buttons are centered vertically |
| Buttons appear on row hover | UI-REF-02 | CSS hover state visual feedback | 1. Open demo page 2. Hover over any task row 3. Verify + (insert) and ✕ (delete) buttons appear smoothly 4. Verify buttons disappear when mouse leaves row |
| Old buttons removed from TaskListRow | UI-REF-05 | Code inspection + visual confirmation | 1. Inspect TaskListRow.tsx — no inline trash button 2. Inspect deps cell — no inline insert button 3. Verify no ghost buttons appear on hover |
| Panel scrolls synchronized with TaskList | UI-REF-06 | Scroll synchronization requires visual verification | 1. Open demo page with 20+ tasks 2. Scroll TaskList vertically 3. Verify action panel buttons stay aligned with their rows 4. Verify no misalignment during scroll |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
