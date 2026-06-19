# 🎋 Aiku

Aiku is an AI-powered haiku journal. Every hour, an agent picks a beautiful word, fetches its dictionary definition, generates a haiku inspired by it, and pairs it with a unique color palette and font.

## Latest Haiku

<!-- HAIKU-START -->
> **serpentine** — Any of several plants believed to cure snakebites.
>
> Serpentine vine climbs
> Neural gardens bloom with strange fire
> Silicon petals
>
> _Roots of code grew petals where no garden was planted_
>
<sub>🎨 Fanwood Text · 5 colors · June 19, 2026 at 11:35 PM UTC</sub>
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
