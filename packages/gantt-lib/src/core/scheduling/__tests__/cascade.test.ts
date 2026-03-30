import { describe, it, expect } from 'vitest';
import {
  cascadeByLinks,
  getSuccessorChain,
  reflowTasksOnModeSwitch,
} from '../cascade';
import type { Task } from '../../types';

const isWeekend = (d: Date) => d.getUTCDay() === 0 || d.getUTCDay() === 6;

function makeTask(id: string, start: string, end: string, deps?: Task['dependencies'], parentId?: string): Task {
  return { id, name: id, startDate: start, endDate: end, ...(deps && { dependencies: deps }), ...(parentId && { parentId }) };
}

describe('cascade', () => {
  describe('getSuccessorChain', () => {
    it('returns correct transitive successors for FS links', () => {
      const tasks: Task[] = [
        makeTask('A', '2025-01-06', '2025-01-10'),
        makeTask('B', '2025-01-11', '2025-01-15', [{ taskId: 'A', type: 'FS', lag: 0 }]),
        makeTask('C', '2025-01-16', '2025-01-20', [{ taskId: 'B', type: 'FS', lag: 0 }]),
      ];
      const chain = getSuccessorChain('A', tasks, ['FS']);
      expect(chain.map(t => t.id)).toEqual(['B', 'C']);
    });

    it('excludes non-matching link types', () => {
      const tasks: Task[] = [
        makeTask('A', '2025-01-06', '2025-01-10'),
        makeTask('B', '2025-01-11', '2025-01-15', [{ taskId: 'A', type: 'SS', lag: 0 }]),
      ];
      const chain = getSuccessorChain('A', tasks, ['FS']);
      expect(chain).toHaveLength(0);
    });
  });

  describe('cascadeByLinks', () => {
    it('produces correct task overrides for FS chain', () => {
      const tasks: Task[] = [
        makeTask('A', '2025-01-06', '2025-01-10'),
        makeTask('B', '2025-01-11', '2025-01-15', [{ taskId: 'A', type: 'FS', lag: 0 }]),
      ];
      const newStart = new Date(Date.UTC(2025, 0, 13)); // Mon
      const newEnd = new Date(Date.UTC(2025, 0, 17));    // Fri
      const result = cascadeByLinks('A', newStart, newEnd, tasks);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('B');
      // B should start on Jan 18 (day after A ends on Jan 17)
      expect(result[0].startDate).toBe('2025-01-18');
    });
  });

  describe('reflowTasksOnModeSwitch', () => {
    it('converts between business/calendar day durations', () => {
      const tasks: Task[] = [
        makeTask('A', '2025-01-06', '2025-01-10'), // Mon-Fri = 5 calendar = 5 business
      ];
      // Calendar -> Business: duration number preserved, start aligned
      const result = reflowTasksOnModeSwitch(tasks, true, isWeekend);
      expect(result).toHaveLength(1);
      // With 5 business days from Mon Jan 6: Mon,Tue,Wed,Thu,Fri = Jan 10
      expect(result[0].startDate).toBe('2025-01-06');
    });
  });
});
