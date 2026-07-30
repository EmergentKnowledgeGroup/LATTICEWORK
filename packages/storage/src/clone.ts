import type { PreservedRecord } from "@latticework/contracts";

/**
 * Keeps the typed view separate from a native structured clone of the complete
 * source record. JSON serialization is intentionally never used here.
 */
export function clonePreservedRecord<TProjection>(
  key: IDBValidKey,
  projection: TProjection,
  sourceValue: unknown,
): PreservedRecord<TProjection> {
  return {
    key: structuredClone(key),
    projection: structuredClone(projection),
    sourceValue: structuredClone(sourceValue),
  };
}

export function cloneSnapshot<T>(value: T): T {
  return structuredClone(value);
}
