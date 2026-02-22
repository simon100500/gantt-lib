# Phase 10: SF dependency - Context

**Gathered:** 2026-02-22
**Status:** Ready for planning

<domain>
## Phase Boundary

SF (Start-to-Finish) dependency constraint enforcement — successor B's finish date is constrained relative to predecessor A's start date. This is the fourth and final link type, completing FS/SS/FF/SF coverage.

**Formula:** `endB = startA + lag`, where `lag ≤ 0`

**Use case:** Supply chain and preparation tasks — "preparatory work must be ready by the time main work starts". Example: Equipment delivery (B) must be complete before installation (A) begins.

</domain>

<decisions>
## Implementation Decisions

### SF lag semantics
- **Formula:** `endB = startA + lag` where `lag ≤ 0`
- **Lag ceiling:** lag clamped at 0 — user cannot drag B past startA (endB cannot exceed startA)
- **Negative lag:** Allowed and expected — "deliver early" means lag becomes more negative
- **When violated:** System forces lag = 0 (endB = startA)

### Cascade behavior

**Moving predecessor A (main work):**
- Move mode (any direction): B moves synchronously, lag preserved
- Resize-left (startA changes): B moves synchronously, lag preserved
- Resize-right (endA changes): B stationary — startA unchanged

**Moving successor B (preparation work):**
- Move-left: Free movement, lag becomes more negative
- Move-right: Blocked at startA (lag = 0 is ceiling)
- Resize-right (endB changes): Constrained by startA — cannot push past startA
- Resize-left (startB changes): Free movement — only affects startB, endB stays bound to startA

**Duration change (durB increase):**
- **KEY BEHAVIOR:** endB stays bound to startA — task B grows LEFT
- startB = endB - durB (calculated backward)
- This shows "order must be placed earlier" when logistics take longer

### Mode filtering (cascade chain composition)
- Move mode: Include SF in activeChain (startA shift affects B)
- Resize-left (A): Include SF (startA shift affects B)
- Resize-right (A): Exclude SF (startA unchanged)
- Resize-right (B): Include SF with constraint (endB blocked by startA)
- Resize-left (B): Exclude SF (endB unaffected)

### Connection rendering
- Quick-17 already handles SF line rendering (startA → endB)
- Skip separate verification — assume correct, fix if issues found during demo

### Demo scenario
- **Example:** Elevator installation (A) + Elevator equipment delivery (B)
- **Duration:** B = 45 days (logistics time)
- **Showcase:** When A shifts left, B "pulls in" — shows order must be placed earlier
- **Constraint:** When B moves right, stops at startA (lag = 0 ceiling)

### Claude's Discretion
- Exact implementation of recalculateIncomingLags SF case (follow FF/SS pattern)
- Whether to add DEBUG logging for SF constraints (probably useful for demo verification)
- Exact visual feedback during drag (follow FF/SS preview pattern)

</decisions>

<specifics>
## Specific Ideas

**From user's detailed ТЗ:**

> "SF — это связь-предохранитель для снабжения. Дата окончания подготовки жёстко привязана к дате начала основных работ."

**Key behaviors to demonstrate:**
1. When A (installation) shifts left → B (delivery) pulls in — shows logistics must start earlier
2. When durB increases → B grows LEFT, endB stays pinned to startA
3. When B tries to move right → stops at startA (lag = 0 ceiling)

**UI Note from user:**
> "В Ганте стрелку для SF лучше рисовать от начала задачи A к концу задачи B. Она будет идти 'назад', что визуально подчёркивает: B готовит почву для A."

(Quick-17 should already handle this — verify during demo)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 10-sf-dependency*
*Context gathered: 2026-02-22*
