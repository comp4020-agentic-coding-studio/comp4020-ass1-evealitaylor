const keyButtons = document.querySelectorAll<HTMLButtonElement>(".key");
const keyway = document.querySelector<HTMLElement>("[data-testid='keyway']");
const slider = document.getElementById("insert-slider") as HTMLInputElement | null;
const hint = document.querySelector<HTMLElement>(".controls-hint");
const pinChambers = document.querySelectorAll<HTMLElement>(".pin-chamber");
const pinAssemblies = document.querySelectorAll<HTMLElement>(".pin-assembly");
const shearLine = document.querySelector<HTMLElement>("[data-testid='shear-line']");

let selectedLi: HTMLLIElement | null = null;
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

function getMaxLiftPx(): number {
  const chamber = pinChambers[0];
  if (!chamber || !shearLine) return 0;
  const chamberRect = chamber.getBoundingClientRect();
  const shearRect = shearLine.getBoundingClientRect();
  return chamberRect.top + chamberRect.height * 0.6 - shearRect.top;
}

function getSelectedBitting(): number[] {
  if (!selectedLi) return [];
  const button = selectedLi.querySelector<HTMLButtonElement>(".key");
  return (button?.dataset.bitting ?? "")
    .split(",")
    .map(Number)
    .filter((n) => !Number.isNaN(n));
}

function currentDepth(): number {
  return slider ? Number(slider.value) / 100 : 0;
}

function updatePins(depth: number) {
  const bitting = getSelectedBitting();
  const maxLift = getMaxLiftPx();
  pinAssemblies.forEach((assembly, i) => {
    const factor = bitting[i] ?? 0;
    const lift = depth * factor * maxLift;
    assembly.style.transform = lift ? `translateY(${-lift}px)` : "";
  });
}

function update() {
  const depth = currentDepth();
  updatePins(depth);
  if (selectedLi) applyKeyTransform(selectedLi, depth);
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
  if (hint) hint.textContent = "Select a key above to try it.";
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

  const label =
    button.querySelector(".visually-hidden")?.textContent?.trim() ?? "Key";
  if (hint) hint.textContent = `${label} selected. Drag the slider to insert it.`;
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

window.addEventListener("resize", () => {
  if (selectedLi) keyDeltas = computeKeyDeltas(selectedLi);
  update();
});
