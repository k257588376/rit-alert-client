import { getLogger } from "@logtape/logtape";
import { onScopeDispose } from "@vue/reactivity";
import { spawn } from "child_process";
import { EOL } from "os";
import path from "path";
import { type Toast, toXmlString } from "powertoast";

const log = getLogger(["rit.alert", "useNotifications"]);


export const useNotifications = () => {
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

  return function notify(options: Toast["options"]) {
    toast.stdin.write(
      toXmlString(options) +
        EOL +
        new Date(options.expiration ?? 0).toISOString() +
        EOL
    );
  };
};
