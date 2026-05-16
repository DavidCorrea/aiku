function createLayer(entry, visible) {
  const [c1, c2, c3, c4, c5] = entry.colors;
  const layer = document.createElement("div");
  layer.className = "bg-layer";
  layer.style.opacity = visible ? "1" : "0";
  layer.style.background = [
    `linear-gradient(135deg, ${c1} 0%, ${c2} 50%, ${c3} 100%)`,
    `linear-gradient(225deg, ${c2} 0%, ${c4} 50%, ${c5} 100%)`,
    `linear-gradient(315deg, ${c3} 0%, ${c5} 50%, ${c1} 100%)`,
    `linear-gradient(45deg,  ${c4} 0%, ${c1} 50%, ${c2} 100%)`,
    `linear-gradient(0deg,   ${c5} 0%, ${c3} 50%, ${c4} 100%)`,
  ].join(",\n");
  layer.style.backgroundSize = "300% 300%";
  layer.style.animation = "morph 25s ease-in-out infinite alternate";
  layer.innerHTML = `<div class="scrim"></div>`;
  return layer;
}

export function updateBackground(entry, container) {
  const existingLayers = container.querySelectorAll(".bg-layer");
  const currentLayer = existingLayers[0] ?? null;

  if (!currentLayer) {
    container.prepend(createLayer(entry, true));
    return;
  }

  const incomingLayer = createLayer(entry, false);
  incomingLayer.style.zIndex = "0";
  currentLayer.style.zIndex = "1";
  container.prepend(incomingLayer);

  requestAnimationFrame(() => {
    currentLayer.style.opacity = "0";
    incomingLayer.style.opacity = "1";
  });

  setTimeout(() => {
    currentLayer.remove();
  }, 2000);
}
