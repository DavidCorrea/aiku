# Improvements — Aiku

Quality concerns noticed during work but out of scope for the current task.

## Entries

### Syllable counting is naive
The current syllable counter uses a simple vowel-group heuristic. It works for catching obvious non-haikus but may miscount edge cases (e.g., silent diphthongs, unusual words). Consider evaluating the `syllable` or `syllables` npm packages for more accurate counting if false positives/negatives become an issue.

### Signature duplication
The Critic sometimes allows signatures that are nearly identical across entries (e.g., "I dreamed in hex codes and woke up beautiful" appeared multiple times). Consider making the Critic stricter about signature uniqueness, or adding a programmatic similarity check.

### Melody/arpeggio uniqueness
There is no check for melody or sound similarity between entries. Two entries could end up with nearly identical chords, notes, or sound designs. Consider adding a uniqueness check or expanding the Critic's scope to cover sound.

### Store backward compatibility
When the `arpeggio` field was added/changed, existing entries in `data.json` needed manual migration. Consider adding a version field to entries and a migration system for future schema changes.

### Frontend has no tests
The entire frontend (`public/`) has no test coverage. The rendering logic in `render.js` is particularly fragile — it builds HTML via template literals and binds event handlers manually. Consider adding at least smoke tests for render output.
