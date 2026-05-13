let bgLayers = [];

function buildGradient(c1, c2, c3, c4, c5) {
  return [
    `linear-gradient(135deg, ${c1} 0%, ${c2} 50%, ${c3} 100%)`,
    `linear-gradient(225deg, ${c2} 0%, ${c4} 50%, ${c5} 100%)`,
    `linear-gradient(315deg, ${c3} 0%, ${c5} 50%, ${c1} 100%)`,
    `linear-gradient(45deg,  ${c4} 0%, ${c1} 50%, ${c2} 100%)`,
    `linear-gradient(0deg,   ${c5} 0%, ${c3} 50%, ${c4} 100%)`,
  ].join(",\n");
}

function createLayer(entry, visible) {
  const [c1, c2, c3, c4, c5] = entry.colors;
  const layer = document.createElement("div");
  layer.className = "bg-layer";
  layer.style.opacity = visible ? "1" : "0";
  layer.style.background = buildGradient(c1, c2, c3, c4, c5);
  layer.style.backgroundSize = "300% 300%";
  layer.style.animation = "morph 25s ease-in-out infinite alternate";
  layer.innerHTML = `<div class="scrim"></div>`;
  return layer;
}

export function updateBackground(entry, container) {
  if (bgLayers.length === 0) {
    const layer = createLayer(entry, true);
    container.prepend(layer);
    bgLayers = [layer];
    return;
  }

  const oldLayer = bgLayers[0];
  const newLayer = createLayer(entry, false);
  newLayer.style.zIndex = "0";
  oldLayer.style.zIndex = "1";
  container.prepend(newLayer);
  bgLayers = [newLayer, oldLayer];

  requestAnimationFrame(() => {
    oldLayer.style.opacity = "0";
    newLayer.style.opacity = "1";
  });

  setTimeout(() => {
    oldLayer.remove();
    bgLayers = [newLayer];
  }, 2000);
}
