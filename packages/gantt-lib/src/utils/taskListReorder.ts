type TaskLike = { id: string };

export interface VisibleReorderPosition {
  originOrderedIndex: number;
  insertIndex: number;
}

/**
 * Map visible drag/drop positions to indices in the full ordered task list.
 * This keeps collapsed descendants attached to their parent row.
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

  const reorderedWithoutMoved = orderedTasks.filter((task) => task.id !== movedTaskId);
  const visibleWithoutMoved = visibleTasks.filter((task) => task.id !== movedTaskId);
  const visibleInsertIndex = originVisibleIndex < dropVisibleIndex
    ? dropVisibleIndex - 1
    : dropVisibleIndex;

  if (visibleWithoutMoved.length === 0) {
    return { originOrderedIndex, insertIndex: 0 };
  }

  if (visibleInsertIndex <= 0) {
    return {
      originOrderedIndex,
      insertIndex: reorderedWithoutMoved.findIndex((task) => task.id === visibleWithoutMoved[0].id),
    };
  }

  if (visibleInsertIndex >= visibleWithoutMoved.length) {
    return {
      originOrderedIndex,
      insertIndex: reorderedWithoutMoved.length,
    };
  }

  return {
    originOrderedIndex,
    insertIndex: reorderedWithoutMoved.findIndex((task) => task.id === visibleWithoutMoved[visibleInsertIndex].id),
  };
}
