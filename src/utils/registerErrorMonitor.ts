import { dispose } from "@logtape/logtape";
import { execFileSync } from "node:child_process";
import os from "node:os";
import process from "node:process";
import { logger } from "../logger.ts";
import { flattenError } from "./flattenError.ts";

export const registerErrorMonitor = () => {
  globalThis.addEventListener("unhandledrejection", async (error) => {
    logger.fatal`Uncaught Exception:\n${error.reason}`;
    if (process.platform === "win32") {
      execFileSync("msg", [os.userInfo().username], {
        input: `RIT.Alert proccess ${error.cancelable} exited: \n${flattenError(
          error.reason
        )}`,
      });
    }

    if (process.platform === "linux") {
      execFileSync("zenity", [
        "--error",
        "--title",
        "RIT.Alert Error",
        "--text",
        `RIT.Alert proccess exited: \n${flattenError(error.reason)}`,
      ]);
    }

    error.preventDefault();
    await dispose();
    process.exit(1);
  });
};
