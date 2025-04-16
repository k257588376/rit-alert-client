import { onEffectCleanup } from "@vue/reactivity";

export const useOnEffectCleanupAbortController = () => {
  const controller = new AbortController();
  onEffectCleanup(() => controller.abort(), true);

  return controller;
};
