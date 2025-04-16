import { onScopeDispose } from "@vue/reactivity";
import { execFile, execFileSync, spawn } from "node:child_process";
import { createInterface } from "node:readline/promises";
import semver from "semver";
import { logger } from "../../logger.ts";

const log = logger.getChild("useLinuxNotifications");

export type LinuxNotification = {
  summary: string;
  description?: string;
  appName?: string;
  ungency?: "low" | "normal" | "critical";
  icon?: string;
  transient?: boolean;
  actions?: {
    name: string;
    callback: () => void;
  }[];
};

const defaults = {
  appName: "RIT.Alert",
  icon: "help-about",
  ungency: "normal",
  transient: true,
} satisfies Partial<LinuxNotification>;

export const useLinuxNotifications = () => {
  const vOutput = execFileSync("notify-send", ["-v"]).toString("utf8");
  log.debug`Output of 'notify-send -v': ${vOutput}`;

  const v = vOutput.split(" ")[1];

  if (!semver.valid(v)) {
    log.fatal`Invalid semver of 'notify-send': ${v}`;
    throw new Error("Invalid semver of 'notify-send'");
  }

  if (semver.gt(v, "0.7.9")) {
    let lastNotificationId: string | null = null;

    return function notify(options: LinuxNotification) {
      const opts = { ...defaults, ...options };
      const args: string[] = ["-p"];

      if (lastNotificationId) args.push("-r", lastNotificationId);
      if (opts.appName) args.push("-a", opts.appName);
      if (opts.icon) args.push("-i", opts.icon);
      if (opts.ungency) args.push("-u", opts.ungency);
      if (opts.transient) args.push("-e");

      if (options.actions?.length) {
        for (const action of options.actions) {
          args.push("-A", action.name);
        }
      }

      args.push(opts.summary);
      if (opts.description) args.push(opts.description);

      const proc = spawn("notify-send", args);

      const reader = createInterface({
        input: proc.stdout,
        crlfDelay: Infinity,
      });

      proc.addListener("error", (err) => {
        log.error`An error happened during 'notify-send' invocation: ${err}`;
      });

      proc.stderr.addListener("data", (data) => {
        log.error`"notify-send stderr: ${data}"`;
      });

      let id: string | null = null;
      reader.on("line", (line) => {
        if (!id) {
          id = lastNotificationId = line;
        }

        if (opts.actions) {
          opts.actions[Number(line)]?.callback();
        }
      });

      onScopeDispose(() => {
        proc.disconnect();
      });
    };
  }

  return function notify(options: LinuxNotification) {
    const opts = { ...defaults, ...options };
    const args: string[] = [];

    if (opts.appName) args.push("-a", opts.appName);
    if (opts.icon) args.push("-i", opts.icon);
    if (opts.ungency) args.push("-u", opts.ungency);
    if (opts.transient) args.push("-h", "int:transient:1");

    args.push(opts.summary);
    if (opts.description) args.push(opts.description);

    execFile("notify-send", args, (err, stdout, stderr) => {
      if (err) {
        log.error`An error happened during 'notify-send' invocation: ${err}\nstdout:\n${stdout}\nstderr:\n${stderr}`;
      }
    });
  };
};
