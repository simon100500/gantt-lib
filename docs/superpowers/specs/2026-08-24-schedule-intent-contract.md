# Schedule Intent Contract: `gantt-lib` → project command adapter

**Status:** Implemented public integration contract in `gantt-lib` 0.128.2
**Audience:** `gantt-lib` maintainers, host applications, `gantt-lib-mcp` adapter, pi-agent implementers
**Purpose:** Preserve the distinction between the user's scheduling operation and the materialized cascade produced by the scheduler. The MCP adapter remains a follow-up integration and is not part of this library change.

## 1. Decision

`gantt-lib` must expose the semantic scheduling operation that the user completed.
The host application must persist that operation, not infer it from `changedTasks`.

The existing project command set remains unchanged:

| User operation | Existing persisted command |
|---|---|
| Move a leaf or parent | `move_task` |
| Resize a leaf edge | `resize_task` |
| Change a leaf duration | `change_duration` |
| Scale a parent subtree | `change_duration` |
| Edit non-scheduling fields | `update_task_fields` |

No date-batch command is introduced.

## 2. Terms and ownership

### Intent

An intent is the single user operation that must be persisted. It identifies the
initiating task and the operation semantics. It is not a snapshot and does not
contain the cascade result.

### Preview

The library may calculate `universalCascade` or
`scaleTaskSubtreeDuration` while rendering drag feedback and after drop. Preview
data is provisional. It is never a persistence request.

### Authoritative result

The server executes one project command against its current snapshot and returns
the sparse authoritative result (`changedTasks`, `changedTaskIds`, and the
resulting snapshot/receipt according to the host command API). The host merges
that result into UI state. The host must not submit the returned dates as a new
operation.

Ownership is therefore:

```text
gantt-lib UI adapter  → detects operation and renders preview
host adapter          → maps intent to an existing project command
server                → performs the authoritative scheduling calculation
host UI state          → merges the authoritative result
```

## 3. Public callback

`GanttChart` adds an additive callback:

```ts
export type GanttScheduleIntent =
  | {
      type: 'move_task';
      taskId: string;
      startDate: string;
    }
  | {
      type: 'resize_task';
      taskId: string;
      anchor: 'start' | 'end';
      date: string;
    }
  | {
      type: 'change_duration';
      taskId: string;
      duration: number;
      anchor: 'start' | 'end';
      taskType?: 'task' | 'milestone';
    };

export interface GanttChartProps {
  onScheduleIntent?: (intent: GanttScheduleIntent) => void;
}
```

Dates in this callback are UI interaction data for the host adapter. They are
not model-facing LLM fields and must not be copied into the agent tool catalog.
`duration` is an integer number of project days. `taskType` is explicit metadata
for a milestone/task transition emitted by the duration editor. The `anchor` is the fixed
boundary:

- `anchor: 'start'` keeps the start boundary fixed and derives the end;
- `anchor: 'end'` keeps the end boundary fixed and derives the start.

The callback is emitted once after a completed scheduling interaction. It is
not emitted during pointer-move preview frames.

## 4. Operation semantics

### 4.1 Leaf move

The initiating task is a leaf and the user moves its whole bar.

```ts
{ type: 'move_task', taskId, startDate }
```

The server preserves the leaf duration, recalculates incoming lag when required,
cascades eligible successors, and re-rolls computed parent ranges.

### 4.2 Leaf resize

The initiating task is a leaf and the user moves one edge of its bar.

```ts
{ type: 'resize_task', taskId, anchor, date }
```

The server changes only the requested boundary, preserves the opposite boundary,
then applies dependency cascade and parent rollup.

### 4.3 Leaf duration edit

The task-list duration editor changes a leaf's intrinsic duration.

```ts
{ type: 'change_duration', taskId, duration, anchor }
```

The server changes that leaf. A computed parent appearing in the authoritative
result is a derived rollup, never a second parent intent.

### 4.4 Parent move

The initiating task is a parent and the user moves its whole bar or changes its
position while preserving duration.

```ts
{ type: 'move_task', taskId: parentId, startDate }
```

The server shifts the subtree as one move operation, preserves leaf durations,
applies dependency rules, and recomputes all affected parent ranges.

### 4.5 Parent resize / subtree scaling

The initiating task is a parent and the user changes one edge or edits its
duration.

```ts
{ type: 'change_duration', taskId: parentId, duration, anchor }
```

The server calls the subtree scaling solver once. The operation may change leaf
durations, internal scheduling gaps/lags allowed by the solver, computed parent
ranges, and external successors according to the configured policy.

