import {
  ansiColorFormatter,
  configure,
  getConsoleSink,
  getLogger,
} from "@logtape/logtape";
import { getRotatingFileSink } from "jsr:@logtape/file";
import { parseArgs } from "jsr:@std/cli/parse-args";
import process from "node:process";

const args = parseArgs(Deno.args, {
  boolean: ["log-file", "debug"],
});

await configure({
  sinks: {
    main: args["log-file"]
      ? getRotatingFileSink("rit-alert.log", { maxFiles: 5 })
      : getConsoleSink({
        formatter: process.stdout.isTTY ? ansiColorFormatter : undefined,
      }),
  },
  loggers: [
    {
      category: ["logtape", "meta"],
      lowestLevel: args.debug ? "debug" : "info",
    },
    {
      category: "rit.alert",
      lowestLevel: args.debug ? "debug" : "info",
      sinks: ["main"],
    },
  ],
});

export const logger = getLogger(["rit.alert"]);

logger.info`PID: ${process.pid}`;
