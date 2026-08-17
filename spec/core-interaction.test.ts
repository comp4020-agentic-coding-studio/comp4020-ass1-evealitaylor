import { describe, expect, it } from "vitest";
import { isKeyAligned, pinCatches, pickTargetFrac } from "../src/scripts/lock-logic";

// The brief's checkable line: "the visitor does something that changes what
// they see — state the core interaction plainly enough to write a test for
// it." This page has two: inserting a key only aligns the pins if that key's
// cut matches the lock's own, and dragging a pin only sets it if released
// inside a catch window. Both rules are pulled into lock-logic.ts precisely
// so they can be asserted here without simulating pointer/DOM events.

const LOCK_BITTING = [0.9, 1.3, 0.6, 1.1, 0.75];
const ALIGN_EPSILON = 0.02;
const LIFT_SCALE = 0.25;

describe("key interaction: only the matching key turns the lock", () => {
  it("aligns when the key's bitting matches the lock's, fully inserted", () => {
    expect(isKeyAligned(1, LOCK_BITTING, LOCK_BITTING, ALIGN_EPSILON)).toBe(true);
  });

  it("does not align part-way inserted, even with the matching key", () => {
    expect(isKeyAligned(0.6, LOCK_BITTING, LOCK_BITTING, ALIGN_EPSILON)).toBe(false);
  });

  it("does not align for a key cut to a different bitting", () => {
    const wrongKey = [0.3, 1.4, 0.5, 1.3, 0.4];
    expect(isKeyAligned(1, wrongKey, LOCK_BITTING, ALIGN_EPSILON)).toBe(false);
  });

  it("tolerates only differences smaller than the alignment epsilon", () => {
    const almostRight = LOCK_BITTING.map((v) => v + ALIGN_EPSILON / 2);
    const justWrong = LOCK_BITTING.map((v) => v + ALIGN_EPSILON * 2);
    expect(isKeyAligned(1, almostRight, LOCK_BITTING, ALIGN_EPSILON)).toBe(true);
    expect(isKeyAligned(1, justWrong, LOCK_BITTING, ALIGN_EPSILON)).toBe(false);
  });
});

describe("pick interaction: a dragged pin only stays set within its catch window", () => {
  const target = pickTargetFrac(LOCK_BITTING[0], LIFT_SCALE);

  it("catches when released exactly on target", () => {
    expect(pinCatches(target, target, 0.02)).toBe(true);
  });

  it("catches within the epsilon window either side of target", () => {
    expect(pinCatches(target + 0.019, target, 0.02)).toBe(true);
    expect(pinCatches(target - 0.019, target, 0.02)).toBe(true);
  });

  it("misses when released outside the catch window", () => {
    expect(pinCatches(target + 0.05, target, 0.02)).toBe(false);
    expect(pinCatches(0, target, 0.02)).toBe(false);
  });
});
