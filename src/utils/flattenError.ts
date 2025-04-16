export function flattenError(err: unknown, includeStackTrace = true): string {
  if (!(err instanceof Error)) {
    return `${err}`;
  }

  if ("errors" in err && Array.isArray(err.errors)) {
    return err.errors.map((e) => flattenError(e, includeStackTrace)).join(", ");
  }

  if ("cause" in err && err.cause instanceof Error) {
    const mainError = includeStackTrace && err.stack
      ? `${err.stack}`
      : `${err.message}`;

    return `${mainError}\nCaused by: ${
      flattenError(
        err.cause,
        includeStackTrace,
      )
    }`;
  }

  return includeStackTrace && err.stack ? err.stack : err.message;
}
