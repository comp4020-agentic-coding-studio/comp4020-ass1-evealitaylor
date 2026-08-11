const keyButtons = document.querySelectorAll<HTMLButtonElement>(".key");
const keyList = document.querySelector<HTMLElement>("[data-testid='key-list']");
const keySlot = document.querySelector<HTMLElement>("[data-testid='key-slot']");
const slider = document.getElementById("insert-slider") as HTMLInputElement | null;
const hint = document.querySelector<HTMLElement>(".controls-hint");

let selectedLi: HTMLLIElement | null = null;

function computeSlotDelta() {
  if (!keyList || !keySlot) return { dx: 0, dy: 0 };
  const keyListRect = keyList.getBoundingClientRect();
  const slotRect = keySlot.getBoundingClientRect();
  return {
    dx:
      slotRect.left +
      slotRect.width / 2 -
      (keyListRect.left + keyListRect.width / 2),
    dy: slotRect.top - keyListRect.top,
  };
}

function placeInSlot(li: HTMLLIElement) {
  const { dx, dy } = computeSlotDelta();
  li.style.transform = `translate(${dx}px, ${dy}px) translateX(-50%) rotate(0deg)`;
}

function returnToRing(li: HTMLLIElement) {
  li.style.transform = "";
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
  placeInSlot(li);
  setSelected(li, true);

  const label =
    button.querySelector(".visually-hidden")?.textContent?.trim() ?? "Key";
  if (hint) hint.textContent = `${label} selected. Drag the slider to insert it.`;
  if (slider) {
    slider.disabled = false;
    slider.value = "0";
  }
}

keyButtons.forEach((button) => {
  button.setAttribute("aria-pressed", "false");
  button.addEventListener("click", () => select(button));
});

window.addEventListener("resize", () => {
  if (selectedLi) placeInSlot(selectedLi);
});
