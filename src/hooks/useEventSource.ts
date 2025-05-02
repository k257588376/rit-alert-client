import {
  effect,
  type MaybeRefOrGetter,
  onScopeDispose,
  ref,
  toRef,
  toValue,
  watch,
} from "@vue/reactivity";
import { logger } from "../logger.ts";
import { createEventHook } from "../utils/createEventHook.ts";
import type { AccessGrantedEvent } from "./useConfig.ts";

const log = logger.getChild("useEventSource");

export const useEventSource = (url: MaybeRefOrGetter<string>) => {
  const initES = () => new EventSource(toValue(url));
  const es = ref(initES());

  watch(toRef(url), () => {
    log.debug`Recreating EventSource for ${toValue(url)}`;
    es.value.close();
    es.value = initES();
  });

  onScopeDispose(() => {
    log.debug`Closing EventSource on ScopeDispose`;
    es.value.close();
  });

  const { on: onAccessGranted, trigger: triggerAccessGranted } =
    createEventHook<AccessGrantedEvent>();

  effect(() => {
    es.value.addEventListener("accessGranted", (event) => {
      let data;

      try {
        data = JSON.parse(event.data) as AccessGrantedEvent;
      } catch (e) {
        console.error("Error happened during `accessGranted` JSON.parse", e);
        return;
      }

      triggerAccessGranted(data);
    });
  });

  const { on: onConnected, trigger: triggerConnected } = createEventHook();
  effect(() => {
    es.value.addEventListener("open", () => triggerConnected());
  });

  const { on: onError, trigger: triggerError } = createEventHook<Event>();
  effect(() => {
    es.value.addEventListener("error", (event) => {
      triggerError(event);
    });
  });

  const { on: onAlert, trigger: triggerAlert } = createEventHook<string>();
  effect(() => {
    es.value.addEventListener("alert", (event) => triggerAlert(event.data));
  });

  return {
    es,
    onAccessGranted,
    onConnected,
    onError,
    onAlert,
  };
};
