import path from "node:path";
import os from "node:os";
import { readFile, stat } from "node:fs/promises";
import { ref, watch } from "@vue/reactivity";
import { writeFile } from "node:fs/promises";
import { useOnEffectCleanupAbortController } from "./useOnEffectCleanupAbortController.ts";
import { logger } from "../logger.ts";

const log = logger.getChild("usePersisedJSONCConfig");

const configFilePath = path.resolve(os.homedir(), "ritalert.jsonc");

log.debug`Config File Path: ${configFilePath}`;

let content = ``;

try {
  const data = await stat(configFilePath);

  if (!data.isFile()) {
    throw new Error(`Found a directory on ${configFilePath}`);
  }

  content = await readFile(configFilePath, { encoding: "utf8" });
  log.debug`Config have been read succesfully`;
} catch (err) {
  if (!(err instanceof Error)) throw err;

  log.warn(
    `An error happened during loading a config file. Falling back to default config: ${err.toString()}`,
  );

  content = await readFile(
    path.resolve(import.meta.dirname!, "../default-config.jsonc"),
    { encoding: "utf8" },
  );
}

export const usePersisedJSONCConfig = () => {
  const configContent = ref(content);

  watch(configContent, async () => {
    const controller = useOnEffectCleanupAbortController();
    await writeFile(configFilePath, configContent.value, {
      signal: controller.signal,
    });
  });

  return configContent;
};
