import { configure, getConsoleSink, ansiColorFormatter, getLogger } from '@logtape/logtape';

await configure({
  sinks: {
    console: getConsoleSink({
      formatter: process.stdout.isTTY ? ansiColorFormatter : undefined,
    }),
  },
  loggers: [
    { category: ["logtape", "meta"], lowestLevel: "info" },
    { category: "rit.alert", lowestLevel: "info", sinks: ["console"] },
  ],
});

export const logger = getLogger(["rit.alert"]);

logger.info`PID: ${process.pid}`;