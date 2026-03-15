import type { Task } from '../components/GanttChart';

type TaskLike = { id: string };

export interface VisibleReorderPosition {
  originOrderedIndex: number;
  insertIndex: number;
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
