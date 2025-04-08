import { Hono } from "hono";
import { serve } from "@hono/node-server";
import {
  onScopeDispose,
  ref,
  toValue,
  type MaybeRefOrGetter,
} from "@vue/reactivity";
import { html, raw } from "hono/html";
import { serveStatic } from "@hono/node-server/serve-static";
import { uneval } from "devalue";
import { applyEdits, modify } from "jsonc-parser";
import path from "node:path";
import { readFile } from "fs/promises";

type UseServerOptions = {
  configValue: MaybeRefOrGetter<string>;
  sseUrl: MaybeRefOrGetter<string>;
  validateConfig: (jsonc: string) => void;
  onConfigChange: (jsonc: string) => void;
  onTestEvent: (jsonc: string) => void;
  configJsonSchema: MaybeRefOrGetter<object>;
  eventJsonSchema: MaybeRefOrGetter<object>;
};

export const useConfigServer = ({
  configJsonSchema,
  configValue,
  validateConfig,
  onConfigChange,
  eventJsonSchema,
  onTestEvent,
  sseUrl,
}: UseServerOptions) => {
  const app = new Hono();

  app.get("/", (c) => {
    return c.html(
      html`
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta
              name="viewport"
              content="width=device-width, initial-scale=1.0"
            />
            <title>RIT.Alert Settings</title>
            <link
              rel="stylesheet"
              href="https://esm.sh/monaco-editor@0.52.2/min/vs/editor/editor.main.css"
            />
            <link rel="stylesheet" href="./static/styles.css" />
          </head>

          <body>
            <div id="bottombar">
              <div id="pid">PID: ${process.pid}</div>
              <button id="sseButton">SSE</button>
              <button id="testerButton">Тестировать</button>
              <div style="position: relative;">
                <div id="saved">Сохранено!</div>
                <button id="saveButton">Сохранить</button>
              </div>
            </div>
            <div id="container"></div>

            <script>
              globalThis.schema = ${raw(uneval(toValue(configJsonSchema)))};
              globalThis.value = ${raw(uneval(toValue(configValue)))};
              globalThis.sseUrl = ${raw(uneval(toValue(sseUrl)))};
            </script>
            <script type="module" src="./static/index.js"></script>
          </body>
        </html>
      `
    );
  });

  app.get("/tester", async (c) => {
    return c.html(
      html`
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta
              name="viewport"
              content="width=device-width, initial-scale=1.0"
            />
            <title>RIT.Alert Tester</title>
            <link
              rel="stylesheet"
              href="https://esm.sh/monaco-editor@0.52.2/min/vs/editor/editor.main.css"
            />
            <link rel="stylesheet" href="./static/styles.css" />
          </head>

          <body>
            <div id="bottombar">
              <div id="pid">Тестирование настроек</div>
              <div style="position: relative;">
                <div id="saved">Отправлено!</div>
                <button id="saveButton">Эмулировать событие</button>
              </div>
            </div>
            <div id="container"></div>

            <script>
              globalThis.schema = ${raw(uneval(toValue(eventJsonSchema)))};
              globalThis.value = ${raw(
                uneval(
                  await readFile(
                    path.resolve(
                      import.meta.dirname,
                      "../default-test-event.jsonc"
                    ),
                    { encoding: "utf8" }
                  )
                )
              )};
            </script>
            <script type="module" src="./static/tester.js"></script>
          </body>
        </html>
      `
    );
  });

  app.post("/save", async (c) => {
    const body = await c.req.text();

    try {
      validateConfig(body);
    } catch (err) {
      c.status(400);

      if (!(err instanceof Error)) return c.body(null);

      return c.text(err.toString());
    }

    onConfigChange(body);

    return c.body(null, 200);
  });

  app.post("/config/enabled", async (c) => {
    const body = await c.req.text();

    if (body !== "true" && body !== "false") {
      return c.body(null, 400);
    }

    const config = toValue(configValue);

    const editResult = modify(config, ["enabled"], body === "true", {
      formattingOptions: {
        insertSpaces: true,
        keepLines: true,
        tabSize: 2,
      },
    });

    const newConfig = applyEdits(config, editResult);

    try {
      validateConfig(newConfig);
    } catch (err) {
      c.status(400);

      if (!(err instanceof Error)) return c.body(null);

      return c.text(err.toString());
    }

    onConfigChange(newConfig);

    return c.body(newConfig, 200);
  });

  app.use(
    "/static/*",
    serveStatic({
      root: path.relative(
        process.cwd(),
        path.resolve(import.meta.dirname, "../html")
      ),
      rewriteRequestPath: (path) => path.replace(/^\/static/, "/"),
    })
  );

  app.post("/test", async (c) => {
    const body = await c.req.text();

    try {
      onTestEvent(body);
    } catch (err) {
      c.status(400);

      if (!(err instanceof Error)) return c.body(null);

      return c.text(err.toString());
    }

    return c.body(null, 200);
  });

  const server = serve({
    fetch: app.fetch,
    port: 4579,
  });

  onScopeDispose(() => server.close());

  return {
    configServerUrl: ref("http://localhost:4579/"),
  };
};
