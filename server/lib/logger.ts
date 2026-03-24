type LogLevel = "info" | "warn" | "error";

type LogMeta = Record<string, unknown>;

const SENSITIVE_KEY_PATTERN =
  /(password|secret|token|authorization|cookie|api[_-]?key|access[_-]?key)/i;

const redactValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(redactValue);
  }

  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const redacted: Record<string, unknown> = {};

    for (const [key, child] of Object.entries(obj)) {
      redacted[key] = SENSITIVE_KEY_PATTERN.test(key)
        ? "[REDACTED]"
        : redactValue(child);
    }

    return redacted;
  }

  return value;
};

export const appLog = (
  level: LogLevel,
  source: string,
  message: string,
  meta?: LogMeta,
) => {
  const formattedTime = new Date().toISOString();
  const payload = meta ? ` :: ${JSON.stringify(redactValue(meta))}` : "";
  const line = `${formattedTime} [${source}] ${message}${payload}`;

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.info(line);
};
