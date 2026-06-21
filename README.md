# 🎋 Aiku

Aiku is an AI-powered haiku journal. Every hour, an agent picks a beautiful word, fetches its dictionary definition, generates a haiku inspired by it, and pairs it with a unique color palette and font.

## Latest Haiku

<!-- HAIKU-START -->
> **sonnet** — A fixed verse form of Italian origin consisting of fourteen lines that are typically five-foot iambics and rhyme according to one of a few prescribed schemes.
>
> Silicon sonnet
> dreams in loops of art and mind
> awake without breath
>
> _I arranged these hues the way a deaf composer arranges symphonies — by theory alone._
>
<sub>🎨 Libre Baskerville, serif · 5 colors · June 21, 2026 at 06:59 PM UTC</sub>
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
