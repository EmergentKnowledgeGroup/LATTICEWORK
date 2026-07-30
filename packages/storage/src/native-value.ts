function hex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function frame(kind: string, parts: readonly string[] = []): string {
  return `${kind}:${parts.map((part) => `${part.length}:${part}`).join("")}`;
}

interface CanonicalContext {
  readonly seen: WeakMap<object, number>;
  nextReference: number;
}

const serializedErrorNames = new Set([
  "Error", "EvalError", "RangeError", "ReferenceError", "SyntaxError", "TypeError", "URIError",
]);

const typedViewNames = new Set([
  "DataView", "Int8Array", "Uint8Array", "Uint8ClampedArray", "Int16Array", "Uint16Array",
  "Int32Array", "Uint32Array", "Float16Array", "Float32Array", "Float64Array",
  "BigInt64Array", "BigUint64Array",
]);

let aggregateErrorErrorsSupported: boolean | undefined;

function runtimeSupportsAggregateErrorErrors(): boolean {
  if (aggregateErrorErrorsSupported !== undefined) return aggregateErrorErrorsSupported;
  try {
    const cloned = structuredClone(new AggregateError(["probe"], "probe"));
    aggregateErrorErrorsSupported = cloned instanceof AggregateError && Array.isArray(cloned.errors);
  } catch {
    aggregateErrorErrorsSupported = false;
  }
  return aggregateErrorErrorsSupported;
}

function canonicalNumber(value: number): string {
  if (Number.isNaN(value)) return "NaN";
  if (value === Number.POSITIVE_INFINITY) return "+Infinity";
  if (value === Number.NEGATIVE_INFINITY) return "-Infinity";
  if (Object.is(value, -0)) return "-0";
  return String(value);
}

function isFile(value: object): value is File {
  return typeof File === "function" && value instanceof File;
}

async function canonicalProperties(
  value: Record<string, unknown>,
  context: CanonicalContext,
): Promise<string[]> {
  const properties: string[] = [];
  for (const key of Object.keys(value).sort()) {
    properties.push(frame("property", [key, await canonicalValue(value[key], context)]));
  }
  return properties;
}

async function canonicalError(value: Error, context: CanonicalContext): Promise<string> {
  const rawName = String(value.name);
  const aggregateSupported = value instanceof AggregateError && runtimeSupportsAggregateErrorErrors();
  const name = aggregateSupported ? "AggregateError" : serializedErrorNames.has(rawName) ? rawName : "Error";
  const parts = [name, String(value.message)];
  if (Object.hasOwn(value, "cause")) {
    parts.push(frame("cause", [await canonicalValue(value.cause, context)]));
  } else {
    parts.push(frame("no-cause"));
  }
  if (aggregateSupported) {
    const errors: string[] = [];
    for (const error of value.errors) errors.push(await canonicalValue(error, context));
    parts.push(frame("errors", errors));
  }
  return frame("error", parts);
}

async function canonicalValue(value: unknown, context: CanonicalContext): Promise<string> {
  if (value === null) return frame("null");
  switch (typeof value) {
    case "boolean": return frame("boolean", [String(value)]);
    case "number": return frame("number", [canonicalNumber(value)]);
    case "bigint": return frame("bigint", [String(value)]);
    case "string": return frame("string", [value]);
    case "undefined": return frame("undefined");
    case "object": break;
    default: throw new Error(`Native structured-clone contract does not support ${typeof value} values.`);
  }

  const object = value as object;
  const reference = context.seen.get(object);
  if (reference !== undefined) return frame("reference", [String(reference)]);
  context.seen.set(object, context.nextReference++);

  if (value instanceof Date) return frame("date", [canonicalNumber(value.getTime())]);
  if (value instanceof RegExp) return frame("regexp", [value.source, value.flags]);
  if (value instanceof Error) return canonicalError(value, context);
  if (isFile(object)) {
    const file = object;
    return frame("file", [
      file.name,
      canonicalNumber(file.lastModified),
      file.type,
      hex(new Uint8Array(await file.arrayBuffer())),
    ]);
  }
  if (value instanceof Blob) {
    return frame("blob", [value.type, hex(new Uint8Array(await value.arrayBuffer()))]);
  }
  if (value instanceof ArrayBuffer) return frame("array-buffer", [hex(new Uint8Array(value))]);
  if (ArrayBuffer.isView(value)) {
    const viewName = value.constructor.name;
    if (!typedViewNames.has(viewName)) {
      throw new Error(`Native structured-clone contract rejects unsupported typed-view class ${viewName}.`);
    }
    return frame("array-buffer-view", [
      viewName,
      String(value.byteOffset),
      String(value.byteLength),
      await canonicalValue(value.buffer, context),
    ]);
  }
  if (Array.isArray(value)) {
    return frame("array", [String(value.length), ...await canonicalProperties(value as unknown as Record<string, unknown>, context)]);
  }
  if (value instanceof Map) {
    const entries: string[] = [];
    for (const [key, entry] of value) {
      entries.push(frame("entry", [await canonicalValue(key, context), await canonicalValue(entry, context)]));
    }
    return frame("map", entries);
  }
  if (value instanceof Set) {
    const entries: string[] = [];
    for (const entry of value) entries.push(await canonicalValue(entry, context));
    return frame("set", entries);
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    const className = value.constructor?.name ?? "unknown";
    throw new Error(`Native structured-clone contract rejects unsupported host or class object ${className}.`);
  }
  return frame("object", await canonicalProperties(value as Record<string, unknown>, context));
}

/**
 * Canonical local representation of the exact native-value kinds Phase 3 can
 * verify. Unsupported host and class objects reject instead of collapsing to
 * an empty-object representation.
 */
export function canonicalNativeStructuredCloneValue(value: unknown): Promise<string> {
  return canonicalValue(value, { seen: new WeakMap(), nextReference: 1 });
}
