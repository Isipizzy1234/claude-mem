# `video.json` reference

Coordinates are metres on the pitch: `[x, z]`, x across (−34 left … 34 right as
seen from the default camera), z along (−52.5 = **top goal**, +52.5 = bottom
goal). The default camera stands on the +z side looking towards the top goal.
Times inside a beat (`at`, `dur`, `until`, `hold`) are **seconds from the beat's
start**. Angles: radians, `0` = facing the top goal, `3.1416` = facing down.

## Top level

```jsonc
{
  "title": "Why man-marking gets you killed",   // project name only
  "handle": "",                                 // watermark; empty = none (user has no username yet)
  "voice": { "id": "am_puck", "speed": 1.2, "fx": "hype" },
                                                // id or blend "a:0.6,b:0.4"; fx none|punch|hype; null = silent
  "music": "music.mp3",                         // optional, path relative to video.json
  "musicVolume": 0.14,
  "sound": { "ambience": 0.09, "whoosh": 0.2, "kick": 0.32, "net": 0.38, "cheer": 0.2 },
                                               // gains; 0 disables one layer, false disables all sound effects
  "colors": { "green": "#3ddc84" },            // optional token overrides (style.md)
  "teams": {
    "A": { "name": "ATTACK", "color": "#ece7dc" },
    "B": { "name": "BLIND XI", "color": "#5b647b", "facing": 3.1416,
           "blindfold": true, "facesBall": false }
  },
  "lineups": [ ... ],      // generate 11 players from a shape
  "players": [ ... ],      // extra players or overrides (same id = merge)
  "ball": { "holder": "a7" },   // or { "at": [x, z] } for a free ball, "hidden": true
  "beats": [ ... ]
}
```

## Lineups

```jsonc
{ "team": "B", "shape": "4-4-2", "goal": "top", "prefix": "b",
  "line": 36, "front": 14, "depth": 1, "width": 1, "shift": [0, 0],
  "names": ["Donnarumma", "Hakimi", "Marquinhos", "Pacho", "Mendes", ...] }
```

- `goal`: the goal the team **defends** - `"top"` or `"bottom"` (default).
- Ids: `<prefix>1` is the GK, then rows from the back line forward, each row
  from the team's **left to right**. 4-3-3 → `a2–a5` defenders, `a6–a8`
  midfield, `a9–a11` front three (`a10` = centre forward).
- `line` / `front`: distance (m) of the back row / front row from the halfway
  line, inside the team's own half. `shift` moves the whole block (use it to
  push an attacking team into the opponent's half, e.g. `[0, -30]`).
- `names` (optional): labels in id order, shown by a beat's `"names"`.
- Shapes: 4-3-3, 4-4-2, 4-2-3-1, 3-5-2, 5-3-2, 3-4-3, 4-1-4-1, 5-4-1, 4-5-1,
  4-3-2-1, or any "n-n-n".

Explicit players: `{ "id": "you", "team": "B", "at": [8, -36], "label": "YOU",
"color": "#ffffff", "facing": 3.14, "blindfold": false }`.

## Beats

```jsonc
{
  "id": "gap",                          // unique, used in file names
  "chapter": "THE PROBLEM",            // shown until a beat sets a different chapter ("" hides)
  "title": ["AND NOW", "THERE IS A HOLE."],  // 1–2 lines, ≤ 5 words each
  "titleColor": "green",               // only for one-line titles
  "say": "And now there is a hole right in the middle of your defence.",
  "min": 2.0, "hold": 0.3, "dur": null, // beat length = max(min, voice + hold) unless dur is set
  "pace": "hype",                       // hype (1.08x) | calm (0.93x) | a number: voice speed for this line

  "camera": { "preset": "high", "focus": [6, -42], "span": 24,
              "yaw": 0, "el": null, "fov": null,
              "dur": 1.1, "drift": 0.06, "orbit": 0, "cut": false },
  // or exact: { "pos": [x, y, z], "look": [x, y, z], "fov": 40 }
  // focus may be a player id: "focus": "a9" (their position at the beat start)
  // no camera = the previous shot continues

  "moves":  [ { "p": "a9", "to": [4, -42], "at": 0.9, "dur": 1.4 },
              { "p": "B", "by": [0, -4], "at": 0, "dur": 1, "jitter": 1.5 } ],
  // p = player id or team key; to = [x,z] | player id; by = relative; jitter = seeded scatter (m)

  "passes": [ { "from": "a7", "to": "a9", "at": 0.15, "dur": 0.7 },
              { "to": [1.6, -53.4], "at": 1.15, "dur": 0.45, "lift": 1.4 } ],
  // from defaults to the current holder; to = player id (they receive) or [x,z] (shot / loose ball)
  // each pass draws a red arrow (arrow: false to skip), the passer kicks (kick: false to skip)

  "arrows": [ { "from": "a10", "to": [21, -41], "at": 0.1, "draw": 0.8,
                "color": "red", "head": true, "dash": true, "until": 2.5 } ],
  "links":  [ ["b2", "b3"], ["b3", "b4"] ], "linksAt": 1.1,  // white dashed formation lines
  "labels": [ { "p": "b3", "text": "YOU", "color": "green", "below": true },
              { "atPoint": [5, -38], "text": "GAP", "color": "green", "size": 36, "at": 0.3 } ],
  "names":  "B",                       // true | team key | [ids]: show lineup names
  "rings":  ["b3", { "p": "a10", "color": "#3ddc84", "at": 0.5 }],
  "hide":   ["A"],                     // team keys or ids hidden (faded) during this beat
  "stats":  { "PASSES": 9, "SHOTS": 0 }, "statsAt": 0.2,   // counters animate to these
  "badge":  "4-3-3",
  "sfx":    [ { "name": "cheer", "at": 1.2, "volume": 0.25 } ],  // extra cues: whoosh-1..3, kick, net, cheer
  "whoosh": false                     // no automatic whoosh on this beat's camera move
}
```

Notes:

- Automatic sound: whoosh on each camera change and fast run (`"whoosh": false`
  on a move or beat skips it), kick on each pass with a passer, net + cheer when
  a pass ends inside a goal (`"cheer": false` on the pass skips the cheer).

- Moves of one player must not overlap in time; chain them with `at`.
- Arrow/label/ring endpoints that are player ids are resolved at the arrow's
  start (and the target at the end of `draw`).
- Labels, rings and arrows last until the beat ends unless `until` (seconds
  from beat start) or `hold` (seconds from `at`) is given.
- `stats` keys appear in the ticker in first-seen order and stay until the end.
- Players keep their last position across beats; to "reset" a scene, move them
  back in the next beat (or hide them).

## Output project

`build.mjs` writes `index.html` (single root composition), `assets/lib`
(engine + Three.js), `assets/fonts`, `assets/vo/*.wav`, `timing.json`,
`hyperframes.json`, `package.json`. Edit the **spec** and rebuild - never
hand-edit the generated `index.html` (it is overwritten).
