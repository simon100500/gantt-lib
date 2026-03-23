# Validation

## ValidationResult Type

Used as the argument type for the `onValidateDependencies` callback.

```typescript
interface ValidationResult {
  isValid: boolean;
  errors: DependencyError[];
}

interface DependencyError {
  type: 'cycle' | 'constraint' | 'missing-task';
  taskId: string;
  message: string;
  relatedTaskIds?: string[];
}
```

| Field | Type | Notes |
|---|---|---|
| `isValid` | `boolean` | `false` if any errors exist. `true` only when `errors` is empty. |
| `errors` | `DependencyError[]` | Empty array when `isValid === true`. |
| `errors[n].type` | `'cycle' \| 'constraint' \| 'missing-task'` | `cycle` = circular dependency detected; `constraint` = date constraint violated; `missing-task` = `taskId` in dependency does not exist in the tasks array. |
| `errors[n].taskId` | `string` | ID of the task with the problem. |
| `errors[n].message` | `string` | Human-readable description of the error. |
| `errors[n].relatedTaskIds` | `string[]` | Optional. For `cycle` errors: the IDs forming the cycle path. |

Validation runs automatically on every tasks array change. You do not call it manually.

---

## Date Handling Rules

- **Use ISO strings.** Always pass dates as `'YYYY-MM-DD'` strings. `Date` objects from local environments can cause off-by-one errors due to timezone offsets.
- **All internal calculations are UTC.** The library uses `Date.UTC()` internally. A date string `'2026-02-01'` is treated as `2026-02-01T00:00:00Z`.
- **endDate is inclusive.** A task with `startDate: '2026-02-01'` and `endDate: '2026-02-01'` occupies exactly 1 day column. A task from Feb 1 to Feb 5 occupies 5 day columns.
- **After drag, dates in onTasksChange are ISO strings.** The callback always receives ISO UTC date strings regardless of the input format used when constructing tasks.
- **Lag values after drag are integers (days).** The library rounds lag to whole days.

---

## onTasksChange Pattern — Correct Usage

The `onTasksChange` prop receives an array of **only the changed tasks**. You must merge these into your state. Single task changes are delivered as a single-element array.

```tsx
// CORRECT: merge changed tasks into state
const handleTasksChange = useCallback((changedTasks: Task[]) => {
  setTasks(prev => {
    const changedMap = new Map(changedTasks.map(t => [t.id, t]));
    return prev.map(t => changedMap.get(t.id) ?? t);
  });
}, []);

<GanttChart tasks={tasks} onTasksChange={handleTasksChange} />
```

**What onTasksChange receives per operation:**

| Operation | Array Contents |
|-----------|----------------|
| Edit task name | `[task]` |
| Edit task progress | `[task]` or `[child, parent]` (if parent exists) |
| Drag/resize (no cascade) | `[task]` |
| Cascade | `[task1, task2, ...]` (chain + parent updates) |
| Reorder | full `reorderedTasks` array |
| Delete | tasks with cleaned dependencies |

**For REST API:**
```tsx
onTasksChange={(tasks) => {
  tasks.forEach(t => patch(`/api/tasks/${t.id}`, t))
}}
```

**For batch REST API:**
```tsx
onTasksChange={(tasks) => patch('/api/tasks', { tasks })}
```

---

## enableAutoSchedule vs onCascade

Three distinct operating modes depending on prop combinations:

| `enableAutoSchedule` | `onCascade` provided | Mode | Behavior |
|---|---|---|---|
| `false` (default) | any | **Soft / visual only** | Tasks move independently. Dependency lines are visual only — no constraints enforced on drag. `onTasksChange` fires on each drag. |
| `true` | no | **Soft cascade** | Predecessors drag successors. On drag end, updated tasks with recalculated lag values are returned via `onTasksChange`. |
| `true` | yes | **Hard cascade** | Predecessors drag successors with real-time preview. On drag end, `onCascade` fires with all shifted tasks. `onTasksChange` does NOT fire for cascaded drags. |

**State update rule for hard cascade:**
```tsx
// Update tasks from onCascade, not from onTasksChange, in hard mode
<GanttChart
  tasks={tasks}
  enableAutoSchedule={true}
  onTasksChange={handleTasksChange}  // fires for non-cascade drags (resize of leaf task, etc.)
  onCascade={(shifted) => {          // fires for cascade drags — takes precedence
    setTasks(prev => {
      const map = new Map(shifted.map(t => [t.id, t]));
      return prev.map(t => map.get(t.id) ?? t);
    });
  }}
/>
```

---

[← Back to API Reference](./INDEX.md)
