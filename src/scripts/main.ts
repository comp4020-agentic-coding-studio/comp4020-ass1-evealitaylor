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
});
