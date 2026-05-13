export const state = {
  entries: [],
  currentIndex: 0,
};

export async function loadEntries() {
  const res = await fetch(`data.json?v=${Date.now()}`);
  const data = await res.json();
  state.entries = data.entries;

  const hash = window.location.hash.replace("#", "");
  const hashIndex = state.entries.findIndex(e => e.word === hash);
  state.currentIndex = hashIndex >= 0 ? hashIndex : 0;
}

export function navigateTo(index) {
  state.currentIndex = index;
  window.location.hash = state.entries[index].word;
}
