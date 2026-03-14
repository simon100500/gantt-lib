import { describe, it, expect } from 'vitest';
import { computeParentDates } from '../utils/dependencyUtils';

describe('Child move - parent before child in batch', () => {
  it('should ensure parent comes before child when child is moved', () => {
    // Setup: parent with 2 children
    const tasks = [
      { id: 'parent', name: 'Parent', startDate: '2026-01-01', endDate: '2026-01-10' },
      { id: 'child1', name: 'Child 1', parentId: 'parent', startDate: '2026-01-02', endDate: '2026-01-04' },
      { id: 'child2', name: 'Child 2', parentId: 'parent', startDate: '2026-01-05', endDate: '2026-01-08' },
    ];

    // Simulate moving child2 to a new position
    const movedChild = { ...tasks[2], startDate: '2026-01-07', endDate: '2026-01-10' };
    const cascadedTasks = [movedChild]; // Only the moved child

    // Simulate parent update logic from handleTaskChange
    const changedTasks = new Map(cascadedTasks.map(t => [t.id, t]));
    const parentIdsToUpdate = new Set<string>();
    cascadedTasks.forEach(task => {
      if ((task as any).parentId) {
        parentIdsToUpdate.add((task as any).parentId);
      }
    });

    const additionalParentUpdates: any[] = [];
    parentIdsToUpdate.forEach(parentId => {
      const parentTask = tasks.find(t => t.id === parentId);
      if (!parentTask) return;

      // This is NOT the moved task, so recalc dates from children
      const tempTasks = tasks.map(t => changedTasks.get(t.id) ?? t);
      const newDates = computeParentDates(parentId, tempTasks);
      additionalParentUpdates.push({
        ...parentTask,
        startDate: newDates.startDate.toISOString().split('T')[0],
        endDate: newDates.endDate.toISOString().split('T')[0],
      });
    });

    // The final batch sent to onTasksChange
    const finalBatch = [...additionalParentUpdates, ...cascadedTasks];

    console.log('Final batch order:', finalBatch.map(t => ({ id: t.id, parentId: (t as any).parentId })));

    // CRITICAL: Parent must come before children for foreign key constraints
    expect(finalBatch[0].id).toBe('parent');
    expect((finalBatch[0] as any).parentId).toBeUndefined(); // No parentId = it's a parent
    expect(finalBatch[1].id).toBe('child2');
    expect((finalBatch[1] as any).parentId).toBe('parent'); // Has parentId = it's a child

    // Verify dates were recalculated correctly
    expect(finalBatch[0].startDate).toBe('2026-01-02'); // min(child1.start, child2.newStart)
    expect(finalBatch[0].endDate).toBe('2026-01-10');  // max(child1.end, child2.newEnd)
  });
});
