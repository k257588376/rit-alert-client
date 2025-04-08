import {
  type MaybeRefOrGetter,
  type EffectScope,
  watch,
  toRef,
  toValue,
  effectScope,
} from "@vue/reactivity";

export function watchEffectScope(
  triggerRef: MaybeRefOrGetter<boolean>,
  callback: () => void
): void {
  let scope: EffectScope | null = null;

  watch(
    toRef(triggerRef),
    (newValue: boolean) => {
      if (toValue(triggerRef)) {
        // Start a new effectScope if it's true
        scope = effectScope();
        scope.run(callback);
      } else {
        // Stop and dispose of the effectScope if it's false
        if (scope) {
          scope.stop();
          scope = null;
        }
      }
    },
    { immediate: true }
  );
}
