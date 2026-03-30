import { describe, it, expect } from 'vitest';
import {
  validateDependencies,
  detectCycles,
  buildAdjacencyList,
} from '../validation';
import type { Task } from '../../types';

function makeTask(id: string, deps?: Task['dependencies']): Task {
  return { id, name: id, startDate: '2025-01-06', endDate: '2025-01-10', ...(deps && { dependencies: deps }) };
}

describe('validation', () => {
  describe('validateDependencies', () => {
    it('returns isValid: true for valid task set', () => {
      const tasks: Task[] = [
        makeTask('A'),
        makeTask('B', [{ taskId: 'A', type: 'FS', lag: 0 }]),
      ];
      const result = validateDependencies(tasks);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('detects cycles', () => {
      const tasks: Task[] = [
        makeTask('A', [{ taskId: 'B', type: 'FS', lag: 0 }]),
        makeTask('B', [{ taskId: 'A', type: 'FS', lag: 0 }]),
      ];
      const result = validateDependencies(tasks);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'cycle')).toBe(true);
    });
  });

  describe('detectCycles', () => {
    it('returns { hasCycle: true } for A->B->A', () => {
      const tasks: Task[] = [
        makeTask('A', [{ taskId: 'B', type: 'FS', lag: 0 }]),
        makeTask('B', [{ taskId: 'A', type: 'FS', lag: 0 }]),
      ];
      const result = detectCycles(tasks);
      expect(result.hasCycle).toBe(true);
    });

    it('returns { hasCycle: false } for valid chain', () => {
      const tasks: Task[] = [
        makeTask('A'),
        makeTask('B', [{ taskId: 'A', type: 'FS', lag: 0 }]),
      ];
      const result = detectCycles(tasks);
      expect(result.hasCycle).toBe(false);
    });
  });

  describe('buildAdjacencyList', () => {
    it('creates correct predecessor map', () => {
      const tasks: Task[] = [
        makeTask('A'),
        makeTask('B', [{ taskId: 'A', type: 'FS', lag: 0 }]),
      ];
      const graph = buildAdjacencyList(tasks);
      expect(graph.get('A')).toEqual(['B']);
      expect(graph.get('B')).toEqual([]);
    });
  });
});
