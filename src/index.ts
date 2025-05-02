/// <reference types="npm:@types/node" />

import { toJsonSchema } from "@valibot/to-json-schema";
import { computed, effectScope, ref, watch } from "@vue/reactivity";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import sift from "sift";
import JSONC from "tiny-jsonc";
import { parse } from "valibot";
import { type AccessGrantedEvent, useConfig } from "./hooks/useConfig.ts";
import { useConfigServer } from "./hooks/useConfigServer.ts";
import { useEventSource } from "./hooks/useEventSource.ts";
import { useIsScreenLocked } from "./hooks/useIsScreenLocked.ts";
import { useNotifications } from "./hooks/useNotifications.ts";
import { useRefreshTagList } from "./hooks/useRefreshTagsList.ts";
import { logger } from "./logger.ts";
import { configToString } from "./utils/configToString.ts";
import { createEventHook } from "./utils/createEventHook.ts";
import { isSatisfiesElementFilter } from "./utils/filterElement.ts";
import { registerErrorMonitor } from "./utils/registerErrorMonitor.ts";
import { watchEffectScope } from "./utils/watchEffectScope.ts";

const execFileAsync = promisify(execFile);

registerErrorMonitor();

const scope = effectScope(true);
scope.run(() => {
  const notify = useNotifications();
  const tagsList = ref<string[] | null>(null);

  const { config, schema, jsonc } = useConfig(tagsList);

  const configOptimized = computed(() => {
    return {
      notifications: config.value.notifications.map((el) => ({
        ...el,
        tags: el.tags ? new Set(el.tags) : null,
        filter: el.filter ? sift.default(el.filter) : null,
      })),
      commands: config.value.commands.map((el) => ({
        ...el,
        tags: el.tags ? new Set(el.tags) : null,
        filter: el.filter ? sift.default(el.filter) : null,
      })),
    };
  });

  const eventSourceLink = computed(() => {
    const commonTags = [
      ...config.value.notifications,
      ...config.value.commands,
    ].reduce(
      (set, el, index) =>
        index === 0 ? new Set(el.tags) : set.intersection(new Set(el.tags)),
      new Set<string>()
    );

    const url = new URL(config.value.serverUrl);
    url.pathname = "/sse/accessGranted";
    url.searchParams.set("ping", "true");

    if (commonTags.size > 0) {
      url.searchParams.set("tags", Array.from(commonTags.values()).join(","));
    }

    return url.toString();
  });

  useRefreshTagList(() => config.value.serverUrl, tagsList);

  const { on: onTestEvent, trigger: triggerTestEvent } =
    createEventHook<AccessGrantedEvent>();

  const { configServerUrl } = useConfigServer({
    configValue: jsonc,
    configJsonSchema: computed(() => toJsonSchema(schema.value.ConfigSchema)),
    eventJsonSchema: computed(() =>
      toJsonSchema(schema.value.AccessGrantedEventSchema)
    ),
    sseUrl: eventSourceLink,
    onConfigChange: (value) => {
      jsonc.value = value;
    },
    validateConfig: (value) => {
      const obj = JSONC.parse(value);
      parse(schema.value.ConfigSchema, obj);
    },
    onTestEvent: (value) => {
      const obj = JSONC.parse(value);
      const event = parse(schema.value.AccessGrantedEventSchema, obj);
      triggerTestEvent(event);
    },
  });

  logger.info`Listening on ${configServerUrl.value}`;

  if (config.value.showConfigOnStartup) {
    notify({
      windows: {
        title: "Текущие настройки RIT.Alert",
        message: configToString(config.value),
        button: [
          {
            text: "Настроить",
            activation: configServerUrl.value,
          },
        ],
      },
      linux: {
        summary: "Текущие настройки RIT.Alert",
        description: configToString(config.value),
        actions: [
          {
            name: "Настроить",
            callback: () => {
              execFile("xdg-open", [configServerUrl.value]);
            },
          },
        ],
      },
    });
  }

  const isScreenLocked = useIsScreenLocked(() => ({
    windows: { interval: config.value.windowsIsScreenLockedCheckInterval },
  }));

  watch(
    computed(() => config.value.enabled),
    (value) => {
      logger.info(value ? "App is enabled" : "App is disabled");
    },
    { immediate: true }
  );

  watch(isScreenLocked, (value) => {
    if (value) logger.info("Screen is locked");
  });

  watchEffectScope(
    () => !isScreenLocked.value && config.value.enabled,
    () => {
      const { onConnected, onError, onAccessGranted } =
        useEventSource(eventSourceLink);

      let hasError = false;

      onConnected(() => {
        logger.info`EventSource has connected successfully to ${eventSourceLink.value}`;

        if (hasError) {
          hasError = false;
          const message = "Соединение с сервером RIT.Alert востановлено";
          notify({ windows: { message }, linux: { summary: message } });
        }
      });

      onError((error) => {
        logger.info`An error occured in EventSource: ${error}`;
        if (!hasError) {
          hasError = true;

          const message = "Соединение с сервером RIT.Alert потеряно";
          notify({ windows: { message }, linux: { summary: message } });
        }
      });

      const handler = (data: AccessGrantedEvent) => {
        try {
          const eventTagsSet = new Set(data.tags);

          Promise.all(
            configOptimized.value.commands
              .filter((commandSetting) =>
                isSatisfiesElementFilter(commandSetting, data, eventTagsSet)
              )
              .map((commandSetting) =>
                execFileAsync(commandSetting.file, commandSetting.args)
              )
          ).catch(
            (e) =>
              logger.error`An error happend during execution of commands: ${e}`
          );

          for (const notifySetting of configOptimized.value.notifications) {
            if (isSatisfiesElementFilter(notifySetting, data, eventTagsSet)) {
              const message = `${
                data.door.side === "Enter" ? "Вошел" : "Вышел"
              } ${data.user.firstName} ${data.user.lastName} через '${
                data.door.name
              }'`;

              notify({
                windows: { message },
                linux: { summary: "Событие", description: message },
              });
              break;
            }
          }
        } catch (err) {
          logger.error`Error happened when executing script: ${err}`;
        }
      };

      onAccessGranted(handler);
      onTestEvent(handler);
    }
  );
});
