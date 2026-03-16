'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { detectEdgeZone } from '../utils/geometry';
import type { Task, TaskDependency, LinkType } from '../types';
import { calculateSuccessorDate, getSuccessorChain, getTransitiveCascadeChain, recalculateIncomingLags, getChildren, isTaskParent, cascadeByLinks, universalCascade, computeLagFromDates } from '../utils/dependencyUtils';

/**
 * Get transitive closure of successors for cascading.
 *
 * For proper cascading in mixed link type chains (e.g., A--FS-->B--SS-->C),
 * we need to include cascaded tasks' successors regardless of link type.
 *
 * The chain is:
 * 1. Direct successors of the dragged task, filtered by firstLevelLinkTypes
 * 2. ALL successors (any type) of those tasks, recursively
 *
 * @param draggedTaskId - ID of the task being dragged
 * @param allTasks - All tasks in the chart
 * @param firstLevelLinkTypes - Link types to use for direct successors
 * @returns Array of tasks in the cascade chain (transitive closure)
 */
/**
 * Global drag manager that persists across HMR
 *
 * This singleton manages active drag operations at the module level,
 * ensuring that drag state survives React Fast Refresh (HMR).
 *
 * The key insight: When HMR occurs during a drag operation:
 * 1. The component unmounts and its useEffect cleanup removes window listeners
 * 2. The component remounts with fresh refs (isDraggingRef = false)
 * 3. But the user is still holding the mouse button!
 * 4. Without module-level state, the drag operation is orphaned
 *
 * Solution: Store active drag state in module-level singleton and
 * use a global cleanup effect to always handle mouseup/mousemove.
 */
interface ActiveDragState {
  taskId: string;
  mode: 'move' | 'resize-left' | 'resize-right';
  startX: number;
  initialLeft: number;
  initialWidth: number;
  currentLeft: number;
  currentWidth: number;
  dayWidth: number;
  monthStart: Date;
  onProgress: (left: number, width: number) => void;
  onComplete: (finalLeft: number, finalWidth: number) => void;
  onCancel: () => void;
  allTasks: Task[];
  disableConstraints?: boolean;
  cascadeChain: Task[];        // FS+SS+FF+SF successors of dragged task (Phase 10: added SF)
  cascadeChainFS: Task[];      // FS-only successors (part of resize-right cascade with FF)
  cascadeChainStart: Task[];   // SS+SF successors (resize-left cascade) - Phase 10: renamed from cascadeChainSS
  cascadeChainEnd: Task[];     // FS+FF successors (resize-right cascade) - Phase 9
  hierarchyChain: Task[];      // Phase 19: children of parent task (for cascade drag)
  onCascadeProgress?: (overrides: Map<string, { left: number; width: number }>) => void;
}

let globalActiveDrag: ActiveDragState | null = null;
let globalRafId: number | null = null;

/**
 * Complete the active drag operation
 */
function completeDrag() {
  if (globalRafId !== null) {
    cancelAnimationFrame(globalRafId);
    globalRafId = null;
  }

  if (globalActiveDrag) {
    // Clear cascade overrides before completing (avoids stale preview positions)
    globalActiveDrag.onCascadeProgress?.(new Map());
    const { onComplete, currentLeft, currentWidth } = globalActiveDrag;
    globalActiveDrag = null;
    onComplete(currentLeft, currentWidth);
  }
}

/**
 * Cancel the active drag operation
 */
function cancelDrag() {
  if (globalRafId !== null) {
    cancelAnimationFrame(globalRafId);
    globalRafId = null;
  }

  if (globalActiveDrag) {
    const { onCancel } = globalActiveDrag;
    globalActiveDrag = null;
    onCancel();
  }
}

/**
 * Snap pixel value to grid (day boundaries)
 */
function snapToGrid(pixels: number, dayWidth: number): number {
  return Math.round(pixels / dayWidth) * dayWidth;
}

/**
 * Check if a task move would violate dependency constraints
 * Only blocks move operations, not resize (per requirements)
 */
function canMoveTask(
  task: Task,
  newStartDate: Date,
  newEndDate: Date,
  allTasks: Task[]
): { allowed: boolean; reason?: string } {
  if (!task.dependencies || task.dependencies.length === 0) {
    return { allowed: true };
  }

  // For each predecessor, check if the new position respects the constraint
  for (const dep of task.dependencies) {
    const predecessor = allTasks.find(t => t.id === dep.taskId);
    if (!predecessor) continue;

    const predecessorStart = new Date(predecessor.startDate);
    const predecessorEnd = new Date(predecessor.endDate);

    // Calculate expected date based on link type (lag ignored, always 0)
    const expectedDate = calculateSuccessorDate(
      predecessorStart,
      predecessorEnd,
      dep.type,
      0  // lag not used in calculations
    );

    // Check constraint based on link type
    const targetIsStart = dep.type.endsWith('S');
    const targetDate = targetIsStart ? newStartDate : newEndDate;

    // Allow move if target date is on or after expected date
    // (give 1-day tolerance for rounding)
    const dayDiff = (targetDate.getTime() - expectedDate.getTime()) / (24 * 60 * 60 * 1000);

    if (dayDiff < -1) {
      return {
        allowed: false,
        reason: `Would violate ${dep.type} dependency from "${predecessor.name}"`
      };
    }
  }

  return { allowed: true };
}

/**
 * Recalculate lag values for incoming dependencies after drag completion.
 *
 * Lag formulas:
 * - FS: lag = startB - endA (can be negative)
 * - SS: lag = startB - startA (floor at 0)
 * - FF: lag = endB - endA (can be negative)
 * - SF: lag = endB - startA (ceiling at 0)
 */
/**
 * Global mouse move handler - attached once and persists across HMR
 */
