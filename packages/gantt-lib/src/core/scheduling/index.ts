/**
 * Core scheduling module — runtime-agnostic scheduling logic.
 * Zero React/DOM/date-fns dependencies.
 */
export * from './types';
export * from './dateMath';
export * from './dependencies';
export * from './cascade';
export * from './commands';
export * from './execute';
export * from './validation';
export * from './hierarchy';

// UI adapter functions — re-exported for backward compatibility.
// Consumers should migrate to importing from '../adapters/scheduling' instead.
/** @deprecated Import from '../adapters/scheduling' instead */
export { resolveDateRangeFromPixels, clampDateRangeForIncomingFS } from '../../adapters/scheduling';
