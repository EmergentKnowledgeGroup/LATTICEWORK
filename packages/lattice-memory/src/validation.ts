import type { Pulse, PulseFilter, PulseInput, PulseReference } from "@latticework/contracts";

export const maxSummaryLength = 80;
export const maxReferenceCount = 16;
export const maxSourceLength = 80;
export const maxKindLength = 80;
export const maxReferenceStoreLength = 80;
export const maxReferenceIdLength = 160;

const inputKeys = new Set(["ts", "source", "kind", "summary", "refs"]);
const filterKeys = new Set(["source", "kind", "sources", "kinds"]);
const forbiddenSummary = [/'[^']{40,}/u, /"[^"]{40,}/u, /\n.+\n/u, /https?:\/\//u];

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function boundedString(value: unknown, maximum: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maximum;
}
function reference(value: unknown): value is PulseReference {
  if (!object(value) || Object.keys(value).length !== 2 || !("store" in value) || !("id" in value)) return false;
  return boundedString(value.store, maxReferenceStoreLength) && boundedString(value.id, maxReferenceIdLength);
}

export function assertFilter(filter: unknown): asserts filter is PulseFilter | null | undefined {
  if (filter === null || filter === undefined) return;
  if (!object(filter) || Object.keys(filter).some((key) => !filterKeys.has(key))) throw new TypeError("Invalid pulse filter.");
  for (const name of ["source", "kind"] as const) {
    const value = filter[name];
    if (value !== undefined && !boundedString(value, name === "source" ? maxSourceLength : maxKindLength)) throw new TypeError("Invalid pulse filter.");
  }
  for (const name of ["sources", "kinds"] as const) {
    const values = filter[name];
    const maximum = name === "sources" ? maxSourceLength : maxKindLength;
    if (values !== undefined && (!Array.isArray(values) || values.some((value) => !boundedString(value, maximum)))) throw new TypeError("Invalid pulse filter.");
  }
}

export function matchesFilter(pulse: Pulse, filter: PulseFilter | null | undefined): boolean {
  if (filter === null || filter === undefined) return true;
  return (filter.source === undefined || filter.source === pulse.source)
    && (filter.kind === undefined || filter.kind === pulse.kind)
    && (filter.sources === undefined || filter.sources.includes(pulse.source))
    && (filter.kinds === undefined || filter.kinds.includes(pulse.kind));
}

export function validatePulse(input: unknown, now: number): Pulse | undefined {
  if (!object(input) || Object.keys(input).some((key) => !inputKeys.has(key))) return undefined;
  const source = input.source;
  const kind = input.kind;
  const summary = input.summary;
  if (!boundedString(source, maxSourceLength) || source === "quiet-room") return undefined;
  if (!boundedString(kind, maxKindLength) || typeof summary !== "string" || summary.length > maxSummaryLength) return undefined;
  if (forbiddenSummary.some((pattern) => pattern.test(summary))) return undefined;
  const timestamp = input.ts === undefined ? now : input.ts;
  if (typeof timestamp !== "number" || !Number.isFinite(timestamp)) return undefined;
  if (input.refs !== undefined && (!Array.isArray(input.refs) || input.refs.length > maxReferenceCount || input.refs.some((item) => !reference(item)))) return undefined;
  const refs = input.refs === undefined ? undefined : input.refs.map((item) => ({ store: item.store, id: item.id }));
  return refs === undefined
    ? { ts: timestamp, source, kind, summary }
    : { ts: timestamp, source, kind, summary, refs };
}
