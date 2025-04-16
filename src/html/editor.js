import EditorWorker from "https://esm.sh/monaco-editor@0.50.0/esm/vs/editor/editor.worker?worker";
import JsonWorker from "https://esm.sh/monaco-editor@0.50.0/esm/vs/language/json/json.worker?worker";
import * as monaco from "https://esm.sh/monaco-editor@0.50.0?bundle&target=node";

globalThis.monaco = monaco;
globalThis.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === "json") {
      return JsonWorker();
    }

    return EditorWorker();
  },
};

export function setupEditor(value, schema, onSave) {
  monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
    allowComments: true,
    schemaValidation: "error",
    validate: true,
    schemas: [
      {
        schema: schema,
        fileMatch: ["settings.json"],
      },
    ],
    trailingCommas: true,
  });

  const model = monaco.editor.createModel(
    value,
    "json",
    monaco.Uri.parse("settings.json"),
  );

  const editor = monaco.editor.create(document.getElementById("container"), {
    automaticLayout: true,
    model: model,
    // deno-lint-ignore no-window
    theme: window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "vs-dark"
      : "vs-light",
    quickSuggestions: {
      other: true,
      comments: false,
      strings: true,
    },
    formatOnType: true,
    minimap: {
      enabled: false,
    },
    unicodeHighlight: {
      ambiguousCharacters: false,
    },
    smoothScrolling: true,
    scrollBeyondLastLine: false,
    tabSize: 2,
  });

  const save = () => {
    const markers = monaco.editor
      .getModelMarkers()
      .filter((el) => el.severity >= 8);

    if (markers.length > 0) {
      alert(
        markers
          .map((el) => `${el.message} - Line ${el.startLineNumber}`)
          .join("\n"),
      );

      return;
    }

    onSave(model.getValue());
  };

  editor.addCommand(
    monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, // Keybinding
    () => {
      save();
    },
  );

  function validateEditor() {
    const stringOrCommentRe = /("(?:\\?[^])*?")|(\/\/.*)|(\/\*[^]*?\*\/)/g;
    const stringOrTrailingCommaRe = /("(?:\\?[^])*?")|(,\s*)(?=]|})/g;

    const value = model
      .getValue()
      .replace(stringOrCommentRe, "$1")
      .replace(stringOrTrailingCommaRe, "$1");

    if (!value.trim()) {
      monaco.editor.setModelMarkers(model, "owner", [
        {
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: 1,
          endColumn: 1,
          message: "JSON cannot be empty.",
          severity: monaco.MarkerSeverity.Error,
        },
      ]);
    } else {
      monaco.editor.setModelMarkers(model, "owner", []);
    }
  }

  model.onDidChangeContent(() => {
    validateEditor();
  });

  return { editor, model };
}
