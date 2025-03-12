import {
  effect,
  onScopeDispose,
  ref,
  toRef,
  toValue,
  watch,
  type MaybeRefOrGetter,
} from "@vue/reactivity";
import { createEventHook } from "./createEventHook.ts";
import type { AccessGrantedEvent } from "./types.ts";
import { ErrorEvent, EventSource } from "eventsource";

export const useEventSource = (url: MaybeRefOrGetter<string>) => {
  const initES = () => new EventSource(toValue(url));
  const es = ref(initES());

  watch(toRef(url), () => {
    es.value.close();
    es.value = initES();
  });

  onScopeDispose(()=> es.value.close())

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

  const { on: onError, trigger: triggerError } = createEventHook<ErrorEvent>();

  effect(() => {
    es.value.addEventListener("error", (event) => {
      if (event instanceof ErrorEvent) {
        triggerError(event);
      }
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
  }
};
