import type { Task } from '../components/GanttChart';

type TaskLike = { id: string; parentId?: string };

export type ReorderDropPlacement = 'before' | 'inside' | 'after' | 'end';

export interface ReorderDropTarget {
  index: number;
  placement: ReorderDropPlacement;
}

export interface VisibleReorderPosition {
  originOrderedIndex: number;
  insertIndex: number;
}

export interface VisibleReorderPlan extends VisibleReorderPosition {
  inferredParentId?: string;
}

/**
 * Get all descendant IDs of a task (recursively).
 * Used to identify the entire subtree that must move together when dragging a parent.
 */
function getDescendantIds(taskId: string, tasks: TaskLike[]): string[] {
  const descendants: string[] = [];
  const visited = new Set<string>();

  function collect(id: string) {
    if (visited.has(id)) return;
    visited.add(id);

    // Find all direct children of this task
    for (const task of tasks) {
      if ((task as any).parentId === id && !visited.has(task.id)) {
        descendants.push(task.id);
        collect(task.id);
      }
    }
  }

  collect(taskId);
  return descendants;
}

function isTaskParent(taskId: string, tasks: TaskLike[]): boolean {
  return tasks.some((task) => task.parentId === taskId);
}

function getSubtreeEndIndex(taskId: string, tasks: TaskLike[]): number {
  const descendantIds = new Set(getDescendantIds(taskId, tasks));
  const taskIndex = tasks.findIndex((task) => task.id === taskId);
  if (taskIndex === -1) return -1;

  let endIndex = taskIndex;
  for (let index = taskIndex + 1; index < tasks.length; index += 1) {
    if (!descendantIds.has(tasks[index].id)) break;
    endIndex = index;
  }

  return endIndex;
}

/**
 * Map visible drag/drop positions to indices in the full ordered task list.
 * This keeps collapsed descendants attached to their parent row.
 *
 * When dragging a parent task, all its descendants are included in the move,
 * so they are all filtered out before calculating the insert position.
 */
export function getVisibleReorderPosition(
  orderedTasks: TaskLike[],
  visibleTasks: TaskLike[],
  movedTaskId: string,
  originVisibleIndex: number,
  dropVisibleIndex: number,
): VisibleReorderPosition | null {
  const originOrderedIndex = orderedTasks.findIndex((task) => task.id === movedTaskId);
  if (originOrderedIndex === -1) {
    return null;
  }

  // Get all descendant IDs if this is a parent task
  const descendantIds = getDescendantIds(movedTaskId, orderedTasks);
  const allMovedIds = new Set([movedTaskId, ...descendantIds]);

  // Filter out ALL tasks that will move (parent + descendants)
  const reorderedWithoutMoved = orderedTasks.filter((task) => !allMovedIds.has(task.id));
  const visibleWithoutMoved = visibleTasks.filter((task) => !allMovedIds.has(task.id));

  if (visibleWithoutMoved.length === 0) {
    return { originOrderedIndex, insertIndex: 0 };
  }

  // CRITICAL: dropVisibleIndex is an index into the ORIGINAL visibleTasks, NOT into
  // visibleWithoutMoved (which has fewer items after removing the moved subtree).
  // We must look up the actual drop target task by its ID from the original list,
  // then find it in visibleWithoutMoved.

  // Look up the actual task at the drop position in the ORIGINAL visible list
  const dropTargetTask = visibleTasks[dropVisibleIndex];

  if (!dropTargetTask) {
    // dropVisibleIndex is beyond the end of the original list - append at end
    return {
      originOrderedIndex,
      insertIndex: reorderedWithoutMoved.length,
    };
  }

  // Find the drop target in the filtered array (visibleWithoutMoved has the moved subtree removed)
  const filteredDropIndex = visibleWithoutMoved.findIndex((t) => t.id === dropTargetTask.id);

  if (filteredDropIndex === -1) {
    // Drop target was part of the moved subtree - should not happen after isValidParentDrop check
    // Append at end as fallback
    return {
      originOrderedIndex,
      insertIndex: reorderedWithoutMoved.length,
    };
  }

  const targetVisibleTask = visibleWithoutMoved[filteredDropIndex];

  // Find the target in reorderedWithoutMoved.
  // The drop indicator semantics: indicator at position N shows the TOP border of row N,
  // meaning the task will be inserted ABOVE row N.
  // We use the drop target's position directly without skipping past its group.
  // This preserves "drop at top of родитель2 = insert before родитель2" semantics.
  // To move a parent PAST родитель2's entire group, the user must drag to the end of the list
  // (past all of родитель2's children), which triggers the "append at end" path above.
  const insertIndex = reorderedWithoutMoved.findIndex((task) => task.id === targetVisibleTask.id);

  return {
    originOrderedIndex,
    insertIndex,
  };
}

export function getVisibleReorderPlan(
  orderedTasks: TaskLike[],
  visibleTasks: TaskLike[],
  movedTaskId: string,
  target: ReorderDropTarget,
): VisibleReorderPlan | null {
  const originOrderedIndex = orderedTasks.findIndex((task) => task.id === movedTaskId);
  if (originOrderedIndex === -1) {
    return null;
  }

  const descendantIds = getDescendantIds(movedTaskId, orderedTasks);
  const movedIds = new Set([movedTaskId, ...descendantIds]);
  const reorderedWithoutMoved = orderedTasks.filter((task) => !movedIds.has(task.id));

  if (target.placement === 'end' || target.index >= visibleTasks.length) {
    return {
      originOrderedIndex,
      insertIndex: reorderedWithoutMoved.length,
      inferredParentId: undefined,
    };
  }

  const targetTask = visibleTasks[target.index];
  if (!targetTask || movedIds.has(targetTask.id)) {
    return null;
  }

  const targetIndex = reorderedWithoutMoved.findIndex((task) => task.id === targetTask.id);
  if (targetIndex === -1) {
    return null;
  }

  let insertIndex = targetIndex;
  let inferredParentId: string | undefined;

  switch (target.placement) {
    case 'before': {
      insertIndex = targetIndex;
      inferredParentId = targetTask.parentId || undefined;
      break;
    }
    case 'inside': {
      inferredParentId = targetTask.parentId
        ? (isTaskParent(targetTask.id, orderedTasks) ? targetTask.id : targetTask.parentId)
        : targetTask.id;

      if (!inferredParentId || movedIds.has(inferredParentId)) {
        return null;
      }

      const anchorTaskId = inferredParentId === targetTask.id ? targetTask.id : targetTask.id;
      const anchorEndIndex = getSubtreeEndIndex(anchorTaskId, reorderedWithoutMoved);
      insertIndex = anchorEndIndex === -1 ? targetIndex + 1 : anchorEndIndex + 1;
      break;
    }
    case 'after': {
      inferredParentId = targetTask.parentId || undefined;
      const targetEndIndex = getSubtreeEndIndex(targetTask.id, reorderedWithoutMoved);
      insertIndex = targetEndIndex === -1 ? targetIndex + 1 : targetEndIndex + 1;
      break;
    }
    default: {
      return {
        originOrderedIndex,
        insertIndex: reorderedWithoutMoved.length,
        inferredParentId: undefined,
      };
    }
  }

  if (inferredParentId && movedIds.has(inferredParentId)) {
    return null;
  }

  return {
    originOrderedIndex,
    insertIndex,
    inferredParentId,
  };
}
