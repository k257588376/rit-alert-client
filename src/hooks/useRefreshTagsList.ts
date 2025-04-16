import * as v from "valibot";
import {
  computed,
  effect,
  type MaybeRefOrGetter,
  type Ref,
  toValue,
} from "@vue/reactivity";
import { useOnEffectCleanupAbortController } from "./useOnEffectCleanupAbortController.ts";
import { logger } from "../logger.ts";

const log = logger.getChild("useRefreshTagList");
//
export const useRefreshTagList = (
  serverUrl: MaybeRefOrGetter<string | null>,
  tagsList: Ref<string[] | null>,
) => {
  const urlRef = computed(() => toValue(serverUrl));

  const refresh = async () => {
    log.debug`Refreshing tag list`;
    const url = urlRef.value;

    if (url) {
      const controller = useOnEffectCleanupAbortController();

      try {
        const req = await fetch(new URL("/info/tags", url), {
          signal: controller.signal,
        });
        const data = await req.json();

        if (v.is(v.array(v.string()), data)) {
          tagsList.value = data;
          log.debug`New tag list: ${data}`;
        }
      } catch (err) {
        log.error`An error happened during tag list refresh request: ${err}`;
      }
    }
  };

  effect(refresh);

  return { refresh };
};
