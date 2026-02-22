import { describe, it, expect } from 'vitest';
import {
  buildAdjacencyList,
  detectCycles,
  calculateSuccessorDate,
  validateDependencies,
  getAllDependencyEdges,
  getSuccessorChain,
} from '../utils/dependencyUtils';
import { Task } from '../types';

describe('dependencyUtils', () => {
  const createTask = (id: string, start: string, end: string, deps?: any[]): Task => ({
    id,
    name: `Task ${id}`,
    startDate: start,
    endDate: end,
    dependencies: deps,
  });

  describe('buildAdjacencyList', () => {
    it('should build empty adjacency list for no tasks', () => {
      const result = buildAdjacencyList([]);
      expect(result.size).toBe(0);
    });

    it('should build adjacency list with no dependencies', () => {
      const tasks = [createTask('1', '2026-01-01', '2026-01-05')];
      const result = buildAdjacencyList(tasks);
      expect(result.get('1')).toEqual([]);
    });

    it('should build adjacency list with dependencies', () => {
      const tasks = [
        createTask('1', '2026-01-01', '2026-01-05'),
        createTask('2', '2026-01-06', '2026-01-10', [{ taskId: '1', type: 'FS' }]),
        createTask('3', '2026-01-11', '2026-01-15', [{ taskId: '1', type: 'SS' }]),
      ];
      const result = buildAdjacencyList(tasks);
      expect(result.get('1')).toEqual(['2', '3']);
      expect(result.get('2')).toEqual([]);
      expect(result.get('3')).toEqual([]);
    });
  });

  describe('detectCycles', () => {
    it('should detect no cycles in independent tasks', () => {
      const tasks = [
        createTask('1', '2026-01-01', '2026-01-05'),
        createTask('2', '2026-01-06', '2026-01-10'),
        createTask('3', '2026-01-11', '2026-01-15'),
      ];
      const result = detectCycles(tasks);
      expect(result.hasCycle).toBe(false);
      expect(result.cyclePath).toBeUndefined();
    });

    it('should detect no cycles in valid dependency chain', () => {
      const tasks = [
        createTask('1', '2026-01-01', '2026-01-05'),
        createTask('2', '2026-01-06', '2026-01-10', [{ taskId: '1', type: 'FS' }]),
        createTask('3', '2026-01-11', '2026-01-15', [{ taskId: '2', type: 'FS' }]),
      ];
      const result = detectCycles(tasks);
      expect(result.hasCycle).toBe(false);
    });

    it('should detect direct cycle (A -> B -> A)', () => {
      const tasks = [
        createTask('1', '2026-01-01', '2026-01-05', [{ taskId: '2', type: 'FS' }]),
        createTask('2', '2026-01-06', '2026-01-10', [{ taskId: '1', type: 'FS' }]),
      ];
      const result = detectCycles(tasks);
      expect(result.hasCycle).toBe(true);
      expect(result.cyclePath).toBeDefined();
      expect(result.cyclePath?.length).toBeGreaterThan(0);
    });

    it('should detect indirect cycle (A -> B -> C -> A)', () => {
      const tasks = [
        createTask('1', '2026-01-01', '2026-01-05', [{ taskId: '3', type: 'FS' }]),
        createTask('2', '2026-01-06', '2026-01-10', [{ taskId: '1', type: 'FS' }]),
        createTask('3', '2026-01-11', '2026-01-15', [{ taskId: '2', type: 'FS' }]),
      ];
      const result = detectCycles(tasks);
      expect(result.hasCycle).toBe(true);
    });
  });

  describe('calculateSuccessorDate', () => {
    const jan1 = new Date(Date.UTC(2026, 0, 1)); // 2026-01-01
    const jan5 = new Date(Date.UTC(2026, 0, 5)); // 2026-01-05

    it('should calculate FS (finish-to-start) with no lag', () => {
      const result = calculateSuccessorDate(jan1, jan5, 'FS', 0);
      expect(result.getUTCFullYear()).toBe(2026);
      expect(result.getUTCMonth()).toBe(0);
      expect(result.getUTCDate()).toBe(5); // Starts when predecessor finishes
    });

    it('should calculate FS with positive lag', () => {
      const result = calculateSuccessorDate(jan1, jan5, 'FS', 2);
      expect(result.getUTCDate()).toBe(7); // 2 days after predecessor finishes
    });

    it('should calculate FS with negative lag', () => {
      const result = calculateSuccessorDate(jan1, jan5, 'FS', -2);
      expect(result.getUTCDate()).toBe(3); // 2 days before predecessor finishes
    });

    it('should calculate SS (start-to-start) with no lag', () => {
      const result = calculateSuccessorDate(jan1, jan5, 'SS', 0);
      expect(result.getUTCDate()).toBe(1); // Starts when predecessor starts
    });

    it('should calculate SS with positive lag', () => {
      const result = calculateSuccessorDate(jan1, jan5, 'SS', 3);
      expect(result.getUTCDate()).toBe(4); // 3 days after predecessor starts
    });

    it('should calculate FF (finish-to-finish) with no lag', () => {
      const result = calculateSuccessorDate(jan1, jan5, 'FF', 0);
      expect(result.getUTCDate()).toBe(5); // Finishes when predecessor finishes
    });

    it('should calculate FF with positive lag', () => {
      const result = calculateSuccessorDate(jan1, jan5, 'FF', 1);
      expect(result.getUTCDate()).toBe(6); // 1 day after predecessor finishes
    });

    it('should calculate SF (start-to-finish) with no lag', () => {
      const result = calculateSuccessorDate(jan1, jan5, 'SF', 0);
      expect(result.getUTCDate()).toBe(1); // Finishes when predecessor starts
    });

    it('should calculate SF with positive lag', () => {
      const result = calculateSuccessorDate(jan1, jan5, 'SF', 4);
      expect(result.getUTCDate()).toBe(5); // 4 days after predecessor starts
    });
  });

  describe('validateDependencies', () => {
    it('should return valid for tasks with no dependencies', () => {
      const tasks = [
        createTask('1', '2026-01-01', '2026-01-05'),
        createTask('2', '2026-01-06', '2026-01-10'),
      ];
      const result = validateDependencies(tasks);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should return valid for valid dependencies', () => {
      const tasks = [
        createTask('1', '2026-01-01', '2026-01-05'),
        createTask('2', '2026-01-06', '2026-01-10', [{ taskId: '1', type: 'FS' }]),
      ];
      const result = validateDependencies(tasks);
      expect(result.isValid).toBe(true);
    });

    it('should detect missing predecessor task', () => {
      const tasks = [
        createTask('1', '2026-01-01', '2026-01-05', [{ taskId: '999', type: 'FS' }]),
      ];
      const result = validateDependencies(tasks);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('missing-task');
      expect(result.errors[0].taskId).toBe('1');
    });

    it('should detect cycles', () => {
      const tasks = [
        createTask('1', '2026-01-01', '2026-01-05', [{ taskId: '2', type: 'FS' }]),
        createTask('2', '2026-01-06', '2026-01-10', [{ taskId: '1', type: 'FS' }]),
      ];
      const result = validateDependencies(tasks);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'cycle')).toBe(true);
    });

    it('should detect multiple errors', () => {
      const tasks = [
        createTask('1', '2026-01-01', '2026-01-05', [{ taskId: '999', type: 'FS' }]),
        createTask('2', '2026-01-06', '2026-01-10', [{ taskId: '1', type: 'FS' }]),
        createTask('3', '2026-01-11', '2026-01-15', [{ taskId: '888', type: 'FS' }]),
      ];
      const result = validateDependencies(tasks);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('getAllDependencyEdges', () => {
    it('should return empty array for no dependencies', () => {
      const tasks = [
        createTask('1', '2026-01-01', '2026-01-05'),
        createTask('2', '2026-01-06', '2026-01-10'),
      ];
      const result = getAllDependencyEdges(tasks);
      expect(result).toEqual([]);
    });

    it('should extract single dependency edge', () => {
      const tasks = [
        createTask('1', '2026-01-01', '2026-01-05'),
        createTask('2', '2026-01-06', '2026-01-10', [{ taskId: '1', type: 'FS', lag: 2 }]),
      ];
      const result = getAllDependencyEdges(tasks);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        predecessorId: '1',
        successorId: '2',
        type: 'FS',
        lag: 2,
      });
    });

    it('should extract multiple dependency edges', () => {
      const tasks = [
        createTask('1', '2026-01-01', '2026-01-05'),
        createTask('2', '2026-01-06', '2026-01-10', [
          { taskId: '1', type: 'FS' },
          { taskId: '3', type: 'SS', lag: -1 },
        ]),
        createTask('3', '2026-01-11', '2026-01-15'),
      ];
      const result = getAllDependencyEdges(tasks);
      expect(result).toHaveLength(2);
    });

    it('should default lag to 0 when not specified', () => {
      const tasks = [
        createTask('1', '2026-01-01', '2026-01-05'),
        createTask('2', '2026-01-06', '2026-01-10', [{ taskId: '1', type: 'FF' }]),
      ];
      const result = getAllDependencyEdges(tasks);
      expect(result[0].lag).toBe(0);
    });
  });

  describe('getSuccessorChain', () => {
    // Helper tasks: A -> (FS) -> B, A -> (SS) -> C
    const taskA = createTask('A', '2026-01-01', '2026-01-05');
    const taskB = createTask('B', '2026-01-06', '2026-01-10', [{ taskId: 'A', type: 'FS', lag: 0 }]);
    const taskC = createTask('C', '2026-01-01', '2026-01-05', [{ taskId: 'A', type: 'SS', lag: 0 }]);
    const mixedTasks = [taskA, taskB, taskC];

    it('returns FS successors with default linkTypes (no third argument)', () => {
      const result = getSuccessorChain('A', mixedTasks);
      expect(result.map(t => t.id)).toEqual(['B']);
    });

    it('returns only FS successors when linkTypes is explicitly ["FS"]', () => {
      const result = getSuccessorChain('A', mixedTasks, ['FS']);
      expect(result.map(t => t.id)).toEqual(['B']);
    });

    it('returns only SS successors when linkTypes is ["SS"]', () => {
      const result = getSuccessorChain('A', mixedTasks, ['SS']);
      expect(result.map(t => t.id)).toEqual(['C']);
    });

    it('returns both FS and SS successors when linkTypes is ["FS","SS"]', () => {
      const result = getSuccessorChain('A', mixedTasks, ['FS', 'SS']);
      expect(result.length).toBe(2);
      expect(result.map(t => t.id)).toContain('B');
      expect(result.map(t => t.id)).toContain('C');
    });

    it('traverses deep SS chain: A->(SS)->B->(SS)->C', () => {
      const a = createTask('A', '2026-01-01', '2026-01-05');
      const b = createTask('B', '2026-01-01', '2026-01-05', [{ taskId: 'A', type: 'SS', lag: 0 }]);
      const c = createTask('C', '2026-01-01', '2026-01-05', [{ taskId: 'B', type: 'SS', lag: 0 }]);
      const result = getSuccessorChain('A', [a, b, c], ['SS']);
      expect(result.map(t => t.id)).toEqual(['B', 'C']);
    });

    it('excludes the dragged task from result even with self-link cycle data', () => {
      const a = createTask('A', '2026-01-01', '2026-01-05', [{ taskId: 'A', type: 'SS', lag: 0 }]);
      const result = getSuccessorChain('A', [a], ['SS']);
      expect(result.map(t => t.id)).not.toContain('A');
    });

    it('returns empty array when no successors of given type exist', () => {
      const result = getSuccessorChain('A', mixedTasks, ['SS']);
      // taskB is FS-only, taskC is SS — asking for SS should return C not B
      // but 'A' has FS->B and SS->C, asking ['SS'] gives [C]. Let's test the FS-only scenario:
      const fsOnlyTasks = [taskA, taskB];
      const result2 = getSuccessorChain('A', fsOnlyTasks, ['SS']);
      expect(result2).toEqual([]);
    });
  });
});