function handleGlobalMouseMove(e: MouseEvent) {
  if (!globalActiveDrag || globalRafId !== null) {
    return;
  }

  globalRafId = requestAnimationFrame(() => {
    if (!globalActiveDrag) {
      globalRafId = null;
      return;
    }

    const activeDrag = globalActiveDrag;

    const { startX, initialLeft, initialWidth, mode, dayWidth, onProgress, allTasks } = activeDrag;
    const deltaX = e.clientX - startX;

    let newLeft = initialLeft;
    let newWidth = initialWidth;

    switch (mode) {
      case 'move':
        newLeft = snapToGrid(initialLeft + deltaX, dayWidth);
        break;
      case 'resize-left':
        const snappedLeft = snapToGrid(initialLeft + deltaX, dayWidth);
        newLeft = snappedLeft;
        const rightEdge = initialLeft + initialWidth;
        newWidth = Math.max(dayWidth, rightEdge - snappedLeft);
        break;
      case 'resize-right':
        const snappedWidth = snapToGrid(initialWidth + deltaX, dayWidth);
        newWidth = Math.max(dayWidth, snappedWidth);
        break;
    }

    // Hard mode: check left-move boundary against predecessor.startDate (Phase 7)
    // Child can move left until its startDate would go before predecessor.startDate
    // Also applies to resize-left: the left edge cannot cross the predecessor's start date
    if ((mode === 'move' || mode === 'resize-left') && allTasks.length > 0 && !activeDrag.disableConstraints) {
      const currentTask = allTasks.find(t => t.id === activeDrag.taskId);
      if (currentTask && currentTask.dependencies && currentTask.dependencies.length > 0) {
        let minAllowedLeft = -Infinity; // in pixels from monthStart; -Infinity means no floor unless a real FS/SS predecessor sets one
        for (const dep of currentTask.dependencies) {
          if (dep.type !== 'FS' && dep.type !== 'SS') continue; // Phase 8: FS and SS
          const predecessor = activeDrag.allTasks.find(t => t.id === dep.taskId);
          if (!predecessor) continue;
          // Boundary: child.startDate >= predecessor.startDate (allows negative lag)
          const predStart = new Date(predecessor.startDate as string);
          const predStartOffset = Math.round(
            (Date.UTC(predStart.getUTCFullYear(), predStart.getUTCMonth(), predStart.getUTCDate()) -
              Date.UTC(
                activeDrag.monthStart.getUTCFullYear(),
                activeDrag.monthStart.getUTCMonth(),
                activeDrag.monthStart.getUTCDate()
              )) / (24 * 60 * 60 * 1000)
          );
          const predStartLeft = Math.round(predStartOffset * activeDrag.dayWidth);
          minAllowedLeft = Math.max(minAllowedLeft, predStartLeft);
        }
        // Clamp: don't let task go left of boundary
        newLeft = Math.max(minAllowedLeft, newLeft);
      }
      // For resize-left, after clamping newLeft the right edge is fixed so newWidth must be recomputed
      if (mode === 'resize-left') {
        const rightEdge = activeDrag.initialLeft + activeDrag.initialWidth;
        newWidth = Math.max(activeDrag.dayWidth, rightEdge - newLeft);
      }
    }

    // Phase 10: SF constraint: endB <= startA (lag ceiling at 0)
    // Applies when B is moved right or resized-right
    if ((mode === 'move' || mode === 'resize-right') && allTasks.length > 0 && !activeDrag.disableConstraints) {
      const currentTask = allTasks.find(t => t.id === activeDrag.taskId);
      if (currentTask && currentTask.dependencies && currentTask.dependencies.length > 0) {
        for (const dep of currentTask.dependencies) {
          if (dep.type !== 'SF') continue;
          const predecessor = activeDrag.allTasks.find(t => t.id === dep.taskId);
          if (!predecessor) continue;
          const predStart = new Date(predecessor.startDate as string);
          const predStartOffset = Math.round(
            (Date.UTC(predStart.getUTCFullYear(), predStart.getUTCMonth(), predStart.getUTCDate()) -
              Date.UTC(activeDrag.monthStart.getUTCFullYear(), activeDrag.monthStart.getUTCMonth(), activeDrag.monthStart.getUTCDate()))
            / (24 * 60 * 60 * 1000)
          );
          const predStartLeft = Math.round(predStartOffset * activeDrag.dayWidth);

          // SF lag=0 boundary: B's visual end = day before A's start (adjacent = lag 0)
          // B.right (exclusive pixel) = predStartLeft at lag=0
          const sfBoundaryRight = predStartLeft;
          if (mode === 'move') {
            // Move mode: when B would hit startA constraint, stop movement entirely
            const proposedEndRight = newLeft + activeDrag.initialWidth;
            if (proposedEndRight > sfBoundaryRight) {
              newLeft = Math.max(activeDrag.initialLeft, sfBoundaryRight - activeDrag.initialWidth);
            }
          } else {
            // Resize-right mode: clamp width so endB = startA (lag=0)
            const currentEndRight = newLeft + newWidth;
            if (currentEndRight > sfBoundaryRight) {
              newWidth = Math.max(activeDrag.dayWidth, sfBoundaryRight - newLeft);
            }
          }
        }
      }
    }

    const draggedTask = allTasks.find(t => t.id === activeDrag.taskId);
    const isParentDrag = draggedTask ? isTaskParent(draggedTask.id, allTasks) : false;

    // Phase 9: select chain based on drag mode
    // move: all FS+SS+FF+SF successors follow
    // resize-right: FS+FF successors (endA changes, SS/SF unaffected)
    // resize-left: SS+SF successors only (startA changes, FS/FF unaffected)
    // Phase 10: added SF
    // Phase 19: merge hierarchy chain with dependency chain
    let activeChain =
      mode === 'resize-right' ? activeDrag.cascadeChainEnd :    // FS + FF
      mode === 'resize-left'  ? activeDrag.cascadeChainStart :  // SS + SF
      /* move */                activeDrag.cascadeChain;         // FS + SS + FF + SF

    // Phase 19: Merge hierarchy chain with dependency chain
    // Both systems work together: unique task IDs to prevent duplicates
    if (activeDrag.hierarchyChain.length > 0) {
      const chainIds = new Set(activeChain.map(t => t.id));
      const hierarchyTasks = activeDrag.hierarchyChain.filter(t => !chainIds.has(t.id));
      activeChain = [...activeChain, ...hierarchyTasks];
    }

    // Track which tasks are parents in the hierarchy chain (for special positioning)
    const hierarchyParents = new Set<string>();
    activeDrag.hierarchyChain.forEach(t => {
      if (isTaskParent(t.id, allTasks)) {
        hierarchyParents.add(t.id);
      }
    });

    // Parent drags need full constraint-based propagation via descendants, not
    // just direct successors of the parent task itself.
    if (isParentDrag &&
        !activeDrag.disableConstraints &&
        activeDrag.onCascadeProgress) {
      const previewStartDate = new Date(Date.UTC(
        activeDrag.monthStart.getUTCFullYear(),
        activeDrag.monthStart.getUTCMonth(),
        activeDrag.monthStart.getUTCDate() + Math.round(newLeft / activeDrag.dayWidth)
      ));
      const previewDurationDays = Math.round(newWidth / activeDrag.dayWidth) - 1;
      const previewEndDate = new Date(Date.UTC(
        activeDrag.monthStart.getUTCFullYear(),
        activeDrag.monthStart.getUTCMonth(),
        activeDrag.monthStart.getUTCDate() + Math.round(newLeft / activeDrag.dayWidth) + previewDurationDays
      ));

      const cascadedPreviewTasks = cascadeByLinks(
        activeDrag.taskId,
        previewStartDate,
        previewEndDate,
        allTasks
      );

      // DEBUG: Initial drag info
      const draggedTask = allTasks.find(t => t.id === activeDrag.taskId);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`🎬 [DRAG START] Task: ${activeDrag.taskId} (${draggedTask?.name})`);
      console.log(`   isParentDrag: ${isParentDrag}`);
      console.log(`   Preview: ${previewStartDate.toISOString().slice(0,10)} - ${previewEndDate.toISOString().slice(0,10)}`);
      console.log(`   newLeft: ${newLeft}, newWidth: ${newWidth}`);
      console.log(`   cascadedPreviewTasks: ${cascadedPreviewTasks.map(t => `${t.id}(${t.name})`).join(', ')}`);

      if (cascadedPreviewTasks.length > 0) {
        const overrides = new Map<string, { left: number; width: number }>();

        for (const chainTask of cascadedPreviewTasks) {
          const chainStart = new Date(chainTask.startDate as string);
          const chainEnd = new Date(chainTask.endDate as string);
          const chainStartOffset = Math.round(
            (Date.UTC(chainStart.getUTCFullYear(), chainStart.getUTCMonth(), chainStart.getUTCDate()) -
              Date.UTC(
                activeDrag.monthStart.getUTCFullYear(),
                activeDrag.monthStart.getUTCMonth(),
                activeDrag.monthStart.getUTCDate()
              )) / (24 * 60 * 60 * 1000)
          );
          const chainEndOffset = Math.round(
            (Date.UTC(chainEnd.getUTCFullYear(), chainEnd.getUTCMonth(), chainEnd.getUTCDate()) -
              Date.UTC(
                activeDrag.monthStart.getUTCFullYear(),
                activeDrag.monthStart.getUTCMonth(),
                activeDrag.monthStart.getUTCDate()
              )) / (24 * 60 * 60 * 1000)
          );

          overrides.set(chainTask.id, {
            left: Math.round(chainStartOffset * activeDrag.dayWidth),
            width: Math.round((chainEndOffset - chainStartOffset + 1) * activeDrag.dayWidth),
          });
        }

        // Sync cascade parents: if a cascaded task is a child, update its parent's position
        const cascadeParentIds = new Set<string>();
        for (const chainTask of cascadedPreviewTasks) {
          const pid = (chainTask as any).parentId as string | undefined;
          if (pid && !overrides.has(pid)) {
            cascadeParentIds.add(pid);
          }
        }
        // Also add the dragged task itself if it's a parent - we need to cascade its successors
        // after its position is updated by cascade parent sync
        if (isTaskParent(activeDrag.taskId, allTasks)) {
          cascadeParentIds.add(activeDrag.taskId);
        }
        for (const pid of cascadeParentIds) {
          const parentTask = allTasks.find(t => t.id === pid);
          if (!parentTask || parentTask.locked) continue;
          const children = getChildren(pid, allTasks);
          if (children.length === 0) continue;
          let minChildStart = Infinity;
          let maxChildEnd = -Infinity;

          // For the dragged parent, children move by delta (drag amount)
          // For other parents, use their cascade-computed positions
          const isDraggedParent = pid === activeDrag.taskId;
          const deltaDays = isDraggedParent
            ? Math.round((newLeft - activeDrag.initialLeft) / activeDrag.dayWidth)
            : 0;

          for (const child of children) {
            if (overrides.has(child.id)) {
              const ov = overrides.get(child.id)!;
              const childStartDay = Math.round(ov.left / activeDrag.dayWidth);
              const childEndDay = Math.round((ov.left + ov.width) / activeDrag.dayWidth) - 1;
              minChildStart = Math.min(minChildStart, childStartDay);
              maxChildEnd = Math.max(maxChildEnd, childEndDay);
            } else {
              const childStart = new Date(child.startDate as string);
              const childEnd = new Date(child.endDate as string);
              let childStartOffset = Math.round(
                (Date.UTC(childStart.getUTCFullYear(), childStart.getUTCMonth(), childStart.getUTCDate()) -
                  Date.UTC(activeDrag.monthStart.getUTCFullYear(), activeDrag.monthStart.getUTCMonth(), activeDrag.monthStart.getUTCDate()))
                / (24 * 60 * 60 * 1000)
              );
              let childEndOffset = Math.round(
                (Date.UTC(childEnd.getUTCFullYear(), childEnd.getUTCMonth(), childEnd.getUTCDate()) -
                  Date.UTC(activeDrag.monthStart.getUTCFullYear(), activeDrag.monthStart.getUTCMonth(), activeDrag.monthStart.getUTCDate()))
                / (24 * 60 * 60 * 1000)
              );

              // For dragged parent's children, apply delta to get NEW positions
              if (isDraggedParent && deltaDays !== 0) {
                childStartOffset += deltaDays;
                childEndOffset += deltaDays;
              }

              minChildStart = Math.min(minChildStart, childStartOffset);
              maxChildEnd = Math.max(maxChildEnd, childEndOffset);
            }
          }
          if (minChildStart !== Infinity) {
            const newParentLeft = Math.round(minChildStart * activeDrag.dayWidth);
            const newParentWidth = Math.round((maxChildEnd - minChildStart + 1) * activeDrag.dayWidth);
            overrides.set(pid, {
              left: newParentLeft,
              width: newParentWidth,
            });

            // DEBUG: Log parent sync for g2 (Земляные работы) and g3 (Фундамент)
            if (pid === 'g2' || pid === 'g3') {
              const newParentStartDay = minChildStart;
              const newParentEndDay = maxChildEnd;
              const parentTask = allTasks.find(t => t.id === pid);
              console.log(`📊 [PARENT SYNC] ${pid} (${parentTask?.name})`);
              console.log(`   isDraggedParent: ${isDraggedParent}, deltaDays: ${deltaDays}`);
              console.log(`   Children processed: ${children.length}`);
              children.forEach(c => {
                const inOverrides = overrides.has(c.id);
                console.log(`   - ${c.id} (${c.name}): inOverrides=${inOverrides}`);
              });
              console.log(`   NEW position: day ${newParentStartDay} to ${newParentEndDay} (left=${newParentLeft}, width=${newParentWidth})`);
            }
          }
        }

        // Cascade successors of the updated parents
        // After a parent's position is synced with its children, we need to
        // update any tasks that depend on this parent (the parent's successors)
        const cascadeSuccessorsOfParent = (
          parentId: string,
          parentStart: Date,
          parentEnd: Date,
          allTasks: Task[],
          dayWidth: number,
          monthStart: Date
        ): Map<string, { left: number; width: number }> => {
          const overrides = new Map<string, { left: number; width: number }>();
          const visited = new Set<string>();
          const queue: string[] = [];

          // Find direct successors of parentId
          for (const task of allTasks) {
            if (task.locked) continue;
            if (visited.has(task.id)) continue;

            const depOnParent = task.dependencies?.find(d => d.taskId === parentId);
            if (!depOnParent) continue;

            // Calculate new position for successor using effective lag from dates
            const origStart = new Date(task.startDate as string);
            const origEnd = new Date(task.endDate as string);
            const parentOrigTask = allTasks.find(t => t.id === parentId);
            const predOrigStart = parentOrigTask ? new Date(parentOrigTask.startDate as string) : parentStart;
            const predOrigEnd   = parentOrigTask ? new Date(parentOrigTask.endDate   as string) : parentEnd;
            const effectiveLag  = computeLagFromDates(depOnParent.type, predOrigStart, predOrigEnd, origStart, origEnd);

            const constraintDate = calculateSuccessorDate(
              parentStart,
              parentEnd,
              depOnParent.type,
              effectiveLag
            );
            const durationMs = origEnd.getTime() - origStart.getTime();

            let newStart: Date;
            let newEnd: Date;

            if (depOnParent.type === 'FS' || depOnParent.type === 'SS') {
              newStart = constraintDate;
              newEnd = new Date(constraintDate.getTime() + durationMs);
            } else {
              // FF or SF
              newEnd = constraintDate;
              newStart = new Date(constraintDate.getTime() - durationMs);
            }

            // Convert to pixels
            const startOffset = Math.round(
              (Date.UTC(newStart.getUTCFullYear(), newStart.getUTCMonth(), newStart.getUTCDate()) -
                Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), monthStart.getUTCDate()))
                / (24 * 60 * 60 * 1000)
            );
            const endOffset = Math.round(
              (Date.UTC(newEnd.getUTCFullYear(), newEnd.getUTCMonth(), newEnd.getUTCDate()) -
                Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), monthStart.getUTCDate()))
                / (24 * 60 * 60 * 1000)
            );

            overrides.set(task.id, {
              left: Math.round(startOffset * dayWidth),
              width: Math.round((endOffset - startOffset + 1) * dayWidth)
            });

            // DEBUG: Log successor calculation
            if (parentId === 'g2' || parentId === 'g3') {
              console.log(`🔗 [SUCCESSOR] ${task.id} (${task.name}) depends on ${parentId}`);
              console.log(`   Dependency: ${depOnParent.type} lag=${depOnParent.lag ?? 0}`);
              console.log(`   Parent: ${parentStart.toISOString().slice(0,10)} - ${parentEnd.toISOString().slice(0,10)}`);
              console.log(`   Constraint date: ${constraintDate.toISOString().slice(0,10)}`);
              console.log(`   NEW position: day ${startOffset} to ${endOffset} (left=${Math.round(startOffset * dayWidth)}, width=${Math.round((endOffset - startOffset + 1) * dayWidth)})`);
            }

            visited.add(task.id);
            queue.push(task.id);
          }

          // Transitive closure: successors of successors
          while (queue.length > 0) {
            const currentId = queue.shift()!;
            const currentTask = allTasks.find(t => t.id === currentId);
            if (!currentTask || currentTask.locked) continue;

            const currentStart = new Date(
              overrides.has(currentId)
                ? new Date(Date.UTC(
                    monthStart.getUTCFullYear(),
                    monthStart.getUTCMonth(),
                    monthStart.getUTCDate() + Math.round(overrides.get(currentId)!.left / dayWidth)
                  ))
                : currentTask.startDate
            );
            const currentEnd = new Date(
              overrides.has(currentId)
                ? new Date(Date.UTC(
                    monthStart.getUTCFullYear(),
                    monthStart.getUTCMonth(),
                    monthStart.getUTCDate() + Math.round((overrides.get(currentId)!.left + overrides.get(currentId)!.width) / dayWidth) - 1
                  ))
                : currentTask.endDate
            );

            // Find successors of currentId
            for (const task of allTasks) {
              if (task.locked || visited.has(task.id)) continue;

              const depOnCurrent = task.dependencies?.find(d => d.taskId === currentId);
              if (!depOnCurrent) continue;

              // Calculate new position using effective lag from dates
              const origStart = new Date(task.startDate as string);
              const origEnd = new Date(task.endDate as string);
              const predOrigTask = allTasks.find(t => t.id === currentId);
              const predOrigS = predOrigTask ? new Date(predOrigTask.startDate as string) : currentStart;
              const predOrigE = predOrigTask ? new Date(predOrigTask.endDate   as string) : currentEnd;
              const effLag = computeLagFromDates(depOnCurrent.type, predOrigS, predOrigE, origStart, origEnd);

              const constraintDate = calculateSuccessorDate(
                currentStart,
                currentEnd,
                depOnCurrent.type,
                effLag
              );
              const durationMs = origEnd.getTime() - origStart.getTime();

              let newStart: Date;
              let newEnd: Date;

              if (depOnCurrent.type === 'FS' || depOnCurrent.type === 'SS') {
                newStart = constraintDate;
                newEnd = new Date(constraintDate.getTime() + durationMs);
              } else {
                newEnd = constraintDate;
                newStart = new Date(constraintDate.getTime() - durationMs);
              }

              // Convert to pixels
              const startOffset = Math.round(
                (Date.UTC(newStart.getUTCFullYear(), newStart.getUTCMonth(), newStart.getUTCDate()) -
                  Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), monthStart.getUTCDate()))
                  / (24 * 60 * 60 * 1000)
              );
              const endOffset = Math.round(
                (Date.UTC(newEnd.getUTCFullYear(), newEnd.getUTCMonth(), newEnd.getUTCDate()) -
                  Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), monthStart.getUTCDate()))
                  / (24 * 60 * 60 * 1000)
              );

              overrides.set(task.id, {
                left: Math.round(startOffset * dayWidth),
                width: Math.round((endOffset - startOffset + 1) * dayWidth)
              });

              visited.add(task.id);
              queue.push(task.id);
            }
          }

          return overrides;
        };

        // Apply successor cascading for each updated parent
        console.log('🚀 [CASCADE SUCCESSORS] Starting...');
        console.log(`   cascadeParentIds: ${Array.from(cascadeParentIds).join(', ')}`);
        console.log(`   overrides before: ${Array.from(overrides.keys()).join(', ')}`);

        for (const [pid, parentOverride] of overrides) {
          if (cascadeParentIds.has(pid)) {
            const parentStartDay = Math.round(parentOverride.left / activeDrag.dayWidth);
            const parentEndDay = Math.round((parentOverride.left + parentOverride.width) / activeDrag.dayWidth) - 1;
            const parentStart = new Date(Date.UTC(
              activeDrag.monthStart.getUTCFullYear(),
              activeDrag.monthStart.getUTCMonth(),
              activeDrag.monthStart.getUTCDate() + parentStartDay
            ));
            const parentEnd = new Date(Date.UTC(
              activeDrag.monthStart.getUTCFullYear(),
              activeDrag.monthStart.getUTCMonth(),
              activeDrag.monthStart.getUTCDate() + parentEndDay
            ));

            // DEBUG: Log before cascadeSuccessorsOfParent
            if (pid === 'g2' || pid === 'g3') {
              const parentTask = allTasks.find(t => t.id === pid);
              console.log(`🎯 [CASCADE PARENT] ${pid} (${parentTask?.name})`);
              console.log(`   Position from overrides: left=${parentOverride.left}, width=${parentOverride.width}`);
              console.log(`   Date range: ${parentStart.toISOString().slice(0,10)} - ${parentEnd.toISOString().slice(0,10)}`);
            }

            const successorOverrides = cascadeSuccessorsOfParent(
              pid,
              parentStart,
              parentEnd,
              allTasks,
              activeDrag.dayWidth,
              activeDrag.monthStart
            );

            // DEBUG: Log after cascadeSuccessorsOfParent
            if (pid === 'g2' || pid === 'g3') {
              console.log(`   Successors found: ${Array.from(successorOverrides.keys()).join(', ')}`);
            }

            successorOverrides.forEach((v, k) => overrides.set(k, v));
          }
        }

        // Final pass: sync parents of ALL cascaded tasks in overrides
        let pSyncChanged = true;
        let pSyncIter = 0;
        while (pSyncChanged && pSyncIter < 10) {
          pSyncChanged = false;
          pSyncIter++;
          for (const [taskId] of overrides) {
            const task = allTasks.find(t => t.id === taskId);
            const pid = task ? (task as any).parentId as string | undefined : undefined;
            if (!pid) continue;
            const parentTask = allTasks.find(t => t.id === pid);
            if (!parentTask || parentTask.locked) continue;
            const children = getChildren(pid, allTasks);
            if (children.length === 0) continue;

            let minS = Infinity;
            let maxE = -Infinity;
            for (const child of children) {
              if (overrides.has(child.id)) {
                const ov = overrides.get(child.id)!;
                minS = Math.min(minS, Math.round(ov.left / activeDrag.dayWidth));
                maxE = Math.max(maxE, Math.round((ov.left + ov.width) / activeDrag.dayWidth) - 1);
              } else {
                const cs = new Date(child.startDate as string);
                const ce = new Date(child.endDate as string);
                const cso = Math.round(
                  (Date.UTC(cs.getUTCFullYear(), cs.getUTCMonth(), cs.getUTCDate()) -
                    Date.UTC(activeDrag.monthStart.getUTCFullYear(), activeDrag.monthStart.getUTCMonth(), activeDrag.monthStart.getUTCDate()))
                  / (24 * 60 * 60 * 1000)
                );
                const ceo = Math.round(
                  (Date.UTC(ce.getUTCFullYear(), ce.getUTCMonth(), ce.getUTCDate()) -
                    Date.UTC(activeDrag.monthStart.getUTCFullYear(), activeDrag.monthStart.getUTCMonth(), activeDrag.monthStart.getUTCDate()))
                  / (24 * 60 * 60 * 1000)
                );
                minS = Math.min(minS, cso);
                maxE = Math.max(maxE, ceo);
              }
            }

            if (minS !== Infinity) {
              const npl = Math.round(minS * activeDrag.dayWidth);
              const npw = Math.round((maxE - minS + 1) * activeDrag.dayWidth);
              const prev = overrides.get(pid);
              if (!prev || prev.left !== npl || prev.width !== npw) {
                overrides.set(pid, { left: npl, width: npw });
                pSyncChanged = true;
              }
            }
          }
        }

        activeDrag.onCascadeProgress(overrides);
      }
    // Hard mode cascade: emit position overrides for successor chain members
    } else if ((mode === 'move' || mode === 'resize-right' ||
                (mode === 'resize-left' && activeDrag.cascadeChainStart.length > 0)) &&
               !activeDrag.disableConstraints &&
               activeChain.length > 0 &&
               activeDrag.onCascadeProgress) {
      // For move/resize-left: delta from left (startA shift)
      // For resize-right: delta from width (endA shift, startA fixed)
      const deltaDays = mode === 'resize-right'
        ? Math.round((newWidth - activeDrag.initialWidth) / activeDrag.dayWidth)
        : Math.round((newLeft - activeDrag.initialLeft) / activeDrag.dayWidth);
      const overrides = new Map<string, { left: number; width: number }>();
      const draggedTaskId = activeDrag.taskId;
      const dayWidth = activeDrag.dayWidth;
      const monthStart = activeDrag.monthStart;

      for (const chainTask of activeChain) {
        // Phase 11: locked tasks cannot be moved by cascade
        if (chainTask.locked) continue;

        const chainStart = new Date(chainTask.startDate as string);
        const chainEnd = new Date(chainTask.endDate as string);
        const chainStartOffset = Math.round(
          (Date.UTC(chainStart.getUTCFullYear(), chainStart.getUTCMonth(), chainStart.getUTCDate()) -
            Date.UTC(
              monthStart.getUTCFullYear(),
              monthStart.getUTCMonth(),
              monthStart.getUTCDate()
            )) / (24 * 60 * 60 * 1000)
        );
        const chainEndOffset = Math.round(
          (Date.UTC(chainEnd.getUTCFullYear(), chainEnd.getUTCMonth(), chainEnd.getUTCDate()) -
            Date.UTC(
              monthStart.getUTCFullYear(),
              monthStart.getUTCMonth(),
              monthStart.getUTCDate()
            )) / (24 * 60 * 60 * 1000)
        );
        const chainDuration = Math.round(
          (Date.UTC(chainEnd.getUTCFullYear(), chainEnd.getUTCMonth(), chainEnd.getUTCDate()) -
            Date.UTC(chainStart.getUTCFullYear(), chainStart.getUTCMonth(), chainStart.getUTCDate())
          ) / (24 * 60 * 60 * 1000)
        );

        // Phase 9: Check if this chainTask has FF dependency on dragged task
        // For FF tasks, calculate position from end offset (not start offset)
        // This fixes negative lag preview where child starts before parent
        // Phase 10: SF tasks also position from end offset (endB constrained to startA)
        const hasFFDepOnDragged = chainTask.dependencies?.some(
          dep => dep.taskId === draggedTaskId && dep.type === 'FF'
        );
        const hasSFDepOnDragged = chainTask.dependencies?.some(
          dep => dep.taskId === draggedTaskId && dep.type === 'SF'
        );

        let chainLeft;
        let chainWidth;
        if (hierarchyParents.has(chainTask.id)) {
          // Phase 19 fix: Parent task in hierarchy chain - compute from all children
          // Parent position = min(children.start) to max(children.end)
          const children = getChildren(chainTask.id, allTasks);
          if (children.length > 0) {
            let minChildStart = Infinity;
            let maxChildEnd = -Infinity;

            children.forEach(child => {
              let childStartOffset: number;
              let childEndOffset: number;

              // If this child is the dragged task, use current drag position (newLeft)
              if (child.id === draggedTaskId) {
                const currentLeftInDays = Math.round(newLeft / dayWidth);
                const currentWidthInDays = Math.round(newWidth / dayWidth) - 1; // -1 for inclusive
                childStartOffset = currentLeftInDays;
                childEndOffset = currentLeftInDays + currentWidthInDays;
              } else if (activeChain.some(c => c.id === child.id)) {
                // Child is being cascaded (moved by same delta)
                const childStart = new Date(child.startDate as string);
                const childEnd = new Date(child.endDate as string);
                const origStartOffset = Math.round(
                  (Date.UTC(childStart.getUTCFullYear(), childStart.getUTCMonth(), childStart.getUTCDate()) -
                    Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), monthStart.getUTCDate()))
                    / (24 * 60 * 60 * 1000)
                );
                const origEndOffset = Math.round(
                  (Date.UTC(childEnd.getUTCFullYear(), childEnd.getUTCMonth(), childEnd.getUTCDate()) -
                    Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), monthStart.getUTCDate()))
                    / (24 * 60 * 60 * 1000)
                );
                childStartOffset = origStartOffset + deltaDays;
                childEndOffset = origEndOffset + deltaDays;
              } else {
                // Child not being moved - use original position
                const childStart = new Date(child.startDate as string);
                const childEnd = new Date(child.endDate as string);
                childStartOffset = Math.round(
                  (Date.UTC(childStart.getUTCFullYear(), childStart.getUTCMonth(), childStart.getUTCDate()) -
                    Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), monthStart.getUTCDate()))
                    / (24 * 60 * 60 * 1000)
                );
                childEndOffset = Math.round(
                  (Date.UTC(childEnd.getUTCFullYear(), childEnd.getUTCMonth(), childEnd.getUTCDate()) -
                    Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), monthStart.getUTCDate()))
                    / (24 * 60 * 60 * 1000)
                );
              }

              minChildStart = Math.min(minChildStart, childStartOffset);
              maxChildEnd = Math.max(maxChildEnd, childEndOffset);
            });

            chainLeft = Math.round(minChildStart * dayWidth);
            chainWidth = Math.round((maxChildEnd - minChildStart + 1) * dayWidth);
          } else {
            // No children - use original position
            chainLeft = Math.round(chainStartOffset * dayWidth);
            chainWidth = Math.round((chainDuration + 1) * dayWidth);
          }
        } else if (hasFFDepOnDragged || hasSFDepOnDragged) {
          // FF/SF: position based on end date shift, then back up by duration
          // This works correctly even when child starts before parent (negative lag)
          // For SF: endB shifts with startA, then back up by duration
          chainLeft = Math.round((chainEndOffset + deltaDays - chainDuration) * dayWidth);
          chainWidth = Math.round((chainDuration + 1) * dayWidth);
        } else if (activeDrag.hierarchyChain.some(h => h.id === chainTask.id)) {
          // Phase 19: Hierarchy chain - children move with parent by same delta
          // Position based on start date shift (same as FS/SS move mode)
          chainLeft = Math.round((chainStartOffset + deltaDays) * dayWidth);
          chainWidth = Math.round((chainDuration + 1) * dayWidth);
        } else {
          // FS/SS: position based on start date shift
          chainLeft = Math.round((chainStartOffset + deltaDays) * dayWidth);
          chainWidth = Math.round((chainDuration + 1) * dayWidth);
        }

        // SS lag floor: when A moves left, B follows but chainLeft cannot go below A's new position
        // This keeps lag >= 0 (startB >= startA) during live drag preview
        // Phase 9: Only apply floor to SS tasks, not FF (FF allows negative lag)
        // Phase 10: SF uses end-based positioning, no floor needed
        const hasSSDepOnDragged = chainTask.dependencies?.some(
          dep => dep.taskId === draggedTaskId && dep.type === 'SS'
        );
        if (hasSSDepOnDragged && (mode === 'move' || mode === 'resize-left')) {
          chainLeft = Math.max(chainLeft, newLeft);
        }

        overrides.set(chainTask.id, { left: chainLeft, width: chainWidth });
      }

      // CRITICAL FIX: Add dragged child to overrides BEFORE parent sync
      // When dragging a child, the draggedChild itself is NOT in activeChain
      // (activeChain = cascadeChain (successors) + hierarchyChain (parent))
      // Without this, parent sync uses the child's original position instead of newLeft/newWidth
      if (!overrides.has(draggedTaskId)) {
        overrides.set(draggedTaskId, { left: newLeft, width: newWidth });
      }

      // DEBUG: Log for child drag
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`🎬 [CHILD DRAG] Task: ${activeDrag.taskId}`);
      console.log(`   deltaDays: ${deltaDays}`);
      console.log(`   hierarchyChain: ${activeDrag.hierarchyChain.map(t => `${t.id}(${t.name})`).join(', ')}`);
      console.log(`   draggedChild added to overrides: ${draggedTaskId} (left=${newLeft}, width=${newWidth})`);

      // Cascade parent sync for hierarchy chain
      // When a child task moves, its parent position may need to update
      // Then successors of that parent need to update too
      const cascadeParentIds = new Set<string>();

      // Find parents of all tasks in overrides (includes dragged child and hierarchy chain)
      for (const [taskId, override] of overrides) {
        const task = allTasks.find(t => t.id === taskId);
        if (!task) continue;
        const pid = (task as any).parentId as string | undefined;
        if (pid && !cascadeParentIds.has(pid) && !overrides.has(pid)) {
          cascadeParentIds.add(pid);
        }
      }

      // Also check hierarchy chain for parents
      console.log(`   Checking hierarchyChain (${activeDrag.hierarchyChain.length} tasks):`);
      for (const hTask of activeDrag.hierarchyChain) {
        const pid = (hTask as any).parentId as string | undefined;
        const isParent = isTaskParent(hTask.id, allTasks);
        const inOverrides = overrides.has(hTask.id);
        console.log(`   - ${hTask.id} (${hTask.name}): parentId=${pid}, isParent=${isParent}, inOverrides=${inOverrides}`);

        if (pid && !cascadeParentIds.has(pid) && !overrides.has(pid)) {
          cascadeParentIds.add(pid);
          console.log(`     Added parent ${pid} to cascadeParentIds`);
        }
        // IMPORTANT: Add hierarchy chain parent tasks to cascadeParentIds
        // even if they're already in overrides - we need to cascade their successors!
        if (isParent && !cascadeParentIds.has(hTask.id)) {
          cascadeParentIds.add(hTask.id);
          console.log(`     Added hTask itself ${hTask.id} to cascadeParentIds (is parent, inOverrides=${inOverrides})`);
        }
      }

      console.log(`   cascadeParentIds: ${Array.from(cascadeParentIds).join(', ')}`);

      // Sync parent positions based on their children
      for (const pid of cascadeParentIds) {
        const parentTask = allTasks.find(t => t.id === pid);
        if (!parentTask || parentTask.locked) continue;
        const children = getChildren(pid, allTasks);
        if (children.length === 0) continue;
        let minChildStart = Infinity;
        let maxChildEnd = -Infinity;

        for (const child of children) {
          if (overrides.has(child.id)) {
            const ov = overrides.get(child.id)!;
            const childStartDay = Math.round(ov.left / dayWidth);
            const childEndDay = Math.round((ov.left + ov.width) / dayWidth) - 1;
            minChildStart = Math.min(minChildStart, childStartDay);
            maxChildEnd = Math.max(maxChildEnd, childEndDay);
          } else {
            const childStart = new Date(child.startDate as string);
            const childEnd = new Date(child.endDate as string);
            const childStartOffset = Math.round(
              (Date.UTC(childStart.getUTCFullYear(), childStart.getUTCMonth(), childStart.getUTCDate()) -
                Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), monthStart.getUTCDate()))
              / (24 * 60 * 60 * 1000)
            );
            const childEndOffset = Math.round(
              (Date.UTC(childEnd.getUTCFullYear(), childEnd.getUTCMonth(), childEnd.getUTCDate()) -
                Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), monthStart.getUTCDate()))
              / (24 * 60 * 60 * 1000)
            );
            minChildStart = Math.min(minChildStart, childStartOffset);
            maxChildEnd = Math.max(maxChildEnd, childEndOffset);
          }
        }
        if (minChildStart !== Infinity) {
          const newParentLeft = Math.round(minChildStart * dayWidth);
          const newParentWidth = Math.round((maxChildEnd - minChildStart + 1) * dayWidth);
          overrides.set(pid, { left: newParentLeft, width: newParentWidth });

          // DEBUG: Log parent sync
          if (pid === 'g2' || pid === 'g3') {
            console.log(`📊 [PARENT SYNC CHILD DRAG] ${pid} (${parentTask?.name})`);
            console.log(`   Children: ${children.map(c => `${c.id}`).join(', ')}`);
            console.log(`   NEW position: day ${minChildStart} to ${maxChildEnd} (left=${newParentLeft}, width=${newParentWidth})`);
          }
        }
      }

      // Cascade successors of updated parents
      console.log('🚀 [CASCADE SUCCESSORS CHILD DRAG] Starting...');
      for (const [pid, parentOverride] of overrides) {
        if (cascadeParentIds.has(pid)) {
          const parentStartDay = Math.round(parentOverride.left / dayWidth);
          const parentEndDay = Math.round((parentOverride.left + parentOverride.width) / dayWidth) - 1;
          const parentStart = new Date(Date.UTC(
            monthStart.getUTCFullYear(),
            monthStart.getUTCMonth(),
            monthStart.getUTCDate() + parentStartDay
          ));
          const parentEnd = new Date(Date.UTC(
            monthStart.getUTCFullYear(),
            monthStart.getUTCMonth(),
            monthStart.getUTCDate() + parentEndDay
          ));

          // DEBUG: Log before cascade
          if (pid === 'g2' || pid === 'g3') {
            const parentTask = allTasks.find(t => t.id === pid);
            console.log(`🎯 [CASCADE PARENT CHILD DRAG] ${pid} (${parentTask?.name})`);
            console.log(`   Date range: ${parentStart.toISOString().slice(0,10)} - ${parentEnd.toISOString().slice(0,10)}`);
          }

          // Find and update successors
          for (const task of allTasks) {
            if (task.locked || overrides.has(task.id)) continue;
            const depOnParent = task.dependencies?.find(d => d.taskId === pid);
            if (!depOnParent) continue;

            const origStart = new Date(task.startDate as string);
            const origEnd = new Date(task.endDate as string);

            // Use effective lag from dates, not stored dep.lag
            const parentOrigTask = allTasks.find(t => t.id === pid);
            const predOrigStart = parentOrigTask ? new Date(parentOrigTask.startDate as string) : parentStart;
            const predOrigEnd   = parentOrigTask ? new Date(parentOrigTask.endDate   as string) : parentEnd;
            const effectiveLag  = computeLagFromDates(depOnParent.type, predOrigStart, predOrigEnd, origStart, origEnd);

            const constraintDate = calculateSuccessorDate(
              parentStart,
              parentEnd,
              depOnParent.type,
              effectiveLag
            );
            const durationMs = origEnd.getTime() - origStart.getTime();

            let newStart: Date;
            let newEnd: Date;

            if (depOnParent.type === 'FS' || depOnParent.type === 'SS') {
              newStart = constraintDate;
              newEnd = new Date(constraintDate.getTime() + durationMs);
            } else {
              newEnd = constraintDate;
              newStart = new Date(constraintDate.getTime() - durationMs);
            }

            const startOffset = Math.round(
              (Date.UTC(newStart.getUTCFullYear(), newStart.getUTCMonth(), newStart.getUTCDate()) -
                Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), monthStart.getUTCDate()))
                / (24 * 60 * 60 * 1000)
            );
            const endOffset = Math.round(
              (Date.UTC(newEnd.getUTCFullYear(), newEnd.getUTCMonth(), newEnd.getUTCDate()) -
                Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), monthStart.getUTCDate()))
                / (24 * 60 * 60 * 1000)
            );

            overrides.set(task.id, {
              left: Math.round(startOffset * dayWidth),
              width: Math.round((endOffset - startOffset + 1) * dayWidth)
            });

            // DEBUG: Log successor
            if (pid === 'g2' || pid === 'g3') {
              console.log(`🔗 [SUCCESSOR CHILD DRAG] ${task.id} (${task.name}) depends on ${pid}`);
              console.log(`   Dependency: ${depOnParent.type} lag=${depOnParent.lag ?? 0}`);
              console.log(`   Constraint: ${constraintDate.toISOString().slice(0,10)}`);
              console.log(`   NEW position: day ${startOffset} to ${endOffset}`);
            }
          }
        }
      }

      // Final pass: sync parents of ALL tasks in overrides
      // Cascaded tasks (e.g. g3-1 shifted as successor of g2) may have parents
      // (e.g. g3) that need to update their bounds in real-time.
      let parentSyncChanged = true;
      let parentSyncIterations = 0;
      while (parentSyncChanged && parentSyncIterations < 10) {
        parentSyncChanged = false;
        parentSyncIterations++;
        for (const [taskId] of overrides) {
          const task = allTasks.find(t => t.id === taskId);
          const pid = task ? (task as any).parentId as string | undefined : undefined;
          if (!pid) continue;
          const parentTask = allTasks.find(t => t.id === pid);
          if (!parentTask || parentTask.locked) continue;
          const children = getChildren(pid, allTasks);
          if (children.length === 0) continue;

          let minStart = Infinity;
          let maxEnd = -Infinity;
          for (const child of children) {
            if (overrides.has(child.id)) {
              const ov = overrides.get(child.id)!;
              minStart = Math.min(minStart, Math.round(ov.left / dayWidth));
              maxEnd = Math.max(maxEnd, Math.round((ov.left + ov.width) / dayWidth) - 1);
            } else {
              const cs = new Date(child.startDate as string);
              const ce = new Date(child.endDate as string);
              const cso = Math.round(
                (Date.UTC(cs.getUTCFullYear(), cs.getUTCMonth(), cs.getUTCDate()) -
                  Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), monthStart.getUTCDate()))
                / (24 * 60 * 60 * 1000)
              );
              const ceo = Math.round(
                (Date.UTC(ce.getUTCFullYear(), ce.getUTCMonth(), ce.getUTCDate()) -
                  Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), monthStart.getUTCDate()))
                / (24 * 60 * 60 * 1000)
              );
              minStart = Math.min(minStart, cso);
              maxEnd = Math.max(maxEnd, ceo);
            }
          }

          if (minStart !== Infinity) {
            const newPLeft = Math.round(minStart * dayWidth);
            const newPWidth = Math.round((maxEnd - minStart + 1) * dayWidth);
            const prev = overrides.get(pid);
            if (!prev || prev.left !== newPLeft || prev.width !== newPWidth) {
              overrides.set(pid, { left: newPLeft, width: newPWidth });
              parentSyncChanged = true;
            }
          }
        }
      }

      activeDrag.onCascadeProgress(overrides);
    }

    // Update current values in global state for completion
    activeDrag.currentLeft = newLeft;
    activeDrag.currentWidth = newWidth;

    onProgress(newLeft, newWidth);
    globalRafId = null;
  });
}

