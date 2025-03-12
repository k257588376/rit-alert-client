import { Toast } from "powertoast";

export function createToast(options: Toast["options"]) {
  return new Toast({
    // Windows Settigns
    aumid:
      "windows.immersivecontrolpanel_cw5n1h2txyewy!microsoft.windows.immersivecontrolpanel",
    attribution: "RIT.Alert",
    ...options,
  } satisfies Toast["options"]);
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
