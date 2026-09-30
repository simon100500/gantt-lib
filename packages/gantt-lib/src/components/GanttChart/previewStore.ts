export interface TaskPreviewPosition {
  left: number;
  width: number;
}

export interface TaskPreviewPositionStore {
  subscribeTask: (taskId: string, listener: () => void) => () => void;
  getTaskPosition: (taskId: string) => TaskPreviewPosition | undefined;
  setPositions: (positions: Map<string, TaskPreviewPosition>) => void;
  clear: () => void;
}

function positionsEqual(left: TaskPreviewPosition | undefined, right: TaskPreviewPosition | undefined): boolean {
  return left?.left === right?.left && left?.width === right?.width;
}

export function createTaskPreviewPositionStore(): TaskPreviewPositionStore {
  let positions = new Map<string, TaskPreviewPosition>();
  const listenersByTaskId = new Map<string, Set<() => void>>();

  function notify(taskIds: Set<string>) {
    for (const taskId of taskIds) {
      const listeners = listenersByTaskId.get(taskId);
      if (!listeners) continue;

      for (const listener of listeners) {
        listener();
      }
    }
  }

  return {
    subscribeTask(taskId, listener) {
      const listeners = listenersByTaskId.get(taskId) ?? new Set<() => void>();
      listeners.add(listener);
      listenersByTaskId.set(taskId, listeners);

      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          listenersByTaskId.delete(taskId);
        }
      };
    },

    getTaskPosition(taskId) {
      return positions.get(taskId);
    },

    setPositions(nextPositions) {
      const changedTaskIds = new Set<string>();
      const mergedPositions = new Map<string, TaskPreviewPosition>();

      for (const [taskId, nextPosition] of nextPositions) {
        const currentPosition = positions.get(taskId);
        if (positionsEqual(currentPosition, nextPosition)) {
          if (currentPosition) {
            mergedPositions.set(taskId, currentPosition);
          }
          continue;
        }

        changedTaskIds.add(taskId);
        mergedPositions.set(taskId, {
          left: nextPosition.left,
          width: nextPosition.width,
        });
      }

      for (const taskId of positions.keys()) {
        if (!nextPositions.has(taskId)) {
          changedTaskIds.add(taskId);
        }
      }

      if (changedTaskIds.size === 0) {
        return;
      }

      positions = mergedPositions;
      notify(changedTaskIds);
    },

    clear() {
      if (positions.size === 0) {
        return;
      }

      const changedTaskIds = new Set(positions.keys());
      positions = new Map();
      notify(changedTaskIds);
    },
  };
}

/** Live day-shifts of chained row activities during a conveyor drag: taskId → activityId → dayDelta. */
export interface ActivityPreviewStore {
  subscribeTask: (taskId: string, listener: () => void) => () => void;
  getTaskOverrides: (taskId: string) => Map<string, number> | undefined;
  setOverrides: (overrides: Map<string, Map<string, number>>) => void;
  clear: () => void;
}

export function createActivityPreviewStore(): ActivityPreviewStore {
  let overridesByTask = new Map<string, Map<string, number>>();
  const listenersByTaskId = new Map<string, Set<() => void>>();

  function notify(taskIds: Set<string>) {
    for (const taskId of taskIds) {
      for (const listener of listenersByTaskId.get(taskId) ?? []) {
        listener();
      }
    }
  }

  return {
    subscribeTask(taskId, listener) {
      const listeners = listenersByTaskId.get(taskId) ?? new Set<() => void>();
      listeners.add(listener);
      listenersByTaskId.set(taskId, listeners);

      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          listenersByTaskId.delete(taskId);
        }
      };
    },

    getTaskOverrides(taskId) {
      return overridesByTask.get(taskId);
    },

    setOverrides(nextOverrides) {
      const changedTaskIds = new Set<string>(nextOverrides.keys());
      for (const taskId of overridesByTask.keys()) {
        changedTaskIds.add(taskId);
      }
      if ([...changedTaskIds].every(taskId => {
        const current = overridesByTask.get(taskId);
        const next = nextOverrides.get(taskId);
        if (!current || !next || current.size !== next.size) return false;
        return [...next].every(([activityId, delta]) => current.get(activityId) === delta);
      })) {
        return;
      }

      overridesByTask = new Map([...nextOverrides].map(([taskId, deltas]) => [taskId, new Map(deltas)]));
      notify(changedTaskIds);
    },

    clear() {
      if (overridesByTask.size === 0) {
        return;
      }

      const changedTaskIds = new Set(overridesByTask.keys());
      overridesByTask = new Map();
      notify(changedTaskIds);
    },
  };
}

/**
 * Works that currently stop the dragged work (its binding chain predecessors).
 * The dragged row publishes the blockers; every row renders the matching work
 * with a "blocked" affordance so the reason a bar refuses to move is visible.
 */
export interface ActivityBlockStore {
  subscribeTask: (taskId: string, listener: () => void) => () => void;
  /** Ids of works in the task that currently block the dragged work. */
  getTaskBlockers: (taskId: string) => Set<string> | undefined;
  setBlockers: (blockers: Map<string, Set<string>>) => void;
  clear: () => void;
}

export function createActivityBlockStore(): ActivityBlockStore {
  let blockersByTask = new Map<string, Set<string>>();
  const listenersByTaskId = new Map<string, Set<() => void>>();

  function notify(taskIds: Set<string>) {
    for (const taskId of taskIds) {
      for (const listener of listenersByTaskId.get(taskId) ?? []) {
        listener();
      }
    }
  }

  return {
    subscribeTask(taskId, listener) {
      const listeners = listenersByTaskId.get(taskId) ?? new Set<() => void>();
      listeners.add(listener);
      listenersByTaskId.set(taskId, listeners);

      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          listenersByTaskId.delete(taskId);
        }
      };
    },

    getTaskBlockers(taskId) {
      return blockersByTask.get(taskId);
    },

    setBlockers(nextBlockers) {
      const changedTaskIds = new Set<string>(nextBlockers.keys());
      for (const taskId of blockersByTask.keys()) {
        changedTaskIds.add(taskId);
      }
      if ([...changedTaskIds].every(taskId => {
        const current = blockersByTask.get(taskId);
        const next = nextBlockers.get(taskId);
        if (!current || !next || current.size !== next.size) return false;
        return [...next].every(activityId => current.has(activityId));
      })) {
        return;
      }

      blockersByTask = new Map([...nextBlockers].map(([taskId, ids]) => [taskId, new Set(ids)]));
      notify(changedTaskIds);
    },

    clear() {
      if (blockersByTask.size === 0) {
        return;
      }

      const changedTaskIds = new Set(blockersByTask.keys());
      blockersByTask = new Map();
      notify(changedTaskIds);
    },
  };
}

/**
 * Which row activity is being dragged right now — `taskId \0 activityId`.
 * Hover handlers read it synchronously so a drag in one row never lets another
 * row mount a competing tooltip. It deliberately has no subscription: nothing
 * needs to re-render when the owner changes, only the next hover is gated.
 */
export interface ActivityDragOwner {
  get: () => string | null;
  set: (ownerKey: string | null) => void;
}

export const activityOwnerKey = (taskId: string, activityId: string): string =>
  `${taskId}\u0000${activityId}`;

export function createActivityDragOwner(): ActivityDragOwner {
  let ownerKey: string | null = null;
  return {
    get: () => ownerKey,
    set: (nextOwnerKey) => {
      ownerKey = nextOwnerKey;
    },
  };
}