/**
 * Global mouse up handler - attached once and persists across HMR
 */
function handleGlobalMouseUp() {
  if (globalActiveDrag) {
    completeDrag();
  }
}

/**
 * Track whether global listeners are attached
 */
let globalListenersAttached = false;

/**
 * Ensure global listeners are attached (idempotent)
 */
function ensureGlobalListeners() {
  if (!globalListenersAttached) {
    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    globalListenersAttached = true;
  }
}

/**
 * Cleanup global listeners - called when no components are using drag
 * Note: In practice with HMR, we keep these attached for safety
 */
function cleanupGlobalListeners() {
  // We keep global listeners attached to handle orphaned drags after HMR
  // They will be cleaned up when the page is refreshed
}

/**
 * Options for useTaskDrag hook
 */
export interface UseTaskDragOptions {
  /** Unique identifier for the task */
  taskId: string;
  /** Initial start date of the task */
  initialStartDate: Date;
  /** Initial end date of the task */
  initialEndDate: Date;
  /** Start of the visible range (e.g., month start) */
  monthStart: Date;
  /** Width of each day in pixels */
  dayWidth: number;
  /** Callback when drag operation completes */
  onDragEnd?: (result: { id: string; startDate: Date; endDate: Date; updatedDependencies?: Task['dependencies'] }) => void;
  /** Callback for drag state changes (for parent components to render guide lines) */
  onDragStateChange?: (state: {
    isDragging: boolean;
    dragMode: 'move' | 'resize-left' | 'resize-right' | null;
    left: number;
    width: number;
  }) => void;
  /** Width of edge zones for resize detection (default: 12px) */
  edgeZoneWidth?: number;
  /** Array of all tasks for dependency validation */
  allTasks?: Task[];
  /** Row index of this task (for task lookup) */
  rowIndex?: number;
  /** Enable automatic scheduling of dependent tasks */
  enableAutoSchedule?: boolean;
  /** When true, dependency constraint checking is skipped during drag (default: false) */
  disableConstraints?: boolean;
  /** Callback for real-time cascade preview — called each RAF with non-dragged chain member positions */
  onCascadeProgress?: (overrides: Map<string, { left: number; width: number }>) => void;
  /** Callback when cascade completes — receives all shifted tasks including dragged task */
  onCascade?: (tasks: Task[]) => void;
  /** When true, all drag and resize interactions are disabled for this task */
  locked?: boolean;
}

