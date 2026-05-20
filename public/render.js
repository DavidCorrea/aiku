import { state } from "./state.js";
import { updateBackground } from "./background.js";
import { stopMelody, playArpeggio } from "./audio.js";

let soundEnabled = false;

function hexLuminance(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const linearize = (c) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

export function render() {
  const entry = state.entries[state.currentIndex];
  const hasPrev = state.currentIndex < state.entries.length - 1;
  const hasNext = state.currentIndex > 0;

  const isDarkText = hexLuminance(entry.fontColor) < 0.5;
  const secondary = isDarkText ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.5)";
  const navBg = isDarkText ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)";
  const textGlow = isDarkText ? "none" : "0 2px 16px rgba(0,0,0,0.6)";

  let fontLink = document.getElementById("dynamic-font");
  if (!fontLink) {
    fontLink = document.createElement("link");
    fontLink.id = "dynamic-font";
    fontLink.rel = "stylesheet";
    document.head.appendChild(fontLink);
  }
  fontLink.href = entry.fontUrl;

  let gentiumLink = document.getElementById("gentium-plus-font");
  if (!gentiumLink) {
    gentiumLink = document.createElement("link");
    gentiumLink.id = "gentium-plus-font";
    gentiumLink.rel = "stylesheet";
    gentiumLink.href = "https://fonts.googleapis.com/css2?family=Gentium+Plus:wght@400&display=swap";
    document.head.appendChild(gentiumLink);
  }

  document.getElementById("app").innerHTML = `
    <div class="page">
      <div class="top-bar">
        <a class="title" href="https://github.com/DavidCorrea/aiku" target="_blank" rel="noopener" style="color:${secondary}">aiku</a>
        <nav class="nav">
          <a href="#" class="nav-prev" style="color:${entry.fontColor}${hasPrev ? "" : ";opacity:0.2;pointer-events:none"}">←</a>
          <a href="#" class="nav-latest" title="latest" style="border-color:${secondary};background:${navBg};color:${entry.fontColor}">●</a>
          <a href="#" class="nav-next" style="color:${entry.fontColor}${hasNext ? "" : ";opacity:0.2;pointer-events:none"}">→</a>
        </nav>
        <div class="top-right">
          <span class="counter" style="color:${secondary}">${state.currentIndex + 1} / ${state.entries.length}</span>
          <a href="#" class="nav-sound" title="${soundEnabled ? "mute sound" : "enable sound"}" style="border-color:${secondary};background:${navBg};color:${entry.fontColor}">${soundEnabled ? "◉" : "◎"}</a>
        </div>
      </div>

      <div class="stage">
        <div class="haiku-stage">
          <a class="word" href="${entry.sourceUrl}" target="_blank" rel="noopener" style="font-family:${entry.font},serif;color:${entry.fontColor}">${entry.word}</a>
          ${entry.phonetic ? `<div class="phonetic" style="color:${secondary};font-family:'Gentium Plus',serif">${entry.phonetic}</div>` : ""}
          <span class="definition" style="color:${secondary}">${entry.definition}</span>
          <div class="lines" style="font-family:${entry.font},serif;color:${entry.fontColor};text-shadow:${textGlow}">
            <span class="line l1">${entry.haiku[0]}</span>
            <span class="line l2">${entry.haiku[1]}</span>
            <span class="line l3">${entry.haiku[2]}</span>
          </div>
        </div>
      </div>

      <div class="bottom-bar">
        <span class="signature" style="color:${secondary}">${entry.signature}</span>
        <div class="swatches">
          ${entry.colors.map(c => `
            <div class="swatch">
              <div class="swatch-color" style="background:${c}"></div>
              <span class="swatch-hex" style="color:${entry.fontColor}">${c}</span>
            </div>`).join("")}
        </div>
        <div class="bottom-actions">
          <a class="font-link" href="https://fonts.google.com/specimen=${entry.font.replace(/ /g, "+")}" target="_blank" rel="noopener" style="color:${secondary}">${entry.font}</a>
        </div>
      </div>
    </div>
  `;

  const container = document.getElementById("app");

  container.querySelector(".nav-prev")?.addEventListener("click", (e) => {
    e.preventDefault();
    if (hasPrev) window.app.navigate(state.currentIndex + 1);
  });
  container.querySelector(".nav-next")?.addEventListener("click", (e) => {
    e.preventDefault();
    if (hasNext) window.app.navigate(state.currentIndex - 1);
  });
  container.querySelector(".nav-latest")?.addEventListener("click", (e) => {
    e.preventDefault();
    window.app.navigate(0);
  });

  container.querySelector(".nav-sound")?.addEventListener("click", (e) => {
    e.preventDefault();
    soundEnabled = !soundEnabled;
    e.target.textContent = soundEnabled ? "◉" : "◎";
    if (soundEnabled && entry.arpeggio) {
      playArpeggio(entry.arpeggio);
    } else {
      stopMelody();
    }
  });

  updateBackground(entry, container);

  if (soundEnabled && entry.arpeggio) {
    playArpeggio(entry.arpeggio);
  }
}

export { stopMelody };
