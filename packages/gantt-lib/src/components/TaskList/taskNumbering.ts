// FILE: packages/gantt-lib/src/components/TaskList/taskNumbering.ts
// VERSION: 1.0.0
// START_MODULE_CONTRACT
//   PURPOSE: Build the hierarchical task-number map for the task list in one linear pass.
//   SCOPE: taskId -> "1.2.3" numbering over a hierarchy-ordered task list.
//   DEPENDS: scheduling types
//   LINKS: TaskList, fn-buildTaskNumberMap
//   ROLE: RUNTIME
//   MAP_MODE: EXPORTS
// END_MODULE_CONTRACT
//
import type { Task } from '../GanttChart';

/**
 * Строит карту иерархических номеров («1», «1.2», «2.1.3») за один проход.
 * Корневые задачи нумеруются по порядку, дочерние — номер родителя + порядковый
 * номер среди детей того же родителя. Список ожидается в иерархическом порядке
 * (родитель раньше ребёнка); для задач без найденного родителя — плоский номер,
 * как в прежнем рекурсивном варианте.
 *
 * Заменяяет рекурсивный getTaskNumber: тот делал findIndex и подсчёт
 * предшественников на каждую строку (O(n²)) — на 4k+ строк карта номеров
 * строилась сотни миллисекунд при каждом применении снапшота.
 */
// START_CONTRACT: buildTaskNumberMap
//   PURPOSE: Map every task id to its hierarchical number in one pass.
//   INPUTS: tasks - hierarchy-ordered task list (parents precede children).
//   OUTPUTS: Map<taskId, number string>; orphan/unknown-parent tasks get flat index numbers.
//   SIDE_EFFECTS: none.
//   LINKS: TaskList
// END_CONTRACT:
export function buildTaskNumberMap(tasks: Task[]): Map<string, string> {
  const numberById = new Map<string, string>();
  const indexById = new Map<string, number>();
  for (let i = 0; i < tasks.length; i++) {
    indexById.set(tasks[i].id, i);
  }

  let rootNumber = 0;
  const siblingCountByParent = new Map<string, number>();
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    if (!task.parentId) {
      rootNumber += 1;
      numberById.set(task.id, String(rootNumber));
      continue;
    }
    if (!indexById.has(task.parentId)) {
      // Родитель не найден - fallback на плоский номер (как в прежнем варианте)
      numberById.set(task.id, String(i + 1));
      continue;
    }
    const parentNumber = numberById.get(task.parentId);
    if (parentNumber === undefined) {
      numberById.set(task.id, String(i + 1));
      continue;
    }
    const siblingNumber = (siblingCountByParent.get(task.parentId) ?? 0) + 1;
    siblingCountByParent.set(task.parentId, siblingNumber);
    numberById.set(task.id, `${parentNumber}.${siblingNumber}`);
  }
  return numberById;
}
