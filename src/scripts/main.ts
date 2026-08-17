import { isKeyAligned, pinCatches, pickTargetFrac } from "./lock-logic";

const keyButtons = document.querySelectorAll<HTMLButtonElement>(".key");
const keyway = document.querySelector<HTMLElement>("[data-testid='keyway']");
const slider = document.getElementById("insert-slider") as HTMLInputElement | null;
const hint = document.querySelector<HTMLElement>(".controls-hint");
const pinStack = document.querySelector<HTMLElement>(".pin-stack");
const pinChambers = document.querySelectorAll<HTMLElement>(".pin-chamber");
const pinAssemblies = document.querySelectorAll<HTMLElement>(".pin-assembly");
const shearLine = document.querySelector<HTMLElement>("[data-testid='shear-line']");
const turnKeyButton = document.querySelector<HTMLButtonElement>("[data-testid='turn-key']");
const lockCam = document.querySelector<HTMLElement>(".lock-cam");

function parseBitting(value: string | undefined): number[] {
  return (value ?? "")
    .split(",")
    .map(Number)
    .filter((n) => !Number.isNaN(n));
}

// The lock's own pin design (fixed, from the build-time bitting baked into
// `.pin-stack`'s dataset) — the only key that opens the lock is the one
// whose bitting matches this, position for position.
const LOCK_BITTING = parseBitting(pinStack?.dataset.lockBitting);
// Must match the LIFT_SCALE used in index.astro to compute each pin's rest
// split, so a matching key's lift exactly cancels that offset at depth 1.
const LIFT_SCALE = Number(pinStack?.dataset.liftScale) || 0.25;
const ALIGN_EPSILON = 0.02;

let selectedLi: HTMLLIElement | null = null;
let selectedLabel = "Key";
let keyDeltas = { restDx: 0, insertedDx: 0, dy: 0 };

// Space to keep between the key's head and the viewport edge at rest, so a
// long key on a narrow (mobile) viewport doesn't push its head off-screen.
const MIN_HEAD_MARGIN_PX = 8;

// Measures the key's true post-rotation bounding box (rather than computing
// the swap by hand) so the math stays correct across breakpoints. Sets the
// key to rotate(-90deg) with no translate, reads where that landed, then
// works out the plain screen-space deltas for the two ends of its travel:
// tip resting at the keyway's left edge (about to enter), and tip at the
// keyway's right edge (fully inserted) — both vertically centered on the
// keyway. Computed independently rather than one as an offset of the other,
// so clamping the rest position to stay on-screen can't drag the fully
// -inserted position off the keyway's right edge with it. The caller
// overwrites the transform immediately after, so there's no flash.
function computeKeyDeltas(li: HTMLLIElement): {
  restDx: number;
  insertedDx: number;
  dy: number;
} {
  if (!keyway) return { restDx: 0, insertedDx: 0, dy: 0 };

  // .key-item has a CSS transition on transform, which would otherwise
  // animate this temporary measurement transform in rather than applying it
  // instantly — reading getBoundingClientRect() a tick too early would then
  // report geometry from whatever transform was previously in place instead
  // of this one. Disable it for the measurement, restore it right after so
  // the transform the caller applies next still animates normally.
  const prevTransition = li.style.transition;
  li.style.transition = "none";
  li.style.transform = "rotate(-90deg)";
  const liRect = li.getBoundingClientRect();
  const keywayRect = keyway.getBoundingClientRect();
  li.style.transition = prevTransition;

  const liCenterX = liRect.left + liRect.width / 2;
  const liCenterY = liRect.top + liRect.height / 2;
  const targetCenterY = keywayRect.top + keywayRect.height / 2;

  const restCenterX = Math.max(
    keywayRect.left - liRect.width / 2,
    MIN_HEAD_MARGIN_PX + liRect.width / 2,
  );
  const insertedCenterX = keywayRect.right - liRect.width / 2;

  return {
    restDx: restCenterX - liCenterX,
    insertedDx: insertedCenterX - liCenterX,
    dy: targetCenterY - liCenterY,
  };
}

function applyKeyTransform(li: HTMLLIElement, depth: number) {
  const dx = keyDeltas.restDx + depth * (keyDeltas.insertedDx - keyDeltas.restDx);
  li.style.transform = `translate(${dx}px, ${keyDeltas.dy}px) rotate(-90deg)`;
}

function returnToRing(li: HTMLLIElement) {
  li.classList.remove("is-armed");
  li.style.transform = "";
}

function getChamberHeightPx(): number {
  const chamber = pinChambers[0];
  return chamber ? chamber.getBoundingClientRect().height : 0;
}

function getSelectedBitting(): number[] {
  if (!selectedLi) return [];
  const button = selectedLi.querySelector<HTMLButtonElement>(".key");
  return parseBitting(button?.dataset.bitting);
}

function currentDepth(): number {
  return slider ? Number(slider.value) / 100 : 0;
}

function updatePins(depth: number, bitting: number[]) {
  const chamberHeight = getChamberHeightPx();
  pinAssemblies.forEach((assembly, i) => {
    const factor = bitting[i] ?? 0;
    const lift = depth * factor * LIFT_SCALE * chamberHeight;
    assembly.style.transform = lift ? `translateY(${-lift}px)` : "";
  });
}

