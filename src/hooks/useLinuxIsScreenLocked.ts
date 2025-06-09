import { ref } from "@vue/reactivity";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { logger } from "../logger.ts";

const log = logger.getChild("useLinuxIsScreenLocked");

export const useLinuxIsScreenLocked = () => {
  const isLocked = ref(false);

  const monitor = spawn(`dbus-monitor`, [
    "--session",
    "type=signal,interface=org.gnome.ScreenSaver",
  ]);

  const reader = createInterface({
    input: monitor.stdout,
    crlfDelay: Infinity,
  });

  monitor.addListener("error", (err) => {
    log.error`An error happened during 'dbus-monitor' invocation: ${err}`;
  });

  monitor.stderr.addListener("data", (data) => {
    log.error`"dbus-monitor stderr: ${data}"`;
  });

  reader.on("line", (line) => {
    if (line.includes("boolean true")) {
      isLocked.value = true;
    } else if (line.includes("boolean false")) {
      isLocked.value = false;
    }
    // ignore
  });

  return isLocked;
};
