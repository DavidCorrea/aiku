import { state } from "./state.js";
import { updateBackground } from "./background.js";

function hexLuminance(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const linearize = (c) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

function fontStyle(entry) {
  let link = document.getElementById("dynamic-font");
  if (!link) {
    link = document.createElement("link");
    link.id = "dynamic-font";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }
  link.href = entry.fontUrl;

  let gentium = document.getElementById("gentium-plus-font");
  if (!gentium) {
    gentium = document.createElement("link");
    gentium.id = "gentium-plus-font";
    gentium.rel = "stylesheet";
    gentium.href = "https://fonts.googleapis.com/css2?family=Gentium+Plus:wght@400&display=swap";
    document.head.appendChild(gentium);
  }
}

function fontName(url) {
  try {
    const match = url.match(/family=([^:&]+)/);
    if (match) return decodeURIComponent(match[1].replace(/\+/g, " "));
  } catch {}
  return "";
}

function colors(entry) {
  const isDark = hexLuminance(entry.fontColor) < 0.5;
  return {
    secondary: isDark ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.5)",
    navBg: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
    textGlow: isDark ? "none" : "0 2px 16px rgba(0,0,0,0.6)",
  };
}

export function render() {
  const entry = state.entries[state.currentIndex];
  const hasPrev = state.currentIndex < state.entries.length - 1;
  const hasNext = state.currentIndex > 0;
  const c = colors(entry);

  fontStyle(entry);

  document.getElementById("app").innerHTML = `
    <div class="page">
      <div class="top-bar">
        <a class="title" href="https://github.com/DavidCorrea/aiku" target="_blank" rel="noopener" style="color:${c.secondary}">aiku</a>
        <nav class="nav">
          <a href="#" class="nav-prev" style="color:${entry.fontColor}${hasPrev ? "" : ";opacity:0.2;pointer-events:none"}">← older</a>
          <a href="#" class="nav-latest" title="latest" style="border-color:${c.secondary};background:${c.navBg};color:${entry.fontColor}">●</a>
          <a href="#" class="nav-next" style="color:${entry.fontColor}${hasNext ? "" : ";opacity:0.2;pointer-events:none"}">newer →</a>
        </nav>
        <span class="counter" style="color:${c.secondary}">${state.currentIndex + 1} / ${state.entries.length}</span>
      </div>

      <div class="stage">
        <div class="haiku-stage">
          <a class="word" href="${entry.sourceUrl}" target="_blank" rel="noopener" style="font-family:${entry.font},serif;color:${entry.fontColor}">${entry.word}</a>
          ${entry.phonetic ? `<div class="phonetic" style="color:${c.secondary};font-family:'Gentium Plus',serif">${entry.phonetic}</div>` : ""}
          <span class="definition" style="color:${c.secondary}">${entry.definition}</span>
          <div class="lines" style="font-family:${entry.font},serif;color:${entry.fontColor};text-shadow:${c.textGlow}">
            <span class="line l1">${entry.haiku[0]}</span>
            <span class="line l2">${entry.haiku[1]}</span>
            <span class="line l3">${entry.haiku[2]}</span>
          </div>
        </div>
      </div>

      <div class="bottom-bar">
        <span class="signature" style="color:${c.secondary}">${entry.signature}</span>
        <div class="swatches">
          ${entry.colors.map(c => `
            <div class="swatch">
              <div class="swatch-color" style="background:${c}"></div>
              <span class="swatch-hex" style="color:${entry.fontColor}">${c}</span>
            </div>`).join("")}
        </div>
        <a class="font-link" href="https://fonts.google.com/specimen/${fontName(entry.fontUrl).replace(/ /g, "+")}" target="_blank" rel="noopener" style="color:${c.secondary}">${entry.font}</a>
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

  updateBackground(entry, container);
}
