export class VeilError extends Error {
  constructor(
    message: string,
    readonly code: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "VeilError";
  }
}

export function isQuotaError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED")
  );
}

export function toUserMessage(error: unknown): string {
  if (error instanceof VeilError) return error.message;
  if (isQuotaError(error)) {
    return "This device is running low on browser storage. Remove a few photos or export a backup before trying again.";
  }
  if (error instanceof DOMException && error.name === "AbortError") {
    return "That action was cancelled. Your existing Veil data was not changed.";
  }
  return "Veil couldn’t complete that action. Your existing data is still available; please try again.";
}
