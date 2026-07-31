import type { Pulse, PulseReference, StoredPulse } from "@latticework/contracts";

function immutableReference(reference: PulseReference): PulseReference {
  return Object.freeze({ store: reference.store, id: reference.id });
}

export function immutablePulse(pulse: Pulse): Pulse {
  const refs = pulse.refs === undefined ? undefined : Object.freeze(pulse.refs.map(immutableReference));
  return Object.freeze(refs === undefined
    ? { ts: pulse.ts, source: pulse.source, kind: pulse.kind, summary: pulse.summary }
    : { ts: pulse.ts, source: pulse.source, kind: pulse.kind, summary: pulse.summary, refs });
}

export function publicPulse(stored: StoredPulse): Pulse {
  const { _id: _ignored, ...pulse } = stored;
  return immutablePulse(pulse);
}
