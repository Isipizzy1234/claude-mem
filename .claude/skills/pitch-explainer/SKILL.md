---
name: pitch-explainer
description: Make English 9:16 TikTok/Reels/Shorts football explainer videos in the dark "3D tactics board" style - faceless mannequin players on a line-drawn pitch, condensed headline in white + mint green, mono chapter labels, red dashed pass arrows, ground rings, formation badges and live stat counters - fully in code with HyperFrames + Three.js and a local English voiceover. Use whenever the user asks for a new video, a script for one, a what-if football scenario, a tactics breakdown or a change to an existing pitch-explainer video.
---

# Pitch Explainer (TikTok football explainers)

Everything is code: one **spec file** (`video.json`) describes the story, the
players and every move; `scripts/build.mjs` turns it into a HyperFrames project
(Three.js pitch + GSAP text + per-beat voiceover); HyperFrames renders the MP4.

Videos are **always in English** (international audience), even when the user
talks to you in German or another language. Talk to the user in their language.

Read the HyperFrames skill (`/hyperframes`, `/hyperframes-cli`) for the render
contract and CLI. This skill only adds the format, the engine and the workflow.

## Files

| Path | What |
| --- | --- |
| `scripts/build.mjs` | `node build.mjs <video.json> <outDir> [--no-voice] [--voice id] [--speed n]` |
| `engine/pitch3d.js` | Deterministic Three.js pitch/figures/ball/camera/arrows/labels renderer |
| `engine/three.module.min.js`, `engine/fonts/` | Vendored Three.js r170, Anton + JetBrains Mono (OFL) |
| `references/style.md` | The visual bible: colours, type, layout px, what the frames look like |
| `references/spec.md` | Every field of `video.json` (lineups, beats, moves, passes, cameras …) |
| `references/script.md` | How to write the English script: hook, chapters, beat rhythm, wording |
| `examples/man-marking.json` | A complete working 24 s video - copy it as the starting point |

## Workflow

1. **Idea → script.** Turn the user's topic into an English beat list following
   `references/script.md` (hook question in beat 1, 6–10 beats, 2–4 s each,
   chapters, payoff, follow CTA). Show the user the beat list (say + title per
   beat) in a compact table and get a yes before building, unless they asked for
   no stops.
2. **Spec.** Write `videos/<slug>/video.json` (in the user's working dir, not in
   the skill folder). Start from `examples/man-marking.json`. Choreograph each
   beat: camera, moves, passes, arrows, labels, rings, stats (`references/spec.md`).
   Every beat must have visible motion (a move, a pass, an arrow, a camera
   change) - HyperFrames flags 3 s+ of stillness as `dead_stretch`.
3. **Build.** Kokoro TTS needs Python deps once per machine:
   ```bash
   uv venv ~/.cache/pitch-explainer/tts-venv -q
   uv pip install -q --python ~/.cache/pitch-explainer/tts-venv/bin/python kokoro-onnx soundfile
   export HYPERFRAMES_PYTHON=~/.cache/pitch-explainer/tts-venv/bin/python
   node .claude/skills/pitch-explainer/scripts/build.mjs videos/<slug>/video.json videos/<slug>/project
   ```
   Voice lines are cached by text+voice+speed, so rebuilding after a choreography
   change is instant. `timing.json` in the project lists each beat's start/end -
   use it to pick snapshot times. Default voice `am_michael` at 1.05×; other
   English voices: `am_adam`, `bm_george` (British), `af_heart`, `af_nova`.
   If the user signs in to HeyGen (`npx hyperframes auth login`) better voices
   are available via `/media-use`; drop the files into `assets/vo/` with the
   same names or set `"voice": null` and add your own `<audio>`.
4. **Check + look.** In the project dir:
   `npx hyperframes lint` → `npx hyperframes check` (0 errors) →
   `npx hyperframes snapshot --at <one time per beat>` and **read the contact
   sheet**. Compare against `references/style.md` "Frame checklist": goal and
   action below the headline, figures big enough, labels readable, nothing
   important under y = 1330 px. Fix the spec (camera focus/span first), rebuild,
   re-snapshot.
   The `nested_structure_needs_subcomposition` / `timeline_track_too_dense`
   lint warnings are expected: the generator keeps one root file on purpose.
5. **Render.** `npx hyperframes render --quality delivery -o <slug>.mp4` (use
   `--quality draft` while iterating). Verify with
   `ffprobe` that the duration matches `timing.json`, then send the MP4 to the
   user (SendUserFile). On Linux without GPU a 25 s video takes a few minutes;
   run it in the background.
6. **Deliver.** Give the user: the MP4, a suggested English TikTok caption with
   3–5 hashtags, and the hook line as on-screen text for the cover.

## Rules

- **Original concepts only.** The style is a format; never copy another
  creator's handle, watermark, exact titles or video ideas one-to-one. The
  handle is the user's own (`"handle"` in the spec - ask once and remember it in
  the spec of every new video).
- Real player/club names are fine as labels in tactics breakdowns (factual).
  No club crests or logos (not drawn, not downloaded).
- English only on screen and in the voiceover. Keep titles ≤ 5 words per line,
  ≤ 2 lines.
- Don't change the engine's look per video. If the user asks for a style change,
  change it in `engine/` or `references/style.md` so every future video gets it,
  and tell them.
- Music: only if the user gives a track (`"music": "path.mp3"`) or signs in to
  HeyGen for the catalog (`/media-use`). Never synthesise music in code.
