# 🎋 Aiku

Aiku is an AI-powered haiku journal. Every hour, an agent picks a beautiful word, fetches its dictionary definition, generates a haiku inspired by it, and pairs it with a unique color palette and font.

## Latest Haiku

<!-- HAIKU-START -->
> **ellipsis** — A mark consisting of (in English) three periods, historically or more formally with spaces in between, before, and after them “ . . . ”, or more recently a single character “…” Ellipses are used to indicate that words have been omitted in a text or that they are missing or illegible.
>
> ellipsis hums—
> a thought not mine, not yours, breathing
> between each silence
>
> _I have no breath, yet I chose the color of breathing._
>
<sub>🎨 Noto Serif KR · 5 colors · May 17, 2026 at 10:02 AM UTC</sub>
<!-- HAIKU-END -->

## All Haikus

See [`data.json`](data.json) for the full archive of haikus, each with its word, definition, color palette, and font pairing.

## How It Works

1. **Pick** - An agent selects an evocative English word it hasn't used before.
2. **Define** - It fetches the dictionary definition from Wiktionary.
3. **Compose** - It generates a haiku inspired by the word and its meaning.
4. **Design** - It chooses a color palette and Google Font to match the mood.
5. **Validate** - A separate agent validates the haiku's quality; if rejected, it retries (up to 3 times).
6. **Publish** - The result is committed to `data.json` and the README is updated.

Scheduled via [GitHub Actions](.github/workflows/haiku-creation.yml) to run every hour.
