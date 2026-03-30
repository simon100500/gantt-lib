import type { Task } from '../../GanttChart';
import type { TaskListColumn } from './types';

export function resolveTaskListColumns<TTask extends Task>(
  builtIn: TaskListColumn<TTask>[],
  custom: TaskListColumn<TTask>[],
): TaskListColumn<TTask>[] {
  // Dev-mode duplicate check
  if (process.env.NODE_ENV !== 'production') {
    const ids = new Set<string>();
    for (const col of [...builtIn, ...custom]) {
      if (ids.has(col.id)) {
        console.error(`[TaskList] Duplicate column id: "${col.id}"`);
      }
      ids.add(col.id);
    }
  }

  if (custom.length === 0) {
    return [...builtIn];
  }

  const result = [...builtIn];
  // Track last insertion index per anchor to preserve order for same-anchor columns
  const lastInsertAfter: Map<string, number> = new Map();
  const lastInsertBefore: Map<string, number> = new Map();

  for (const col of custom) {
    let insertAt: number;

    if ('before' in col && (col as { before: string }).before) {
      const anchor = (col as { before: string }).before;
      // If we've already inserted before this anchor, insert at the same position
      // so the new column goes right before the same target
      if (lastInsertBefore.has(anchor)) {
        insertAt = lastInsertBefore.get(anchor)!;
      } else {
        const idx = result.findIndex(c => c.id === anchor);
        insertAt = idx !== -1 ? idx : result.findIndex(c => c.id === 'name') + 1;
      }
      lastInsertBefore.set(anchor, insertAt);
    } else if ('after' in col && (col as { after: string }).after) {
      const anchor = (col as { after: string }).after;
      // If we've already inserted after this anchor, insert after the last insertion
      if (lastInsertAfter.has(anchor)) {
        insertAt = lastInsertAfter.get(anchor)! + 1;
      } else {
        const idx = result.findIndex(c => c.id === anchor);
        insertAt = idx !== -1 ? idx + 1 : result.findIndex(c => c.id === 'name') + 1;
      }
      lastInsertAfter.set(anchor, insertAt);
    } else {
      // No anchor — insert after 'name', tracking for multiple no-anchor columns
      const anchor = '__no_anchor__';
      if (lastInsertAfter.has(anchor)) {
        insertAt = lastInsertAfter.get(anchor)! + 1;
      } else {
        insertAt = result.findIndex(c => c.id === 'name') + 1;
      }
      lastInsertAfter.set(anchor, insertAt);
    }

    result.splice(insertAt, 0, col);
  }

  return result;
}
