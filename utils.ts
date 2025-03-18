import { spawn } from "node:child_process";
import path from "node:path";
import { Toast, toXmlString } from "powertoast";
import { EOL } from "node:os";

export function createToast(options: Toast["options"]) {
  return new Toast({
    // Windows Settigns
    aumid:
      "windows.immersivecontrolpanel_cw5n1h2txyewy!microsoft.windows.immersivecontrolpanel",
    attribution: "RIT.Alert",
    ...options,
  } satisfies Toast["options"]);
}

const toast = spawn("pwsh", [path.resolve("./text.ps1")]);
toast.stdin.setDefaultEncoding("utf8");
toast.stdout.addListener("data", (buffer) => console.log(buffer.toString()));

export function createToast2(options: Toast["options"]) {
  toast.stdin.write(
    toXmlString(options) +
      EOL +
      new Date(options.expiration ?? 0).toISOString() +
      EOL
  );
}

export function flattenError(err: unknown): string {
  if (!(err instanceof Error)) {
    return `${err}`;
  }

  if ("errors" in err && Array.isArray(err.errors)) {
    return err.errors.map(flattenError).join(", ");
  }

  if ("cause" in err && err.cause instanceof Error) {
    return `${err}: ${flattenError(err.cause)}`;
  }

  return err.message;
}
