# Dependencies

## TaskDependency Interface

```typescript
interface TaskDependency {
  taskId: string;
  type: 'FS' | 'SS' | 'FF' | 'SF';
  lag?: number;
}
```

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `taskId` | `string` | yes | — | ID of the **predecessor** task. Must match an `id` in the tasks array. A missing `taskId` reference is reported as a `'missing-task'` validation error. |
| `type` | `'FS' \| 'SS' \| 'FF' \| 'SF'` | yes | — | Dependency link type. Determines which edges are constrained and how lag is calculated. See Section 6 for full semantics. |
| `lag` | `number` | no | `0` | Days of offset. Positive = delay (gap between tasks). Negative = overlap (tasks overlap by that many days). **Do not set lag manually** after initial construction — the library recalculates lag automatically on every drag completion. |

---

## Dependency Types — Semantics

Dependencies use standard project management link type semantics. All link types are relative to the predecessor task (A) and successor task (B).

### FS — Finish-to-Start

| Property | Value |
|---|---|
| Full name | Finish-to-Start |
| Rule | `B.startDate >= A.endDate + lag` |
| Lag formula | `lag = startB - endA` (can be negative, meaning B starts before A ends) |
| Constrained edge | Left edge (`startDate`) of successor B |
| Example | `{ taskId: 'A', type: 'FS', lag: 0 }` — B starts on or after A ends |

The most common link type. B cannot begin until A finishes. Negative lag creates deliberate overlap.

---

### SS — Start-to-Start

| Property | Value |
|---|---|
| Full name | Start-to-Start |
| Rule | `B.startDate >= A.startDate + lag` |
| Lag formula | `lag = startB - startA` (floored at 0; SS lag is never negative) |
| Constrained edge | Left edge (`startDate`) of successor B |
| Example | `{ taskId: 'A', type: 'SS', lag: 2 }` — B starts at least 2 days after A starts |

B cannot start until A has started. Lag is always >= 0 — if B is dragged to start before A, the library clamps the lag to 0 (B starts simultaneously with A at minimum).

---

### FF — Finish-to-Finish

| Property | Value |
|---|---|
| Full name | Finish-to-Finish |
| Rule | `B.endDate >= A.endDate + lag` (lag can be negative) |
| Lag formula | `lag = endB - endA` (can be negative) |
| Constrained edge | Right edge (`endDate`) of successor B |
| Example | `{ taskId: 'A', type: 'FF', lag: -1 }` — B ends 1 day before A ends |

B cannot finish until A has finished. Negative lag is valid and means B finishes before A ends.

---

### SF — Start-to-Finish

| Property | Value |
|---|---|
| Full name | Start-to-Finish |
| Rule | `B.endDate <= A.startDate + lag` (lag always <= 0) |
| Lag formula | `lag = endB - startA + 1 day` (ceiling at 0; SF lag is never positive) |
| Constrained edge | Right edge (`endDate`) of successor B — B must finish before A starts |
| Example | `{ taskId: 'A', type: 'SF', lag: 0 }` — B ends adjacent to or before A starts |

Rare link type. B must be complete by the time A begins. Lag ceiling at 0 prevents B from ending after A starts.

---

## Cascade Behavior

When `enableAutoSchedule={true}` and a predecessor is dragged:
- All successor tasks shift automatically to maintain their link constraints
- Dependency lines redraw in real-time during drag (not just on mouseup)
- When cascade occurs, `onCascade` fires instead of `onTasksChange` — they are mutually exclusive per drag event

---

[← Back to API Reference](./INDEX.md)
