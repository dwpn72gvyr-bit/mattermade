// Stage A transport: mock with realistic latency and seeded error injection
// (§11 Stage A3). Function signatures mirror the future tRPC procedures so
// Stage B1 swaps this module only.

const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : undefined;

/** Deterministic PRNG so error injection is reproducible in tests and demos. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const chaosParam = params?.get('chaos');
/** ?chaos=0.15 injects a seeded 15% failure rate; default 0 for a calm demo. */
const FAILURE_RATE = chaosParam ? Math.min(0.9, Math.max(0, Number(chaosParam) || 0)) : 0;
const LATENCY_MIN = 60;
const LATENCY_SPREAD = 180;

const rng = mulberry32(20260630);

export class TransportError extends Error {
  constructor(public procedure: string) {
    // §9.4: "That didn't save. The fault is ours, and your entry is kept safely
    // right here. Try again in a moment." The UI renders the calm copy; this
    // carries the mechanics.
    super(`Mock transport failure in ${procedure}`);
    this.name = 'TransportError';
  }
}

export async function call<T>(procedure: string, fn: () => T | Promise<T>): Promise<T> {
  const latency = LATENCY_MIN + rng() * LATENCY_SPREAD;
  await new Promise((r) => setTimeout(r, latency));
  if (FAILURE_RATE > 0 && rng() < FAILURE_RATE) {
    throw new TransportError(procedure);
  }
  return fn();
}
