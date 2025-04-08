import {
  type MaybeRefOrGetter,
  type EffectScope,
  watch,
  effectScope,
} from "@vue/reactivity";

export function watchArrayEffectScope<T, K>(
  arrayRef: MaybeRefOrGetter<T[]>,
  getKey: (item: T) => K,
  callback: (item: T) => void
): void {
  const scopes = new Map<K, EffectScope>();

  watch(
    arrayRef,
    (newArray) => {
      const newKeys = new Set(newArray.map(getKey));

      // Stop and remove scopes for items that no longer exist
      for (const [key, scope] of scopes) {
        if (!newKeys.has(key)) {
          scope.stop();
          scopes.delete(key);
        }
      }

      // Add new items and create new effect scopes
      for (const item of newArray) {
        const key = getKey(item);
        if (!scopes.has(key)) {
          const scope = effectScope();
          scope.run(() => callback(item));
          scopes.set(key, scope);
        }
      }
    },
    { deep: true }
  );
}
