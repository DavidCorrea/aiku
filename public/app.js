import { state, loadEntries, navigateTo } from "./state.js";
import { render, stopMelody } from "./render.js";

function navigate(index) {
  stopMelody();
  navigateTo(index);
  render();
}

function initKeyboard() {
  document.addEventListener("keydown", (e) => {
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
    }
  });
}

async function init() {
  await loadEntries();

  if (state.entries.length === 0) {
    document.getElementById("app").innerHTML = `<div class="loading">No palettes yet. Check back soon.</div>`;
    return;
  }

  window.app = { navigate };

  initKeyboard();
  initHashRouting();
  render();
}

init();
