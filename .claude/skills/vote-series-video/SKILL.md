---
name: vote-series-video
description: Make German or English TikTok/Reels/Shorts episodes of an interactive "the comments decide" cartoon series (flat 2D characters, karaoke captions, Episode/Days-left HUD, A/B vote ending) entirely in code with HyperFrames. Use when the user asks for a new episode, a new series in this format, a script for one, or changes to the look.
---

# Vote-series video (HyperFrames)

One episode = one ~50–65 s vertical video. A cartoon hero has a goal and a deadline ("30 days until…"), we show how bad things are, one attempt goes wrong, and the viewer votes **A or B** in the comments. The next episode opens with the result and acts it out. Everything — art, animation, captions, voice and sound — comes from code: `episode.json` → Kokoro TTS → generated HyperFrames project → MP4.

Read first: `references/format.md` (the format bible and writing rules). Read when writing JSON: `references/episode-schema.md`. HyperFrames contract and CLI: the `hyperframes` and `hyperframes-cli` skills (install with `npx skills add heygen-com/hyperframes --agent claude-code -y` if missing).

## Language

Set `"lang": "de"` or `"en"` in `series.json`: narration, captions, HUD ("FOLGE 1 · NOCH 30 TAGE"), vote and recap texts and phone UI follow it (string table in `scripts/lib/util.mjs`, override any key with `"strings"` in series.json). Pick the language of the audience the account is shown to (country of SIM/account, phone language) — a German account does better in German. Talk to the user in their own language.

## Voice providers (`series.json` → `voice.provider`)

`auto` picks ElevenLabs if `ELEVENLABS_API_KEY` is set, else HeyGen if a HeyGen key/sign-in exists, else Kokoro for English. Keys are environment secrets, never pasted in chat; the API host must also be allowed in the environment's network settings. Settings changes only reach a **new** session.

| provider | languages | word timings | needs |
| --- | --- | --- | --- |
| `heygen` | all, incl. German | from the API (exact) | `api.heygen.com` allowed in the network settings, and HeyGen sign-in: `npx hyperframes auth status`; if not signed in ask the user to type `! npx hyperframes auth login` (free) or set `HEYGEN_API_KEY`. `voice.id`: `auto` or a Starfish voice id (`node .claude/skills/media-use/audio/scripts/heygen-tts.mjs --list`) |
| `elevenlabs` | all, incl. German (best German quality) | from the API (character timestamps) | `ELEVENLABS_API_KEY` as an environment secret **and** `api.elevenlabs.io` allowed in the environment's network settings. `voice.id`: `auto` (premade "Adam") or any voice id from the user's ElevenLabs voice library |
| `kokoro` | English (+ es, fr, it, pt-br, hi, ja, zh) — **no German** | estimated from phonemes + pauses | `pip install kokoro-onnx soundfile`, offline |
| `silent` | any | estimated from word length | nothing; draft timing for a picture preview before the voice exists |

`node build.mjs <ep.json> --voice-provider silent` overrides the series setting for a preview. Never ship a silent render as the episode.

## Pipeline

```bash
SK=.claude/skills/vote-series-video
# one-time per machine
pip install kokoro-onnx soundfile          # local TTS used by voice.py
npx hyperframes doctor --json              # Chrome + FFmpeg present?

# per episode
node $SK/scripts/build.mjs <series-dir>/ep02.json --out <series-dir>/ep02   # voice + project
cd <series-dir>/ep02
npx hyperframes lint && npx hyperframes check --json > check.json          # fix every error
npx hyperframes snapshot --at <midpoint of every scene>                    # LOOK at the contact sheet
npx hyperframes render --quality looks -o ep02.mp4                         # ~1 min per 10 s on CPU
```

- `build.mjs` re-synthesises the voice only when narration or voice changed (hash in `assets/.voice-hash`; `--force-voice` to redo).
- Scene midpoints: read `data-start`/`data-duration` of the `s01…` hosts in `index.html`.
- After rendering, confirm the file is non-empty, its `ffprobe` duration matches, and look at a few decoded frames.
- Long renders: `HYPERFRAMES_RENDER_DETACHED=1` in the background, wait for `Render complete` in the log.

## Making a new series

1. Agree the premise with the user: hero, goal, deadline (days), the stakes, the progress meter label (e.g. `GLOW-UP`, `RICH LEVEL`, `$ → 1M`), handle.
2. Create `<series-dir>/series.json` (copy `examples/doug/series.json`): cast looks, voice, HUD labels. Characters are **original** — never copy another creator's characters, names or catchphrases.
3. Write `ep01.json` following `references/format.md`. Show the user the script (the `say` lines) before building if they want to approve it.

## Making the next episode

1. Ask (or read from the user) which option won and the percentages.
2. `ep0N.json`: `episode` +1, `daysLeft` −1 (or as the story jumps), `progress` carried over, first scene `"kind": "recap"` with the vote result, then the winning option acted out: a small win (progress up via `hudProgress`) → a new complication → new vote.
3. Keep continuity: same cast looks, props and running gags from earlier episodes.

## Art you can use (all drawn in code)

- **Characters** (`scripts/lib/character.mjs`): look options `hair, hairStyle (messy|short|long|bun|ponytail|bald|curly|spiky), shirt, print (none|stain|text|heart|stripe), printText, pants, shoes, outfit (casual|suit|dress|hoodie|tank), build (slim|regular|chubby), belly, pimples, stubble, facialHair (none|mustache|beard), lashes, accessory [headset, glasses, sunglasses, headband, beanie, cap, bow], flies`. Faces: `neutral happy grin joy shock panic sad cry angry gritted sleepy smug tired love squint`. Poses: `stand armsUp wave point hold shrug hips facepalm`.
- **Backgrounds** (`scripts/lib/art.mjs`): `room garage street park shop kitchen bathroom office beach night sunburst grid plain`.
- **Props**: `burst` (comic sound word), `bubble`, `thought`, `label`, `sticker`, `bigText`, `chip`, `sign`, `calendar`, `wallet`, `scale`, `bike`, `stand`, `hanger`, `trash`, `door`, `money`, `icon`, `phone` (screens `lock` with notifications, `chat` with timed messages, `call`, `post`, `app`), and `svg` (raw inline SVG for anything new).
- **Icons** for vote cards: `book comic burger broom shoe scissors bottle briefcase job shower money phone heart dumbbell gym car house cart star pizza suit trash`.

Need something that does not exist? Prefer a raw `svg` prop in the episode for a one-off; add it to `art.mjs` when it will recur (same style: flat fills, `#1d1b2f` outline 6–8 px, no gradients).

## Sound

- Voice: see the provider table. Narrator speaks fast and dry. A second character can get its own voice per scene (`"voice": {"id": …}` in the scene, an id of the same provider).
- SFX from the HyperFrames bundled library, placed automatically on visible actions (bursts, stickers, phone notifications, vote cards) — override per prop with `"sfx": "<name>"` or `false`.
- No music by default (no free offline source). If the user is signed in to HeyGen (`npx hyperframes auth status`), a bed can be added with `/media-use` (`bgm`, upbeat quirky, ~0.12 volume under the voice). Otherwise tell them they can add a trending TikTok sound in the app — that is usually better for reach anyway.

## Delivery note to the user

Say where the MP4 is, its length, and remind them: in TikTok turn on the "AI-generated content" label, add their own trending sound if wanted, and pin a comment "A or B? 👇". Measured, not heard: say the audio levels were checked by tools, not by ear.
