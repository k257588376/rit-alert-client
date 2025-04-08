import { onScopeDispose } from "@vue/reactivity";
import { spawn } from "child_process";
import { EOL } from "os";
import path from "path";
import { type Toast, toXmlString } from "powertoast";
import { logger } from "../../logger.ts";

const log = logger.getChild("useNotifications");

export type WindowsNotificationOptions = Omit<
  Toast["options"],
  "expiration"
> & {
  // true by default
  transient?: boolean;
};

export const useWindowsNotifications = () => {
  const toast = spawn("pwsh", [
    "-NoProfile",
    "-NoLogo",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    path.resolve(import.meta.dirname, "./toast.ps1"),
  ]);

  toast.stdin.setDefaultEncoding("utf8");
  toast.stdout.addListener(
    "data",
    (buffer) => log.info`Chunk: ${buffer.toString()}`
  );

  toast.stderr.addListener(
    "data",
    (buffer) => log.error`Error: ${buffer.toString()}`
  );

  onScopeDispose(() => {
    toast.stdin.end();
    toast.disconnect();
  });

  return function notify(options: WindowsNotificationOptions) {
    toast.stdin.write(
      toXmlString(options) +
        EOL +
        new Date(
          options.transient !== false ? Date.now() + 10_000 : 0
        ).toISOString() +
        EOL
    );
  };
};
