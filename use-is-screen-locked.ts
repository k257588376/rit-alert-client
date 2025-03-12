import { getLogger } from "@logtape/logtape";
import {
  effect,
  onEffectCleanup,
  ref,
  toValue,
  type MaybeRefOrGetter,
} from "@vue/reactivity";
import { exec } from "child_process";

const log = getLogger(["rit.alert", "useIsScreenLocked"]);

export const useIsScreenLocked = (checkInterval: MaybeRefOrGetter<number>) => {
  const isLocked = ref(false);

  const check = () => {
    exec(`pwsh -Command "Get-Process -Name LogonUI"`, (err) => {
      isLocked.value = !err;

      log.debug`Checked: ${isLocked.value}`;
    });
  };

  effect(() => {
    log.debug`Setting interval: ${toValue(checkInterval)}`;

    const id = setInterval(check, toValue(checkInterval));

    onEffectCleanup(() => clearInterval(id));
  });

  return isLocked;
};
