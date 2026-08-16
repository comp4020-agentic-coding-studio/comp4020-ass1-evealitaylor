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

// A pin only reaches the shear line at full insertion if the selected key's
// cut at that position matches the lock's own pin design — this is the
// actual "does this key work" check, not just whether pins move.
function isAligned(depth: number, bitting: number[]): boolean {
  if (depth < 0.995 || bitting.length !== LOCK_BITTING.length) return false;
  return bitting.every((value, i) => Math.abs(value - LOCK_BITTING[i]) < ALIGN_EPSILON);
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

  const aligned = Boolean(selectedLi) && isAligned(depth, bitting);
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
  if (pickSection && !pickSection.hidden) updatePickPins();
});

// --- Picking mode ---------------------------------------------------------
// Same lock, same LOCK_BITTING, same lift math as the key — the only
// difference is what drives each pin's lift: instead of one shared `depth`
// from a key's bitting, each pin here is pushed to its own height
// independently, which is what a pick (rather than a cut key) actually does.

const pickToggle = document.querySelector<HTMLButtonElement>("[data-testid='pick-toggle']");
const pickSection = document.querySelector<HTMLElement>("[data-testid='pick-section']");
const pickPinChambers = document.querySelectorAll<HTMLButtonElement>(".pick-pin-chamber");
const pickShearLine = document.querySelector<HTMLElement>("[data-testid='pick-shear-line']");
const pickCam = document.querySelector<HTMLElement>("[data-testid='pick-lock'] .lock-cam");
const pickHint = document.querySelector<HTMLElement>("[data-testid='pick-hint']");
const turnPickButton = document.querySelector<HTMLButtonElement>("[data-testid='turn-pick']");

const pickSet: boolean[] = Array.from(pickPinChambers, () => false);

function getPickChamberHeightPx(): number {
  const chamber = pickPinChambers[0];
  return chamber ? chamber.getBoundingClientRect().height : 0;
}

function updatePickHint() {
  if (!pickHint) return;
  const count = pickSet.filter(Boolean).length;
  const total = pickSet.length;
  if (count === 0) {
    pickHint.textContent = "0 of 5 pins bound. Click a pin to push it up to the shear line.";
  } else if (count < total) {
    pickHint.textContent = `${count} of ${total} pins bound. Each one only has to clear the line on its own — keep going.`;
  } else {
    pickHint.textContent = `All ${total} pins bound — nothing left blocking the cylinder. Turn it.`;
  }
}

function updatePickPins() {
  const chamberHeight = getPickChamberHeightPx();
  pickPinChambers.forEach((chamber, i) => {
    const assembly = chamber.querySelector<HTMLElement>(".pin-assembly");
    const factor = LOCK_BITTING[i] ?? 0;
    const lift = pickSet[i] ? factor * LIFT_SCALE * chamberHeight : 0;
    if (assembly) assembly.style.transform = lift ? `translateY(${-lift}px)` : "";
    chamber.classList.toggle("is-set", pickSet[i]);
    chamber.setAttribute("aria-pressed", String(pickSet[i]));
  });

  const allSet = pickSet.length > 0 && pickSet.every(Boolean);
  pickShearLine?.classList.toggle("is-aligned", allSet);
  pickCam?.classList.remove("is-turned");
  if (turnPickButton) turnPickButton.disabled = !allSet;
  updatePickHint();
}

pickPinChambers.forEach((chamber, i) => {
  chamber.addEventListener("click", () => {
    pickSet[i] = !pickSet[i];
    updatePickPins();
  });
});

turnPickButton?.addEventListener("click", () => {
  if (!turnPickButton || turnPickButton.disabled || !pickHint) return;
  const turned = pickCam?.classList.toggle("is-turned");
  pickHint.textContent = turned
    ? "Picked! No key was ever cut for this lock — every pin just had to be set by hand."
    : `All ${pickSet.length} pins bound — nothing left blocking the cylinder. Turn it.`;
});

pickToggle?.addEventListener("click", () => {
  if (!pickSection) return;
  const opening = pickSection.hidden;
  pickSection.hidden = !opening;
  pickToggle.setAttribute("aria-expanded", String(opening));
  pickToggle.textContent = opening ? "Hide the pick." : "Or pick it.";
  if (opening) updatePickPins();
});
