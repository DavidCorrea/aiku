import { state, loadEntries, navigateTo } from "./state.js";
import { render, stopMelody } from "./render.js";
import { initInfoKeyboardListener, isInfoPanelOpen } from "./infoPanel.js";

function navigate(index) {
  stopMelody();
  navigateTo(index);
  render();
  updateInfoPanelState();
}

function initKeyboard() {
  document.addEventListener("keydown", (e) => {
    // Skip navigation when the info panel is open
    if (isInfoPanelOpen()) return;

    if (e.key === "ArrowLeft" && state.currentIndex < state.entries.length - 1) {
      navigate(state.currentIndex + 1);
    } else if (e.key === "ArrowRight" && state.currentIndex > 0) {
      navigate(state.currentIndex - 1);
    } else if (e.key === "Home" || e.key === "0") {
      navigate(0);
    }
  });
}

function initHashRouting() {
  window.addEventListener("hashchange", () => {
    const hash = window.location.hash.replace("#", "");
    const idx = state.entries.findIndex(e => e.word === hash);
    if (idx >= 0) {
      state.currentIndex = idx;
      render();
      updateInfoPanelState();
    }
  });
}

function updateInfoPanelState() {
  window.__currentEntry = state.entries[state.currentIndex] ?? null;
  window.__totalEntries = state.entries.length;
}

async function init() {
  await loadEntries();

  if (state.entries.length === 0) {
    document.getElementById("app").innerHTML = `<div class="loading">No palettes yet. Check back soon.</div>`;
    return;
  }

  window.app = { navigate };
  updateInfoPanelState();

  initKeyboard();
  initInfoKeyboardListener();
  initHashRouting();
  render();
}

init();
