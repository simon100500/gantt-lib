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
