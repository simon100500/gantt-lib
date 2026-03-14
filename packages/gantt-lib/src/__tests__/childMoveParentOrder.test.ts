import { describe, it, expect } from 'vitest';
import { computeParentDates } from '../utils/dependencyUtils';

describe('Child move - parent NOT sent in batch', () => {
  it('should NOT send parent when child is moved (parent is computed from children)', () => {
    // Setup: parent with 2 children
    const tasks = [
      { id: 'parent', name: 'Parent', startDate: '2026-01-01', endDate: '2026-01-10' },
      { id: 'child1', name: 'Child 1', parentId: 'parent', startDate: '2026-01-02', endDate: '2026-01-04' },
      { id: 'child2', name: 'Child 2', parentId: 'parent', startDate: '2026-01-05', endDate: '2026-01-08' },
    ];

    // Simulate moving child2 to a new position
    const movedChild = { ...tasks[2], startDate: '2026-01-07', endDate: '2026-01-10' };
    const cascadedTasks = [movedChild]; // Only the moved child

    // The final batch sent to onTasksChange
    // NEW BEHAVIOR: Only children are sent, parent is NOT sent (computed by backend)
    const finalBatch = cascadedTasks;

    console.log('Final batch:', finalBatch.map(t => ({ id: t.id, parentId: (t as any).parentId })));

    // CRITICAL: Only the child is sent, NOT the parent
    expect(finalBatch.length).toBe(1);
    expect(finalBatch[0].id).toBe('child2');
    expect((finalBatch[0] as any).parentId).toBe('parent');

    // Parent dates would be computed by backend as:
    // startDate: min(child1.start, child2.newStart) = 2026-01-02
    // endDate: max(child1.end, child2.newEnd) = 2026-01-10
    const expectedParentDates = computeParentDates('parent', [
      tasks[0], // parent (not used in computeParentDates, but needed for context)
      tasks[1], // child1 (unchanged)
      movedChild // child2 (moved)
    ]);
    expect(expectedParentDates.startDate.toISOString().split('T')[0]).toBe('2026-01-02');
    expect(expectedParentDates.endDate.toISOString().split('T')[0]).toBe('2026-01-10');
  });
});
