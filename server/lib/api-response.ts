export type ApiErrorDetails = Record<string, unknown>;

export const ok = <T>(data: T) => ({ ok: true as const, data });

export const error = (
  code: string,
  message: string,
  details?: ApiErrorDetails,
) => ({
  ok: false as const,
  error: { code, message, details: details || {} },
});

const statusCodeToErrorCode = (status: number) => {
  if (status === 400) return "VALIDATION_ERROR";
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "CONFLICT";
  if (status === 429) return "RATE_LIMIT";
  return "INTERNAL_SERVER_ERROR";
};

export const toPublicErrorResponse = (
  err: unknown,
  requestId?: string,
): {
  status: number;
  body: ReturnType<typeof error>;
} => {
  const typed = err as
    | (Error & { status?: number; statusCode?: number; code?: string })
    | undefined;
  const statusRaw = typed?.status ?? typed?.statusCode ?? 500;
  const status = Number.isInteger(statusRaw)
    ? Math.min(599, Math.max(400, statusRaw))
    : 500;
  const code =
    status >= 500
      ? statusCodeToErrorCode(status)
      : typed?.code || statusCodeToErrorCode(status);
  const message =
    status >= 500
      ? "Internal Server Error"
      : typed?.message || "Request failed";

  return {
    status,
    body: error(code, message, requestId ? { requestId } : undefined),
  };
};
