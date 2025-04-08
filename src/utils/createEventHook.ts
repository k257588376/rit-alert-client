/**
 * https://github.com/vueuse/vueuse/blob/ac72c11372dfd791abbfe3449f912d92d3e50dd7/packages/shared/createEventHook/index.ts
 *
 * The source code for this function was inspired by vue-apollo's `useEventHook` util
 * https://github.com/vuejs/vue-apollo/blob/v4/packages/vue-apollo-composable/src/util/useEventHook.ts
 */

import { onScopeDispose } from "@vue/reactivity";

// https://stackoverflow.com/questions/55541275/typescript-check-for-the-any-type
export type IfAny<T, Y, N> = 0 extends 1 & T ? Y : N;
/**
 * will return `true` if `T` is `any`, or `false` otherwise
 */
export type IsAny<T> = IfAny<T, true, false>;

// any extends void = true
// so we need to check if T is any first
type Callback<T> = IsAny<T> extends true
  ? (...param: any) => void
  : [T] extends [void]
  ? (...param: unknown[]) => void
  : [T] extends [any[]]
  ? (...param: T) => void
  : (...param: [T, ...unknown[]]) => void;

export type EventHookOn<T = any> = (fn: Callback<T>) => { off: () => void };
export type EventHookOff<T = any> = (fn: Callback<T>) => void;
export type EventHookTrigger<T = any> = (
  ...param: Parameters<Callback<T>>
) => Promise<unknown[]>;

export interface EventHook<T = any> {
  on: EventHookOn<T>;
  off: EventHookOff<T>;
  trigger: EventHookTrigger<T>;
  clear: () => void;
}

/**
 * Utility for creating event hooks
 *
 * @see https://vueuse.org/createEventHook
 */
export function createEventHook<T = any>(): EventHook<T> {
  const fns: Set<Callback<T>> = new Set();

  const off = (fn: Callback<T>) => {
    fns.delete(fn);
  };

  const clear = () => {
    fns.clear();
  };

  const on = (fn: Callback<T>) => {
    fns.add(fn);
    const offFn = () => off(fn);

    onScopeDispose(offFn, true);

    return {
      off: offFn,
    };
  };

  const trigger: EventHookTrigger<T> = (...args) => {
    return Promise.all(Array.from(fns).map((fn) => fn(...args)));
  };

  return {
    on,
    off,
    trigger,
    clear,
  };
}
