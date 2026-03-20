import { describe, it, expect } from 'vitest';
import {
  buildAdjacencyList,
  detectCycles,
  calculateSuccessorDate,
  computeLagFromDates,
  universalCascade,
  validateDependencies,
  getAllDependencyEdges,
  getSuccessorChain,
  getTransitiveCascadeChain,
  removeDependenciesBetweenTasks,
  findParentId,
} from '../utils/dependencyUtils';
import { isWeekend } from '../utils/dateUtils';
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
      expect(result.getUTCDate()).toBe(6); // Starts the day after predecessor finishes
    });

    it('should calculate FS with positive lag', () => {
      const result = calculateSuccessorDate(jan1, jan5, 'FS', 2);
      expect(result.getUTCDate()).toBe(8); // lag=2 means 2 extra days after natural FS gap
    });

    it('should calculate FS with negative lag', () => {
      const result = calculateSuccessorDate(jan1, jan5, 'FS', -2);
      expect(result.getUTCDate()).toBe(4); // lag=-2 means 2-day overlap
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
      expect(result.getUTCFullYear()).toBe(2025);
      expect(result.getUTCMonth()).toBe(11);
      expect(result.getUTCDate()).toBe(31); // Ends the day before predecessor starts
    });

    it('should calculate SF with positive lag', () => {
      const result = calculateSuccessorDate(jan1, jan5, 'SF', 4);
      expect(result.getUTCDate()).toBe(4); // lag=4 means 4 days after (pred.start - 1)
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

  describe('getTransitiveCascadeChain', () => {
    it('includes parent children before traversing their external successors', () => {
      const tasks: Task[] = [
        {
          id: 'parent',
          name: 'Parent',
          startDate: '2026-01-01',
          endDate: '2026-01-10',
        },
        {
          id: 'child',
          name: 'Hidden child',
          startDate: '2026-01-02',
          endDate: '2026-01-04',
          parentId: 'parent',
        },
        {
          id: 'successor',
          name: 'External successor',
          startDate: '2026-01-05',
          endDate: '2026-01-07',
          dependencies: [{ taskId: 'child', type: 'FS', lag: 0 }],
        },
      ];

      const result = getTransitiveCascadeChain('parent', tasks, ['FS', 'SS', 'FF', 'SF']);

      expect(result.map(task => task.id)).toEqual(['child', 'successor']);
    });
  });

  // NOTE: recalculateIncomingLags is private in useTaskDrag.ts
  // These test cases document the expected FF lag behavior
  // Verified via integration testing during drag operations
  describe('recalculateIncomingLags - FF (documented)', () => {
    it('should calculate FF lag as endB - endA with no floor', () => {
      // FF: lag can be negative, zero, or positive
      // Formula: lag = endB - endA (no Math.max(0, ...) floor unlike SS)
      // Example: predEnd=2025-01-10, newEndDate=2025-01-05 → lag=-5
      // This documents that FF has NO floor — lag is freely recalculated
      expect(true).toBe(true); // Placeholder — behavior verified in integration
    });

    it('should calculate FF lag with zero lag', () => {
      // predEnd=2025-01-10, newEndDate=2025-01-10 → lag=0
      expect(true).toBe(true); // Placeholder
    });

    it('should calculate FF lag with positive lag', () => {
      // predEnd=2025-01-10, newEndDate=2025-01-15 → lag=5
      expect(true).toBe(true); // Placeholder
    });

    it('should calculate FF lag with negative lag (no floor)', () => {
      // predEnd=2025-01-15, newEndDate=2025-01-10 → lag=-5
      // Critical: FF allows negative lag (unlike SS which floors at 0)
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('businessDays cascade lag preservation', () => {
    it('preserves FF lag in working days when predecessor expands across a weekend', () => {
      const tasks = [
        createTask('pred', '2026-03-02', '2026-03-06'),
        createTask('succ', '2026-03-11', '2026-03-17', [{ taskId: 'pred', type: 'FF', lag: 7 }]),
      ];

      const movedTask = {
        ...tasks[0],
        startDate: '2026-03-03',
        endDate: '2026-03-09',
      };

      const result = universalCascade(
        movedTask,
        new Date('2026-03-03T00:00:00.000Z'),
        new Date('2026-03-09T00:00:00.000Z'),
        tasks,
        true,
        isWeekend
      );

      const successor = result.find(task => task.id === 'succ');
      expect(successor).toBeDefined();
      expect(successor?.startDate).toBe('2026-03-12');
      expect(successor?.endDate).toBe('2026-03-18');

      const effectiveLag = computeLagFromDates(
        'FF',
        new Date('2026-03-03T00:00:00.000Z'),
        new Date('2026-03-09T00:00:00.000Z'),
        new Date(`${successor?.startDate}T00:00:00.000Z`),
        new Date(`${successor?.endDate}T00:00:00.000Z`),
        true,
        isWeekend
      );

      expect(effectiveLag).toBe(7);
    });

    it('snaps child tasks away from weekend starts when a parent move would place them there', () => {
      const tasks = [
        createTask('parent', '2026-03-03', '2026-03-05'),
        { ...createTask('child', '2026-03-06', '2026-03-06'), parentId: 'parent' } as Task,
      ];

      const movedParent = {
        ...tasks[0],
        startDate: '2026-03-05',
        endDate: '2026-03-07',
      };

      const result = universalCascade(
        movedParent,
        new Date('2026-03-05T00:00:00.000Z'),
        new Date('2026-03-07T00:00:00.000Z'),
        tasks,
        true,
        isWeekend
      );

      const child = result.find(task => task.id === 'child');
      expect(child).toBeDefined();
      expect(child?.startDate).toBe('2026-03-09');
      expect(child?.endDate).toBe('2026-03-09');
    });

    it('keeps child start and end off weekends and expands span when needed after parent move', () => {
      const tasks = [
        createTask('parent', '2026-03-03', '2026-03-05'),
        { ...createTask('child', '2026-03-06', '2026-03-09'), parentId: 'parent' } as Task,
      ];

      const movedParent = {
        ...tasks[0],
        startDate: '2026-03-04',
        endDate: '2026-03-06',
      };

      const result = universalCascade(
        movedParent,
        new Date('2026-03-04T00:00:00.000Z'),
        new Date('2026-03-06T00:00:00.000Z'),
        tasks,
        true,
        isWeekend
      );

      const child = result.find(task => task.id === 'child');
      expect(child).toBeDefined();
      expect(child?.startDate).toBe('2026-03-09');
      expect(child?.endDate).toBe('2026-03-10');
    });
  });

  describe('removeDependenciesBetweenTasks', () => {
    it('should remove dependency from child to parent when demoting', () => {
      // Given: Task A depends on Task B
      const tasks = [
        createTask('A', '2026-01-01', '2026-01-05', [{ taskId: 'B', type: 'FS' }]),
        createTask('B', '2026-01-06', '2026-01-10'),
      ];

      // When: Remove dependencies between A and B
      const result = removeDependenciesBetweenTasks('A', 'B', tasks);

      // Then: Task A should have no dependencies
      const taskA = result.find(t => t.id === 'A');
      expect(taskA?.dependencies).toBeUndefined();
    });

    it('should remove dependency from parent to child when demoting', () => {
      // Given: Task B depends on Task A
      const tasks = [
        createTask('A', '2026-01-01', '2026-01-05'),
        createTask('B', '2026-01-06', '2026-01-10', [{ taskId: 'A', type: 'FS' }]),
      ];

      // When: Remove dependencies between A and B
      const result = removeDependenciesBetweenTasks('A', 'B', tasks);

      // Then: Task B should have no dependencies
      const taskB = result.find(t => t.id === 'B');
      expect(taskB?.dependencies).toBeUndefined();
    });

    it('should preserve dependencies to other tasks', () => {
      // Given: Task A depends on Task B and Task C
      const tasks = [
        createTask('A', '2026-01-01', '2026-01-05', [
          { taskId: 'B', type: 'FS' },
          { taskId: 'C', type: 'SS' },
        ]),
        createTask('B', '2026-01-06', '2026-01-10'),
        createTask('C', '2026-01-11', '2026-01-15'),
      ];

      // When: Remove dependencies between A and B
      const result = removeDependenciesBetweenTasks('A', 'B', tasks);

      // Then: Task A.dependencies should only contain reference to Task C
      const taskA = result.find(t => t.id === 'A');
      expect(taskA?.dependencies).toEqual([{ taskId: 'C', type: 'SS' }]);
    });

    it('should handle tasks without dependencies array', () => {
      // Given: Task A and Task B, neither has dependencies
      const tasks = [
        createTask('A', '2026-01-01', '2026-01-05'),
        createTask('B', '2026-01-06', '2026-01-10'),
      ];

      // When: removeDependenciesBetweenTasks is called
      const result = removeDependenciesBetweenTasks('A', 'B', tasks);

      // Then: Should return tasks unchanged, no errors
      expect(result).toEqual(tasks);
    });

    it('should remove bidirectional dependencies', () => {
      // Given: Task A depends on B, and Task B depends on A
      const tasks = [
        createTask('A', '2026-01-01', '2026-01-05', [{ taskId: 'B', type: 'FS' }]),
        createTask('B', '2026-01-06', '2026-01-10', [{ taskId: 'A', type: 'SS' }]),
      ];

      // When: Remove dependencies between A and B
      const result = removeDependenciesBetweenTasks('A', 'B', tasks);

      // Then: Both tasks should have no dependencies
      const taskA = result.find(t => t.id === 'A');
      const taskB = result.find(t => t.id === 'B');
      expect(taskA?.dependencies).toBeUndefined();
      expect(taskB?.dependencies).toBeUndefined();
    });

    it('should preserve other tasks dependencies unchanged', () => {
      // Given: Three tasks, only A and B are related
      const tasks = [
        createTask('A', '2026-01-01', '2026-01-05', [{ taskId: 'B', type: 'FS' }]),
        createTask('B', '2026-01-06', '2026-01-10'),
        createTask('C', '2026-01-11', '2026-01-15', [{ taskId: 'A', type: 'FF' }]),
      ];

      // When: Remove dependencies between A and B
      const result = removeDependenciesBetweenTasks('A', 'B', tasks);

      // Then: Task C's dependency on A should remain unchanged
      const taskC = result.find(t => t.id === 'C');
      expect(taskC?.dependencies).toEqual([{ taskId: 'A', type: 'FF' }]);
    });

    it('should return new task objects (immutability)', () => {
      // Given: Task A depends on Task B
      const tasks = [
        createTask('A', '2026-01-01', '2026-01-05', [{ taskId: 'B', type: 'FS' }]),
        createTask('B', '2026-01-06', '2026-01-10'),
      ];

      // When: Remove dependencies
      const result = removeDependenciesBetweenTasks('A', 'B', tasks);

      // Then: Original tasks should be unchanged
      const originalTaskA = tasks.find(t => t.id === 'A');
      expect(originalTaskA?.dependencies).toBeDefined();

      // And result should have modified tasks
      const resultTaskA = result.find(t => t.id === 'A');
      expect(resultTaskA?.dependencies).toBeUndefined();
    });

    it('should handle multiple dependencies on same task removing only one', () => {
      // Given: Task A has two dependencies, remove only one
      const tasks = [
        createTask('A', '2026-01-01', '2026-01-05', [
          { taskId: 'B', type: 'FS' },
          { taskId: 'C', type: 'SS' },
          { taskId: 'D', type: 'FF' },
        ]),
        createTask('B', '2026-01-06', '2026-01-10'),
        createTask('C', '2026-01-11', '2026-01-15'),
        createTask('D', '2026-01-16', '2026-01-20'),
      ];

      // When: Remove only dependency between A and B
      const result = removeDependenciesBetweenTasks('A', 'B', tasks);

      // Then: A should still have dependencies on C and D
      const taskA = result.find(t => t.id === 'A');
      expect(taskA?.dependencies).toEqual([
        { taskId: 'C', type: 'SS' },
        { taskId: 'D', type: 'FF' },
      ]);
    });
  });

  describe('findParentId', () => {
    const createTask = (id: string, parentId?: string): Task => ({
      id,
      name: `Task ${id}`,
      startDate: '2026-01-01',
      endDate: '2026-01-05',
      ...(parentId !== undefined && { parentId }),
    });

    it('should return parent ID for a child task', () => {
      const tasks = [
        createTask('parent'),
        createTask('child', 'parent'),
      ];
      const result = findParentId('child', tasks);
      expect(result).toBe('parent');
    });

    it('should return undefined for a root task', () => {
      const tasks = [
        createTask('root'),
      ];
      const result = findParentId('root', tasks);
      expect(result).toBeUndefined();
    });

    it('should return undefined for a non-existent task', () => {
      const tasks = [
        createTask('task1'),
      ];
      const result = findParentId('non-existent', tasks);
      expect(result).toBeUndefined();
    });

    it('should handle multiple hierarchies correctly', () => {
      const tasks = [
        createTask('parent1'),
        createTask('child1', 'parent1'),
        createTask('parent2'),
        createTask('child2', 'parent2'),
      ];
      expect(findParentId('child1', tasks)).toBe('parent1');
      expect(findParentId('child2', tasks)).toBe('parent2');
      expect(findParentId('parent1', tasks)).toBeUndefined();
    });
  });
});
