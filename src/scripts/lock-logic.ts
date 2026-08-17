// Pure lock-mechanics rules, pulled out of main.ts so the two claims the
// brief asks for a test of — a key only turns the lock when its cut matches,
// and a picked pin only stays set when released inside its catch window —
// can be asserted directly in spec/, without simulating pointer/DOM events.

// A pin only reaches the shear line at full insertion if the selected key's
// cut at that position matches the lock's own pin design — this is the
// actual "does this key work" check, not just whether pins move.
export function isKeyAligned(
  depth: number,
  bitting: number[],
  lockBitting: number[],
  epsilon: number,
): boolean {
  if (depth < 0.995 || bitting.length !== lockBitting.length) return false;
  return bitting.every((value, i) => Math.abs(value - lockBitting[i]) < epsilon);
}

// Whether a pin released at `liftFrac` is close enough to `targetFrac` to
// bind, rather than spring back to rest — shared by the pointer-drag and
// held-arrow-key release paths, so both settle a pin the same way.
export function pinCatches(liftFrac: number, targetFrac: number, epsilonFrac: number): boolean {
  return Math.abs(liftFrac - targetFrac) <= epsilonFrac;
}

// A pin's true bound height, as a fraction of chamber height — the height a
// key's own cam would lift it to at full insertion.
export function pickTargetFrac(bittingValue: number, liftScale: number): number {
  return bittingValue * liftScale;
}
