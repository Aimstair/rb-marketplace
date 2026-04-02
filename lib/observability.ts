type LogLevel = "info" | "warn" | "error"

function serializeMeta(meta: unknown): unknown {
  if (!meta) {
    return undefined
  }

  if (meta instanceof Error) {
    return {
      name: meta.name,
      message: meta.message,
      stack: meta.stack,
    }
  }

  return meta
}

function emit(level: LogLevel, event: string, payload?: unknown, context?: Record<string, unknown>) {
  const record = {
    level,
    event,
    at: new Date().toISOString(),
    payload: serializeMeta(payload),
    context: context || undefined,
  }

  if (level === "error") {
    console.error(JSON.stringify(record))
    return
  }

  if (level === "warn") {
    console.warn(JSON.stringify(record))
    return
  }

  console.log(JSON.stringify(record))
}

export function logInfo(event: string, payload?: unknown, context?: Record<string, unknown>) {
  emit("info", event, payload, context)
}

export function logWarn(event: string, payload?: unknown, context?: Record<string, unknown>) {
  emit("warn", event, payload, context)
}

export function logError(event: string, payload?: unknown, context?: Record<string, unknown>) {
  emit("error", event, payload, context)
}
