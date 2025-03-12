import { effectScope, ref, toRef, toValue, watch, type EffectScope, type MaybeRefOrGetter } from "@vue/reactivity";
import { useIsScreenLocked } from "./use-is-screen-locked.ts";
import { useEventSource } from "./use-event-source.ts";
import {
  ansiColorFormatter,
  configure,
  getConsoleSink,
  getLogger,
} from "@logtape/logtape";
import { execFileSync } from "child_process";
import { createToast, flattenError } from './utils.ts';

await configure({
  sinks: {
    console: getConsoleSink({
      formatter: process.stdout.isTTY ? ansiColorFormatter : undefined,
    }),
  },
  loggers: [
    { category: "rit.alert", lowestLevel: "debug", sinks: ["console"] },
    { category: ["rit.alert", "useIsScreenLocked"], lowestLevel: "info" },
  ],
});
const log = getLogger(["rit.alert"]);

log.info`Process pid: ${process.pid}`;

const esLink = ref(
  "http://172.17.110.105:8787/sse/accessGranted?tags=105,enterSide"
);

const scope = effectScope(true);
scope.run(() => {
  const isScreenLocked = useIsScreenLocked(() => 1000);

  const { onConnected, onError, onAccessGranted } = useEventSource(esLink);

  onConnected(() => {
    log.info`EventSource has connected successfully to ${esLink.value}`;
  });

  onError((error) => {
    log.info`An error occured in EventSource: ${error.message}, code: ${error.code}`;
  })

  onAccessGranted((data) => {
    if (isScreenLocked.value) {
      return log.debug("Skip exec script because screen is locked");
    }

    try {
      execFileSync(
        "C:\\Users\\e.kulbeda\\AppData\\Local\\Programs\\AutoHotkey\\v2\\AutoHotkey64.exe",
        ["C:\\Users\\e.kulbeda\\alert.rit\\Switch.ahk"]
      );

      createToast({
        message: `${data.door.side === "Enter" ? "Вошел" : "Вышел"} ${data.user.firstName} ${data.user.lastName} ${data.door.side === "Enter" ? "в" : "из"} ${data.door.name}`,
        expiration: 10,
      }).show();
    } catch (err) {
      log.error`Error happened when executing script: ${err}`;
    }
  });
});

function watchEffectScope(triggerRef: MaybeRefOrGetter<boolean>, callback: () => void): void {
  let scope: EffectScope | null = null;
  
  watch(toRef(triggerRef), (newValue: boolean) => {
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
  }, { immediate: true });
}

function watchArrayEffectScope<T, K>(
  arrayRef: MaybeRefOrGetter<T[]>,
  getKey: (item: T) => K,
  callback: (item: T) => void
): void {
  const scopes = new Map<K, EffectScope>();

  watch(arrayRef, (newArray) => {
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
  }, { deep: true });
}

let hasFatalError = false;

process.on("uncaughtException", async (error, origin) => {
  log.fatal`UncaughtException(${origin}):\n${error}`
  scope.stop()

  if (!hasFatalError) {
    hasFatalError = true;

    createToast({
      title: "Uncaught Exception",
      message: flattenError(error),
    }).show();

    setTimeout(() => process.exit(1), 2000); 
  }
});
