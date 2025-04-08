import { computed, toValue, type MaybeRefOrGetter } from "@vue/reactivity";
import { useWindowsIsScreenLocked } from "./useWindowsIsScreenLocked.ts";
import { useLinuxIsScreenLocked } from "./useLinuxIsScreenLocked.ts";

type ScreenLockDetectionOptions = { windows: { interval: number } };

export const useIsScreenLocked = (
  options: MaybeRefOrGetter<ScreenLockDetectionOptions>
) => {
  if (process.platform === "win32") {
    return useWindowsIsScreenLocked(
      computed(() => toValue(options).windows.interval)
    );
  }

  if (process.platform === "linux") {
    return useLinuxIsScreenLocked();
  }

  throw new Error(
    `Unsupported platform for screen lock detection: ${process.platform}`
  );
};
