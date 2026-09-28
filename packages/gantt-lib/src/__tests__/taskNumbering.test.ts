import { describe, expect, it } from 'vitest';
import type { Task } from '../components/GanttChart';
import { buildTaskNumberMap } from '../components/TaskList/taskNumbering';

// Port of the previous recursive numbering used by TaskList, kept as the
// behavioral oracle for the linear builder that replaced it.
function legacyGetTaskNumber(tasks: Task[], taskIndex: number): string {
  const task = tasks[taskIndex];
  if (!task) return '';
  if (!task.parentId) {
    let rootIndex = 0;
    for (let i = 0; i < taskIndex; i++) {
      if (!tasks[i].parentId) rootIndex++;
    }
    return String(rootIndex + 1);
  }
  const parentIndex = tasks.findIndex((t) => t.id === task.parentId);
  if (parentIndex === -1) return String(taskIndex + 1);
  const parentNumber = legacyGetTaskNumber(tasks, parentIndex);
  let siblingIndex = 0;
  for (let i = 0; i < taskIndex; i++) {
    if (tasks[i].parentId === task.parentId) siblingIndex++;
  }
  return `${parentNumber}.${siblingIndex + 1}`;
}

function legacyNumberMap(tasks: Task[]): Map<string, string> {
  const out = new Map<string, string>();
  tasks.forEach((task, index) => { out.set(task.id, legacyGetTaskNumber(tasks, index)); });
  return out;
}

function makeTasks(shape: Array<[id: string, parentId?: string]>): Task[] {
  return shape.map(([id, parentId], index) => ({
    id,
    name: `Task ${id}`,
    startDate: `2026-01-${String((index % 27) + 1).padStart(2, '0')}`,
    endDate: `2026-01-${String((index % 27) + 2).padStart(2, '0')}`,
    parentId,
  } as Task));
}

describe('buildTaskNumberMap', () => {
  it('matches the legacy recursive numbering on mixed hierarchies', () => {
    const tasks = makeTasks([
      ['root1'],
      ['a', 'root1'],
      ['b', 'root1'],
      ['ba', 'b'],
      ['baa', 'ba'],
      ['root2'],
      ['x', 'root2'],
      ['y', 'root2'],
      ['z', 'root2'],
      ['root3'],
      ['orphan', 'missing-parent'],
      ['c', 'root3'],
    ]);
    const legacy = legacyNumberMap(tasks);
    const next = buildTaskNumberMap(tasks);
    expect(Object.fromEntries(next)).toEqual(Object.fromEntries(legacy));
    // spot-check well-known values
    expect(next.get('root1')).toBe('1');
    expect(next.get('baa')).toBe('1.2.1.1');
    expect(next.get('z')).toBe('2.3');
    expect(next.get('c')).toBe('3.1');
    // orphan keeps the legacy flat fallback (index + 1)
    expect(next.get('orphan')).toBe(String(tasks.findIndex((t) => t.id === 'orphan') + 1));
  });

  it('numbers a flat list as 1..n', () => {
    const tasks = makeTasks([['f1'], ['f2'], ['f3']]);
    const next = buildTaskNumberMap(tasks);
    expect([...next.values()]).toEqual(['1', '2', '3']);
  });

  it('stays linear at scale', () => {
    const shape: Array<[string, string?]> = [];
    for (let i = 0; i < 4000; i++) {
      shape.push(i === 0 || i % 40 === 0 ? [`t${i}`] : [`t${i}`, `t${Math.floor(i / 40) * 40}`]);
    }
    const tasks = makeTasks(shape);
    const started = Date.now();
    buildTaskNumberMap(tasks);
    const ms = Date.now() - started;
    expect(ms).toBeLessThan(50);
  });
});