The parent itself remains a computed wrapper. The host must never issue a second
command because a child and one or more computed parents are present in the
solver result.

## 5. Callback exclusivity and legacy callbacks

When `onScheduleIntent` is supplied, it is the scheduling persistence boundary.
For the same completed scheduling interaction:

1. `onScheduleIntent` is called exactly once;
2. `onTasksChange` is not called with the materialized scheduling cascade;
3. `onCascade` is not used as a persistence event;
4. `onSubtreeScaleResult` may still be called for localized warnings and
   diagnostics, but it does not replace `onScheduleIntent`;
5. `onTasksChange` remains available for non-scheduling edits and legacy
   consumers that do not provide `onScheduleIntent`.

The library may continue to calculate and render its internal cascade preview.
The preview must not cause a second callback when the controlled `tasks` prop is
updated with the server result.

## 6. Host adapter contract

The host maps intents to the existing project command union without inspecting
the cascade result:

```ts
function toProjectCommand(intent: GanttScheduleIntent): FrontendProjectCommand {
  switch (intent.type) {
    case 'move_task':
      return { type: 'move_task', taskId: intent.taskId, startDate: intent.startDate };
    case 'resize_task':
      return {
        type: 'resize_task',
        taskId: intent.taskId,
        anchor: intent.anchor,
        date: intent.date,
      };
    case 'change_duration':
      return {
        type: 'change_duration',
        taskId: intent.taskId,
        duration: intent.duration,
        anchor: intent.anchor,
      };
  }
}
```

The adapter must:

- commit one command per completed scheduling interaction;
- use the same command semantics for authenticated and local/guest preview
  paths;
- apply the server's sparse result by task ID;
- treat server rejection as a failed operation and restore the last confirmed
  snapshot;
- keep model-facing tools date-free where the operation can be expressed as
  duration, anchor, dependency, or relative structure.

The adapter must not:

- search `changedTasks` for a parent and reinterpret it as user intent;
- generate a parent `change_duration` command after a leaf command;
- send every materialized child date as separate commands;
- persist both the intent and the library's preview result;
- use localized warning text to decide whether a command succeeded.

## 7. Required solver consistency

The local command replay used for optimistic state must implement the same
semantics as the server command executor.

In particular, replaying `change_duration` for a parent must call
`scaleTaskSubtreeDuration` with the same anchor, business-day options, and
external successor policy as the server. A local ordinary resize is not an
equivalent preview for parent scaling.

The authoritative server remains the final owner when local preview and server
constraints differ.

## 8. Worked regression scenario

Given:

```text
Parent: 01–10
Child A: 01–10
Child B: 01–08
```

The user changes Child A from 10 to 5 project days.

Expected interaction:

```text
intent: change_duration(Child A, 5, anchor=start)
```

Expected server result:

```text
Child A: 01–05
Child B: 01–08
Parent:  01–08  // derived rollup only
```

The following is forbidden:

```text
materialized parent range 01–08
→ change_duration(Parent, 8)
```

Additional required scenarios:

1. Move a child: only one child intent is emitted; parent range is derived.
2. Move a parent: one `move_task(parent, ...)` intent is emitted.
3. Resize a parent: one `change_duration(parent, ...)` intent is emitted.
4. Resize a child that is not a parent-range boundary: the parent is not
   interpreted as an operation target.
5. Parent scaling with an external successor: the successor is changed once by
   the authoritative server cascade.
6. Rejected or clamped parent scaling: the host consumes the structured result
   and does not retry from `changedTasks`.

## 9. Migration order

1. Add `GanttScheduleIntent` and `onScheduleIntent` to `gantt-lib`.
2. Route task-list edits and chart drag completion to the callback while keeping
   local preview calculation internal.
3. In the MCP adapter, handle intents and stop using `buildParentDurationCommand`.
4. Make local `change_duration` replay use subtree scaling for parents.
5. Add the regression tests from section 8.
6. Keep the existing `onTasksChange` behavior for consumers that do not opt into
   the new callback.

## 10. Compatibility and versioning

This is an additive `gantt-lib` API change. Existing consumers may continue to
use `onTasksChange`, but they do not receive the stronger intent guarantee until
they opt into `onScheduleIntent`.

The persisted project command contract is unchanged. The LLM/MCP tool catalog is
unchanged except for clarifying that parent duration changes are semantic
`change_duration` operations and that absolute date batches are not supported.

This document is the integration authority for the new callback. The older
`onTasksChange`-based subtree persistence recipe in the subtree-scaling handoff
is legacy guidance and must not be used for this adapter.
