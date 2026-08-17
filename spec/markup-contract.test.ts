import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

// Structural half of the same checkable line as core-interaction.test.ts:
// the controls each interaction depends on exist in the built page and start
// in the state the logic in lock-logic.ts expects before any script runs.
const doc = new JSDOM(readFileSync(resolve("dist/index.html"), "utf8")).window.document;

describe("keyed lock: core interaction is wired up", () => {
  it("offers at least one selectable key with its own bitting", () => {
    const keys = doc.querySelectorAll<HTMLElement>(".key[data-bitting]");
    expect(keys.length).toBeGreaterThan(0);
  });

  it("starts with the insert slider disabled until a key is picked up", () => {
    expect(doc.querySelector<HTMLInputElement>("#insert-slider")?.disabled).toBe(true);
  });

  it("starts with turn-key disabled until the pins align", () => {
    expect(doc.querySelector<HTMLButtonElement>("[data-testid='turn-key']")?.disabled).toBe(true);
  });
});

describe("pick lock: core interaction is wired up", () => {
  it("starts collapsed behind a toggle", () => {
    expect(doc.querySelector("[data-testid='pick-section']")?.hasAttribute("hidden")).toBe(true);
    expect(doc.querySelector("[data-testid='pick-toggle']")?.getAttribute("aria-expanded")).toBe(
      "false",
    );
  });

  it("exposes each pin as a keyboard-operable slider, unset at rest", () => {
    const pins = doc.querySelectorAll<HTMLElement>(".pick-pin-chamber");
    expect(pins.length).toBe(5);
    for (const pin of pins) {
      expect(pin.getAttribute("role")).toBe("slider");
      expect(pin.getAttribute("tabindex")).toBe("0");
      expect(pin.getAttribute("aria-valuenow")).toBe("0");
    }
  });

  it("starts with turn-cylinder disabled until every pin is bound", () => {
    expect(doc.querySelector<HTMLButtonElement>("[data-testid='turn-pick']")?.disabled).toBe(true);
  });
});
