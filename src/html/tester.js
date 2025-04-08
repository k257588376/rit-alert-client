import { setupEditor } from "./editor.js";

const save = async () => {
  const res = await fetch("/test", {
    method: "POST",
    body: model.getValue(),
  });

  if (!res.ok) {
    alert(await res.text());
    return;
  }

  document.getElementById("saved").animate(
    [
      { opacity: 1, display: "block" },
      { opacity: 0, display: "block" },
    ],
    { duration: 1000, easing: "cubic-bezier(0.55, 0.06, 0.68, 0.19)" }
  );
};

const { model } = setupEditor(globalThis.value, globalThis.schema, save);

document.getElementById("saveButton")?.addEventListener("click", save);
