/**
 * Integration test for parent task moving children through handleTaskChange
 *
 * This test simulates the full flow: parent task moved -> handleTaskChange -> batch sent to onTasksChange
 */
import { describe, it, expect } from 'vitest';
import { cascadeByLinks, computeParentDates } from '../utils/dependencyUtils';
import type { Task } from '../types';

describe('Parent move children through handleTaskChange integration', () => {
  it('should verify the full batch structure', () => {
    const tasks: Task[] = [
      { id: 'parent', name: 'Parent', startDate: '2026-01-01', endDate: '2026-01-10' },
      { id: 'child1', name: 'Child 1', startDate: '2026-01-02', endDate: '2026-01-04', parentId: 'parent' },
    ];

    // Simulate what handleTaskChange does
    const updatedTask = {
      id: 'parent',
      name: 'Parent',
      startDate: '2026-01-06',
      endDate: '2026-01-15',
    };

    const newStart = new Date(updatedTask.startDate);
    const newEnd = new Date(updatedTask.endDate);

    const cascadedTasks = [updatedTask, ...cascadeByLinks(updatedTask.id, newStart, newEnd, tasks)];

    console.log('Full cascadedTasks (including parent):', cascadedTasks.map(t => ({
      id: t.id,
      name: t.name,
      start: t.startDate,
      end: t.endDate,
    })));

    // Verify the batch structure
    expect(cascadedTasks.length).toBe(2); // parent + child1
    expect(cascadedTasks[0].id).toBe('parent');
    expect(cascadedTasks[1].id).toBe('child1');

    // Verify dates
    expect(cascadedTasks[0].startDate).toBe('2026-01-06');
    expect(cascadedTasks[0].endDate).toBe('2026-01-15');
    expect(cascadedTasks[1].startDate).toBe('2026-01-07');
    expect(cascadedTasks[1].endDate).toBe('2026-01-09');
  });

  it('should simulate handleTaskChange parent update logic', () => {
    const tasks: Task[] = [
      { id: 'parent', name: 'Parent', startDate: '2026-01-01', endDate: '2026-01-10' },
      { id: 'child1', name: 'Child 1', startDate: '2026-01-02', endDate: '2026-01-04', parentId: 'parent' },
      { id: 'child2', name: 'Child 2', startDate: '2026-01-05', endDate: '2026-01-08', parentId: 'parent' },
    ];

    const updatedTask = {
      id: 'parent',
      name: 'Parent',
      startDate: '2026-01-06', // Moved 5 days forward
      endDate: '2026-01-15',
    };

    const newStart = new Date(updatedTask.startDate);
    const newEnd = new Date(updatedTask.endDate);

    // Step 1: Get cascaded tasks (children moved by delta)
    const cascadedTasks = [updatedTask, ...cascadeByLinks(updatedTask.id, newStart, newEnd, tasks)];

    console.log('Step 1 - cascadedTasks:', cascadedTasks.map(t => ({ id: t.id, start: t.startDate, end: t.endDate })));

    // Step 2: Build changedTasks map (what handleTaskChange does)
    const changedTasks = new Map(cascadedTasks.map(t => [t.id, t]));

    console.log('Step 2 - changedTasks keys:', Array.from(changedTasks.keys()));

    // Step 3: Collect parent IDs to update
    const parentIdsToUpdate = new Set<string>();
    cascadedTasks.forEach(task => {
      if ((task as any).parentId) {
        parentIdsToUpdate.add((task as any).parentId);
      }
    });

    console.log('Step 3 - parentIdsToUpdate:', Array.from(parentIdsToUpdate));

    // Step 4: Process parent updates (FIXED - update in place, don't add duplicate)
    parentIdsToUpdate.forEach(parentId => {
      const parentTask = tasks.find(t => t.id === parentId);
      if (!parentTask) return;

      // If the moved task IS the parent, update its progress in cascadedTasks
      // (don't add to additionalParentUpdates to avoid duplicate with old dates)
      if (parentId === updatedTask.id) {
        console.log('[Step 4] Moved task IS a parent - updating progress in cascadedTasks');
        const parentInCascaded = cascadedTasks.find(t => t.id === parentId);
        if (parentInCascaded) {
          (parentInCascaded as any).progress = 50; // Mock progress value
        }
        return;
      }

      // For other parents, recalc dates and progress from children
      console.log('[Step 4] Other parent - recalc dates from children', { parentId });
      const tempTasks = tasks.map(t => changedTasks.get(t.id) ?? t);
      const newDates = computeParentDates(parentId, tempTasks);
      // Would add to additionalParentUpdates here
    });

    // Step 5: Final batch (should only have cascadedTasks, no duplicates)
    const finalBatch = cascadedTasks; // No additionalParentUpdates for the moved parent

    console.log('Step 5 - Final batch:', finalBatch.map(t => ({ id: t.id, start: t.startDate, end: t.endDate })));

    // Verify: The final batch should contain parent and both children (no duplicates)
    expect(finalBatch.length).toBe(3);
    expect(finalBatch.filter(t => t.id === 'parent').length).toBe(1); // Only ONE parent entry
    expect(finalBatch.some(t => t.id === 'child1')).toBe(true);
    expect(finalBatch.some(t => t.id === 'child2')).toBe(true);

    // Verify dates are correct
    const parentInBatch = finalBatch.find(t => t.id === 'parent')!;
    expect(parentInBatch.startDate).toBe('2026-01-06');
    expect(parentInBatch.endDate).toBe('2026-01-15');
  });
});
