# Phase 8: SS dependency - Context

**Gathered:** 2026-02-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement SS (Start-to-Start) dependency constraint enforcement. When tasks are linked via SS, the successor's start date is constrained relative to the predecessor's start date: `startB = startA + lag`, where `lag ≥ 0`. Covers all drag and resize interactions for both predecessor (A) and successor (B).

Does NOT include: FF, SF constraint enforcement (separate phases), cascade chains through mixed-type links (deferred).

</domain>

<decisions>
## Implementation Decisions

### Formula and constraint

- `startB = startA + lag`
- `lag ∈ [0, +∞)` — lag is never negative
- Only lower bound: `startB` cannot go left of `startA`

### Moving the predecessor (A)

- **A moves right:** `startB += delta`, lag constant — B follows
- **A moves left:** `startB -= delta`, lag constant — B follows
- When A moves left far enough that `lag → 0`: they reach `startB = startA` and continue moving together as a unit, lag stays 0

### Moving the successor (B)

- **B moves right:** lag increases freely, no upper bound
- **B moves left:** constrained at `lag = 0`. `startB = max(startA, startB - delta)`. B cannot go left of A's start.

### Resizing the predecessor (A)

- **Right edge of A moves right or left:** `startA` unchanged → lag unchanged → B does not move
- **Left edge of A moves left (expand):** `startA -= delta`, `startB -= delta` — B moves with A to preserve lag. Lag stays constant.
- **Left edge of A moves right (shrink):** `startA += delta`, `startB += delta` — B moves with A to preserve lag. Lag stays constant.

Note: lag can exceed `durA` — this is a valid state (B starts after A ends in the SS sense, which is allowed).

### Resizing the successor (B)

- **Right edge of B:** `startB` unchanged → lag unchanged → no SS effect
- **Left edge of B moves left (expand):** lag decreases. Constrained at `lag = 0`: `startB = max(startA, startB - delta)`
- **Left edge of B moves right (shrink):** lag increases freely, no upper bound

### Hard mode / soft mode

- SS constraints use the same hard/soft mode architecture as FS (Phase 7)
- Hard mode: cascade chain moves as monolith (B is dragged with A)
- Soft mode: free movement with lag recalculation (B stays, lag updates)

### Cascade chain extension

- Extend the existing `getSuccessorChain` BFS engine to follow SS links in addition to FS links
- SS delta computation: `delta_B = delta_A` (same shift, lag preserved)

</decisions>

<specifics>
## Specific Ideas

Full behavior matrix from spec:

| Action | What changes | B behavior | Stop/boundary |
|--------|-------------|------------|---------------|
| A right | startA +delta | startB +delta, lag const | — |
| A left | startA −delta | startB −delta, lag const | lag=0: move together |
| B right | startB +delta | lag grows | — |
| B left | startB −delta | lag shrinks | lag=0, startB=startA |
| A right-edge expand | durA grows | B doesn't move | — |
| A right-edge shrink | durA shrinks | B doesn't move, lag can exceed durA | — |
| A left-edge expand | startA −delta | startB −delta, lag const | — |
| A left-edge shrink | startA +delta | startB +delta, lag const | — |
| B left-edge expand | startB −delta | lag shrinks | lag=0, startB=startA |
| B left-edge shrink | startB +delta | lag grows | — |
| B right-edge expand | endB +delta | lag const | — |
| B right-edge shrink | endB −delta | lag const | — |

</specifics>

<deferred>
## Deferred Ideas

- FF (Finish-to-Finish) constraint enforcement — separate phase
- SF (Start-to-Finish) constraint enforcement — separate phase
- Mixed FS+SS cascade chains (A→(FS)→B→(SS)→C) — deferred until all constraint types implemented

</deferred>

---

*Phase: 08-ss-dependency*
*Context gathered: 2026-02-22*