/**
 * Return value from useTaskDrag hook
 */
export interface UseTaskDragReturn {
  /** Whether a drag operation is in progress */
  isDragging: boolean;
  /** Current drag mode (null when not dragging) */
  dragMode: 'move' | 'resize-left' | 'resize-right' | null;
  /** Current left position in pixels (updated during drag) */
  currentLeft: number;
  /** Current width in pixels (updated during drag) */
  currentWidth: number;
  /** Props to spread on the drag handle element */
  dragHandleProps: {
    onMouseDown: (e: React.MouseEvent) => void;
    style: React.CSSProperties;
  };
}

/**
 * Custom hook for managing task drag interactions
 *
 * HMR-SAFE: Uses module-level singleton to ensure drag state survives
 * React Fast Refresh. Window event listeners are attached once at module
 * level rather than per component instance.
 */
export const useTaskDrag = (options: UseTaskDragOptions): UseTaskDragReturn => {
  const {
    taskId,
    initialStartDate,
    initialEndDate,
    monthStart,
    dayWidth,
    onDragEnd,
    onDragStateChange,
    edgeZoneWidth = 12,
    allTasks = [],
    rowIndex,
    enableAutoSchedule = false,
    disableConstraints = false,
    onCascadeProgress,
    onCascade,
  } = options;

  // Track if this hook instance owns the current global drag
  const isOwnerRef = useRef<boolean>(false);
  const locked = options.locked ?? false;

  // Display state (triggers re-renders only when needed)
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragMode, setDragMode] = useState<'move' | 'resize-left' | 'resize-right' | null>(null);
  const [currentLeft, setCurrentLeft] = useState<number>(0);
  const [currentWidth, setCurrentWidth] = useState<number>(0);

  /**
   * Calculate initial pixel position from dates
   */
  const getInitialPosition = useCallback((): { left: number; width: number } => {
    const getUTCDayDifference = (date1: Date, date2: Date): number => {
      const ms1 = Date.UTC(
        date1.getUTCFullYear(),
        date1.getUTCMonth(),
        date1.getUTCDate()
      );
      const ms2 = Date.UTC(
        date2.getUTCFullYear(),
        date2.getUTCMonth(),
        date2.getUTCDate()
      );
      return Math.round((ms1 - ms2) / (1000 * 60 * 60 * 24));
    };

    const startOffset = getUTCDayDifference(initialStartDate, monthStart);
    const duration = getUTCDayDifference(initialEndDate, initialStartDate);

    const left = Math.round(startOffset * dayWidth);
    const width = Math.round((duration + 1) * dayWidth); // +1 to include end date

    return { left, width };
  }, [initialStartDate, initialEndDate, monthStart, dayWidth]);

  /**
   * Initialize position when dates or dayWidth changes.
   * Skipped when this instance owns an active drag to avoid overriding drag state.
   */
  useEffect(() => {
    if (isOwnerRef.current && globalActiveDrag) return;
    const { left, width } = getInitialPosition();
    setCurrentLeft(left);
    setCurrentWidth(width);
  }, [getInitialPosition]);

  /**
   * When monthStart changes during an active drag (e.g. a month is prepended),
   * the pixel coordinate origin shifts. Adjust globalActiveDrag so that
   * subsequent move calculations stay in the new coordinate space.
   */
  useEffect(() => {
    if (!isOwnerRef.current || !globalActiveDrag) return;
    const oldMonthStart = globalActiveDrag.monthStart;
    if (oldMonthStart === monthStart) return;
    const daysShift = Math.round(
      (Date.UTC(oldMonthStart.getUTCFullYear(), oldMonthStart.getUTCMonth(), oldMonthStart.getUTCDate()) -
        Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), monthStart.getUTCDate())) /
        (1000 * 60 * 60 * 24)
    );
    const pixelShift = daysShift * dayWidth;
    globalActiveDrag.initialLeft += pixelShift;
    globalActiveDrag.currentLeft += pixelShift;
    globalActiveDrag.monthStart = monthStart;
  }, [monthStart, dayWidth]);

  /**
   * Handle drag progress callback from global manager
   */
  const handleProgress = useCallback((left: number, width: number) => {
    setCurrentLeft(left);
    setCurrentWidth(width);

    if (onDragStateChange && isOwnerRef.current) {
      const mode = globalActiveDrag?.mode || null;
      onDragStateChange({
        isDragging: true,
        dragMode: mode,
        left,
        width,
      });
    }
  }, [onDragStateChange]);

  /**
   * Handle drag completion from global manager
   */
  const handleComplete = useCallback((finalLeft: number, finalWidth: number) => {
    const wasOwner = isOwnerRef.current;
    isOwnerRef.current = false;

    // Calculate new dates from final pixel values
    const dayOffset = Math.round(finalLeft / dayWidth);
    const durationDays = Math.round(finalWidth / dayWidth) - 1; // -1 because width includes end date

    const newStartDate = new Date(Date.UTC(
      monthStart.getUTCFullYear(),
      monthStart.getUTCMonth(),
      monthStart.getUTCDate() + dayOffset
    ));

    const newEndDate = new Date(Date.UTC(
      monthStart.getUTCFullYear(),
      monthStart.getUTCMonth(),
      monthStart.getUTCDate() + dayOffset + durationDays
    ));

    // Reset local state
    setIsDragging(false);
    setDragMode(null);

    // Notify parent of drag end
    if (onDragStateChange) {
      onDragStateChange({
        isDragging: false,
        dragMode: null,
        left: finalLeft,
        width: finalWidth,
      });
    }

    if (wasOwner) {
      if (!disableConstraints && onCascade && allTasks.length > 0) {
        // Hard mode with onCascade: use universalCascade for all cases
        // (parent drag, child drag, root task drag — all handled uniformly)
        const draggedTaskData = allTasks.find(t => t.id === taskId);

        const movedTask: Task = {
          ...(draggedTaskData ?? { id: taskId, name: '', startDate: '', endDate: '' }),
          startDate: newStartDate.toISOString(),
          endDate: newEndDate.toISOString(),
          ...(draggedTaskData?.dependencies && {
            dependencies: recalculateIncomingLags(draggedTaskData, newStartDate, newEndDate, allTasks),
          }),
        };

        const cascadeResult = universalCascade(movedTask, newStartDate, newEndDate, allTasks);

        if (cascadeResult.length > 0) {
          onCascade([movedTask, ...cascadeResult]);
          return; // Don't call onDragEnd — cascade covers the dragged task too
        }

        // No dependent tasks to cascade — still call onCascade with just the moved task
        // so the state update is consistent
        onCascade([movedTask]);
        return;
      }

      // Soft mode OR hard mode with no FS successors: call onDragEnd
      // Always recalculate lag so hard-mode drags (chain.length===0) also persist the new lag
      if (allTasks.length > 0 && onDragEnd) {
        const currentTaskData = allTasks.find(t => t.id === taskId);
        const updatedDependencies = currentTaskData?.dependencies
          ? recalculateIncomingLags(currentTaskData, newStartDate, newEndDate, allTasks)
          : undefined;
        onDragEnd({ id: taskId, startDate: newStartDate, endDate: newEndDate, updatedDependencies });
      } else if (onDragEnd) {
        onDragEnd({ id: taskId, startDate: newStartDate, endDate: newEndDate });
      }
    }
  }, [dayWidth, monthStart, onDragEnd, onDragStateChange, taskId, disableConstraints, onCascade, allTasks, initialStartDate, initialEndDate]);

  /**
   * Handle drag cancellation (e.g., if HMR orphaned the drag)
   */
  const handleCancel = useCallback(() => {
    isOwnerRef.current = false;
    setIsDragging(false);
    setDragMode(null);

    if (onDragStateChange) {
      onDragStateChange({
        isDragging: false,
        dragMode: null,
        left: currentLeft,
        width: currentWidth,
      });
    }
  }, [onDragStateChange, currentLeft, currentWidth]);

  /**
   * Cleanup on unmount - if this instance owns the drag, cancel it
   */
  useEffect(() => {
    return () => {
      if (isOwnerRef.current && globalActiveDrag) {
        // We're unmounting while owning the drag - cancel it
        cancelDrag();
      }
    };
  }, []);

  /**
   * Handle mouse down on drag handle
   */
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Phase 11: locked tasks cannot be dragged or resized
    if (locked) return;

    const target = e.currentTarget as HTMLElement;
    const edgeZone = detectEdgeZone(e.clientX, target, edgeZoneWidth);

    // Determine drag mode from edge zone
    let mode: 'move' | 'resize-left' | 'resize-right' | null = null;
    switch (edgeZone) {
      case 'left':
        mode = 'resize-left';
        break;
      case 'right':
        mode = 'resize-right';
        break;
      case 'move':
        mode = 'move';
        break;
    }

    // Phase 19: Parent tasks cannot be resized - their dates are computed from children
    // Force move mode for parent tasks to prevent resize operations
    if (mode === 'resize-left' || mode === 'resize-right') {
      const currentTask = allTasks.find(t => t.id === taskId);
      if (currentTask && isTaskParent(taskId, allTasks)) {
        mode = 'move';
      }
    }

    if (!mode) {
      return;
    }

    // Get current position from state (this is what we see on screen)
    const initialLeft = currentLeft;
    const initialWidth = currentWidth;

    // Mark this instance as the drag owner
    isOwnerRef.current = true;

    // Update display state
    setIsDragging(true);
    setDragMode(mode);

    // Notify parent of drag start
    if (onDragStateChange) {
      onDragStateChange({
        isDragging: true,
        dragMode: mode,
        left: initialLeft,
        width: initialWidth,
      });
    }

    // Ensure global listeners are attached (idempotent)
    ensureGlobalListeners();

    // Phase 19: Build hierarchy chain for real-time parent movement
    // When dragging a child: include parent so it moves with children
    // When dragging a parent: include all children so they move with parent
    const currentTask = allTasks.find(t => t.id === taskId);
    let hierarchyChain: Task[] = [];

    if (currentTask) {
      const taskParentId = (currentTask as any).parentId;
      if (taskParentId) {
        // Dragging a child - include parent for real-time updates
        const parentTask = allTasks.find(t => t.id === taskParentId);
        if (parentTask) {
          hierarchyChain.push(parentTask);
        }
      } else {
        // Dragging a parent - include all children
        hierarchyChain = getChildren(taskId, allTasks);
      }
    }

    // Store drag state in global singleton
    globalActiveDrag = {
      taskId,
      mode,
      startX: e.clientX,
      initialLeft,
      initialWidth,
      currentLeft: initialLeft, // Initially same as initial
      currentWidth: initialWidth, // Initially same as initial
      dayWidth,
      monthStart,
      onProgress: handleProgress,
      onComplete: handleComplete,
      onCancel: handleCancel,
      allTasks,
      disableConstraints,
      cascadeChain: !disableConstraints
        ? getTransitiveCascadeChain(taskId, allTasks, ['FS', 'SS', 'FF', 'SF'])   // all successors, used for move (Phase 10: added SF)
        : [],
      cascadeChainFS: !disableConstraints
        ? getTransitiveCascadeChain(taskId, allTasks, ['FS'])          // FS + transitive, used for resize-right
        : [],
      cascadeChainStart: !disableConstraints
        ? getTransitiveCascadeChain(taskId, allTasks, ['SS', 'SF'])    // SS + SF for resize-left cascade (Phase 10: renamed from cascadeChainSS)
        : [],
      cascadeChainEnd: !disableConstraints
        ? getTransitiveCascadeChain(taskId, allTasks, ['FS', 'FF'])    // FS + FF for resize-right cascade (Phase 9)
        : [],
      hierarchyChain, // Phase 19: children of parent task
      onCascadeProgress,
    };
  }, [edgeZoneWidth, currentLeft, currentWidth, dayWidth, monthStart, taskId, onDragStateChange, handleProgress, handleComplete, handleCancel, allTasks, disableConstraints, onCascadeProgress, onCascade, locked]);

  /**
   * Get cursor style based on current position
   */
  const getCursorStyle = useCallback((): string => {
    if (locked) return 'not-allowed';
    if (isDragging) {
      return 'grabbing';
    }
    return 'grab';
  }, [locked, isDragging]);

  return {
    isDragging,
    dragMode,
    currentLeft,
    currentWidth,
    dragHandleProps: {
      onMouseDown: handleMouseDown,
      style: {
        cursor: getCursorStyle(),
        userSelect: 'none',
      } as React.CSSProperties,
    },
  };
};
