# Phase 9: FF-dependency - Context

**Gathered:** 2026-02-22
**Status:** Ready for planning

## Phase Boundary

FF (Finish-to-Finish) dependency constraint enforcement — successor B's finish date is constrained relative to predecessor A's finish date.

**Formula:** `endB = endA + lag` (lag can be positive, negative, or zero — no clamping)

**Derived:** `startB = endA + lag - durB`

Unlike SS (lag >= 0), FF allows unrestricted lag values in both directions.

## Implementation Decisions

### Lag behavior
- No lag clamping — lag can be positive, negative, or zero
- `lag = endB - endA` — freely recalcualted when user moves B
- Unlike SS (lag >= 0 floor), FF has no constraints

### Cascade modes
- Use existing hard/soft cascade infrastructure from Phase 7/8
- Hard mode: B moves as monolith with A when endA changes
- Soft mode: B moves freely, lag recalculated on completion

### Interaction behavior matrix

| Action | B behavior | Lag |
|--------|------------|-----|
| **Move A** (left/right) | B moves with A (same delta) | Preserved |
| **Move B** (left/right) | B moves freely | **Recalculated** |
| **Resize A** (right edge) | B moves with endA | Preserved |
| **Resize A** (left edge) | B stays put (endA unchanged) | Preserved |
| **Resize B** (right edge) | B changes duration | **Recalculated** |
| **Resize B** (left edge) | B changes duration (endB unchanged) | Preserved |

### Drag mode implications
- **Move mode**: delta affects both startA and endA → B cascades in hard mode, lag recalculated in soft
- **Resize-right on A**: only endA changes → B cascades, lag preserved
- **Resize-left on A**: only startA changes → B not affected (endA unchanged)
- **Resize-right on B**: only endB changes → lag recalculated
- **Resize-left on B**: only startB changes → lag preserved (endB unchanged)

### Chain detection
- Extend `getSuccessorChain` with `linkTypes=['FF']` to find FF successors
- FF chains behave like FS chains (both propagate through end date changes)
- Mixed chains: caller specifies which link types to include

### Visual rendering
- FF dependency lines already render correctly from Phase 8 work (type-aware connection points)
- Right edge of predecessor → right edge of successor
- No new rendering work needed

### Claude's Discretion
- Exact implementation of `recalculateIncomingLags` FF case (formula is clear, code structure is flexible)
- Unit test coverage strategy (TDD approach from Phase 8)
- Demo task selection for verification

## Specific Ideas

- "Нет «стопоров» — любое движение родителя за правый край тянет за собой ребёнка"
- Formula-driven implementation: `lag = endB - endA` is the source of truth
- Follow SS pattern from Phase 8: extend utilities, wire constraints, add demo tasks, human-verify

## Deferred Ideas

None — specification is complete and focused on FF dependency only.

---

*Phase: 09-ff-dependency*
*Context gathered: 2026-02-22*