function updateHint(depth: number, aligned: boolean) {
  if (!hint) return;
  if (!selectedLi) {
    hint.textContent = "Select a key above to try it.";
  } else if (aligned) {
    hint.textContent = `${selectedLabel} fits — the pins line up. Turn the key.`;
  } else if (depth >= 0.995) {
    hint.textContent = `${selectedLabel} doesn't fit — the pins aren't lined up.`;
  } else {
    hint.textContent = `${selectedLabel} selected. Drag the slider to insert it.`;
  }
}

function update() {
  const depth = currentDepth();
  const bitting = getSelectedBitting();
  updatePins(depth, bitting);
  if (selectedLi) applyKeyTransform(selectedLi, depth);

  const aligned = Boolean(selectedLi) && isKeyAligned(depth, bitting, LOCK_BITTING, ALIGN_EPSILON);
  shearLine?.classList.toggle("is-aligned", aligned);
  lockCam?.classList.remove("is-turned");
  if (turnKeyButton) turnKeyButton.disabled = !aligned;
  updateHint(depth, aligned);
}

function setSelected(li: HTMLLIElement, selected: boolean) {
  const button = li.querySelector<HTMLButtonElement>(".key");
  button?.classList.toggle("key-selected", selected);
  button?.setAttribute("aria-pressed", String(selected));
}

function deselect() {
  if (!selectedLi) return;
  returnToRing(selectedLi);
  setSelected(selectedLi, false);
  selectedLi = null;
  if (slider) {
    slider.disabled = true;
    slider.value = "0";
  }
  update();
}

function select(button: HTMLButtonElement) {
  const li = button.closest<HTMLLIElement>(".key-item");
  if (!li) return;

  if (li === selectedLi) {
    deselect();
    return;
  }

  if (selectedLi) {
    returnToRing(selectedLi);
    setSelected(selectedLi, false);
  }

  selectedLi = li;
  li.classList.add("is-armed");
  setSelected(li, true);

  selectedLabel =
    button.querySelector(".visually-hidden")?.textContent?.trim() ?? "Key";
  if (slider) {
    slider.disabled = false;
    slider.value = "0";
  }

  keyDeltas = computeKeyDeltas(li);
  update();
}

keyButtons.forEach((button) => {
  button.setAttribute("aria-pressed", "false");
  button.addEventListener("click", () => select(button));
});

slider?.addEventListener("input", update);

turnKeyButton?.addEventListener("click", () => {
  if (!turnKeyButton || turnKeyButton.disabled || !hint) return;
  const turned = lockCam?.classList.toggle("is-turned");
  hint.textContent = turned
    ? "Unlocked! The cam turns freely."
    : `${selectedLabel} fits — the pins line up. Turn the key.`;
});

window.addEventListener("resize", () => {
  if (selectedLi) keyDeltas = computeKeyDeltas(selectedLi);
  update();
  if (pickSection && !pickSection.hidden) {
    pickPinChambers.forEach((_, i) => renderPickPin(i));
  }
});

// --- Picking mode ---------------------------------------------------------
// Same lock, same LOCK_BITTING, same lift math as the key — the only
// difference is what drives each pin's lift: instead of one shared `depth`
// from a key's bitting, each pin here is pushed to its own height
// independently by dragging, which is what a pick (rather than a cut key)
// actually does. Unlike the keyed side, there's no shear-line marker to aim
// at while picking — you feel for the catch by trial, same as picking a
// real lock blind, and only see the line once every pin is holding it.

const pickToggle = document.querySelector<HTMLButtonElement>("[data-testid='pick-toggle']");
const pickSection = document.querySelector<HTMLElement>("[data-testid='pick-section']");
const pickPinChambers = document.querySelectorAll<HTMLElement>(".pick-pin-chamber");
const pickShearLine = document.querySelector<HTMLElement>("[data-testid='pick-shear-line']");
const pickCam = document.querySelector<HTMLElement>("[data-testid='pick-lock'] .lock-cam");
const pickHint = document.querySelector<HTMLElement>("[data-testid='pick-hint']");
const turnPickButton = document.querySelector<HTMLButtonElement>("[data-testid='turn-pick']");

// Ceiling a pin can be dragged to — comfortably above the highest possible
// target (max bitting 1.5 * LIFT_SCALE = 0.375) so nothing caps out early.
const PICK_MAX_LIFT_FRAC = 0.42;
// How close a release has to land to the pin's real target to catch, as a
// fraction of chamber height — tight enough that lining up takes a couple
// of tries, not a single confident drag.
const PICK_CATCH_EPSILON_FRAC = 0.02;
const PICK_KEY_STEP_FRAC = 0.015;

const pickSet: boolean[] = Array.from(pickPinChambers, () => false);
// Each pin's current height while dragging, as a fraction of chamber height
// rather than raw px, so it stays correct if the viewport resizes mid-pick.
const pickLiftFrac: number[] = Array.from(pickPinChambers, () => 0);

