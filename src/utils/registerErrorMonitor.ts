import { execFileSync } from "child_process";
import { logger } from "../logger.ts";
import os from "node:os";
import { flattenError } from "./flattenError.ts";

export const registerErrorMonitor = () => {
  process.on("uncaughtExceptionMonitor", async (error, origin) => {
    logger.fatal`UncaughtException(${origin}):\n${error}`;
    if (process.platform === "win32")
      execFileSync("msg", [os.userInfo().username], {
        input: `RIT.Alert proccess exited: \n${flattenError(error)}`,
      });

    if (process.platform === "linux") {
      execFileSync("zenity", [
        "--error",
        "--title",
        "RIT.Alert Error",
        "--text",
        `RIT.Alert proccess exited: \n${flattenError(error)}`,
      ]);
    }
  });
};
