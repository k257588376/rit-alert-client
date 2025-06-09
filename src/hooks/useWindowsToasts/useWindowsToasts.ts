import { onScopeDispose } from "@vue/reactivity";
import { spawn } from "node:child_process";
import { copyFileSync, mkdtempSync } from "node:fs";
import { EOL, tmpdir } from "node:os";
import path from "node:path";
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
  const directory = mkdtempSync(path.join(tmpdir(), "rit-alert-"));
  const scriptPath = path.resolve(directory, "./toast.ps1");

  copyFileSync(path.resolve(import.meta.dirname!, "./toast.ps1"), scriptPath);

  const toast = spawn("pwsh", [
    "-NoProfile",
    "-NoLogo",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    scriptPath,
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