function getPickChamberHeightPx(): number {
  const chamber = pickPinChambers[0];
  return chamber ? chamber.getBoundingClientRect().height : 0;
}

function renderPickPin(i: number) {
  const chamber = pickPinChambers[i];
  const assembly = chamber?.querySelector<HTMLElement>(".pin-assembly");
  if (!chamber || !assembly) return;
  const liftPx = pickLiftFrac[i] * getPickChamberHeightPx();
  assembly.style.transform = liftPx ? `translateY(${-liftPx}px)` : "";
  chamber.classList.toggle("is-set", pickSet[i]);
  const pct = Math.round((pickLiftFrac[i] / PICK_MAX_LIFT_FRAC) * 100);
  chamber.setAttribute("aria-valuenow", String(Math.min(100, Math.max(0, pct))));
  chamber.setAttribute("aria-valuetext", pickSet[i] ? "bound" : "not bound");
}

function updatePickHint(message?: string) {
  if (!pickHint) return;
  if (message) {
    pickHint.textContent = message;
    return;
  }
  const count = pickSet.filter(Boolean).length;
  const total = pickSet.length;
  if (count === 0) {
    pickHint.textContent = "0 of 5 pins bound. Drag a pin up and feel for where it catches.";
  } else if (count < total) {
    pickHint.textContent = `${count} of ${total} pins bound. Keep going — each one only has to catch on its own.`;
  } else {
    pickHint.textContent = `All ${total} pins bound — nothing left blocking the cylinder. Turn it.`;
  }
}

function refreshPickState() {
  const allSet = pickSet.length > 0 && pickSet.every(Boolean);
  pickShearLine?.classList.toggle("is-aligned", allSet);
  pickCam?.classList.remove("is-turned");
  if (turnPickButton) turnPickButton.disabled = !allSet;
}

// Called on release (pointerup) or on releasing a held arrow key — the
// moment a real pick would either feel a pin catch or feel it drop.
function settlePin(i: number) {
  const target = pickTargetFrac(LOCK_BITTING[i] ?? 0, LIFT_SCALE);
  const within = pinCatches(pickLiftFrac[i], target, PICK_CATCH_EPSILON_FRAC);
  if (within) {
    pickLiftFrac[i] = target;
    pickSet[i] = true;
    renderPickPin(i);
    refreshPickState();
    updatePickHint();
  } else {
    pickLiftFrac[i] = 0;
    renderPickPin(i);
    updatePickHint(`Pin ${i + 1} didn't catch — it dropped back down.`);
  }
}

function initPickPins() {
  pickPinChambers.forEach((_, i) => renderPickPin(i));
  refreshPickState();
  updatePickHint();
}

pickPinChambers.forEach((chamber, i) => {
  let dragging = false;
  let startY = 0;
  let startFrac = 0;

  chamber.addEventListener("pointerdown", (e) => {
    if (pickSet[i]) return;
    dragging = true;
    startY = e.clientY;
    startFrac = pickLiftFrac[i];
    chamber.setPointerCapture(e.pointerId);
  });

  chamber.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const chamberHeight = getPickChamberHeightPx();
    if (!chamberHeight) return;
    const deltaFrac = (startY - e.clientY) / chamberHeight;
    pickLiftFrac[i] = Math.min(PICK_MAX_LIFT_FRAC, Math.max(0, startFrac + deltaFrac));
    renderPickPin(i);
  });

  function endDrag(e: PointerEvent) {
    if (!dragging) return;
    dragging = false;
    chamber.releasePointerCapture(e.pointerId);
    settlePin(i);
  }

  chamber.addEventListener("pointerup", endDrag);
  chamber.addEventListener("pointercancel", endDrag);

  // Arrow keys are the keyboard equivalent of the drag: holding one nudges
  // the pin (browsers auto-repeat keydown while held), and releasing it
  // (keyup) is the "let go and see if it caught" moment, same as pointerup.
  chamber.addEventListener("keydown", (e) => {
    if (pickSet[i] || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
    e.preventDefault();
    const delta = e.key === "ArrowUp" ? PICK_KEY_STEP_FRAC : -PICK_KEY_STEP_FRAC;
    pickLiftFrac[i] = Math.min(PICK_MAX_LIFT_FRAC, Math.max(0, pickLiftFrac[i] + delta));
    renderPickPin(i);
  });

  chamber.addEventListener("keyup", (e) => {
    if (pickSet[i] || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
    settlePin(i);
  });
});

turnPickButton?.addEventListener("click", () => {
  if (!turnPickButton || turnPickButton.disabled) return;
  const turned = pickCam?.classList.toggle("is-turned");
  updatePickHint(
    turned
      ? "Picked! No key was ever cut for this lock — every pin just had to be set by hand."
      : undefined,
  );
});

pickToggle?.addEventListener("click", () => {
  if (!pickSection) return;
  const opening = pickSection.hidden;
  pickSection.hidden = !opening;
  pickToggle.setAttribute("aria-expanded", String(opening));
  pickToggle.textContent = opening ? "Hide the pick." : "Or pick it.";
  if (opening) initPickPins();
});
