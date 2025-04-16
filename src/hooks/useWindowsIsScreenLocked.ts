import {
  computed,
  effect,
  type MaybeRefOrGetter,
  onEffectCleanup,
  ref,
  toValue,
} from "@vue/reactivity";
import { execFile } from "node:child_process";
import os from "node:os";
import { logger } from "../logger.ts";

const log = logger.getChild("useWindowsIsScreenLocked");

export const useWindowsIsScreenLocked = (
  checkInterval: MaybeRefOrGetter<number>
) => {
  const isLocked = ref(false);
  const isUserLoggedOut = ref(false);

  const check = () => {
    execFile("pwsh", ["-Command", "Get-Process -Name LogonUI"], (err) => {
      isLocked.value = !err;

      log.debug`isLocked: ${isLocked.value}`;
    });

    execFile("query", ["user", os.userInfo().username], (_err, data) => {
      const line = data
        .split("\n")
        .map((line) => line.replaceAll(/\s\s+/g, "\t").split("\t"))
        .slice(0, -1)
        .at(1);

      // >e.kulbeda console 1 Active none 27.03.2025 9:36
      isUserLoggedOut.value =
        line == null || (line[3] !== "Active" && line[3] !== "Активно");

      log.debug`isUserLoggedOut: ${isLocked.value}`;
    });
  };

  effect(() => {
    log.debug`Setting interval: ${toValue(checkInterval)}`;

    const id = setInterval(check, toValue(checkInterval));

    onEffectCleanup(() => clearInterval(id));
  });

  return computed(() => isLocked.value || isUserLoggedOut.value);
};
