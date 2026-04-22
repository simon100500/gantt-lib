import { type CapabilityTask } from './createCapabilityTasks';
import { createCapabilityTasks, createEmptyCapabilityTasks } from './createCapabilityTasks';

export const createStorybookTasks = (anchorDate = '2026-04-20'): CapabilityTask[] =>
  createCapabilityTasks({ anchorDate });

export const createEmptyStorybookTasks = (): CapabilityTask[] =>
  createEmptyCapabilityTasks();
