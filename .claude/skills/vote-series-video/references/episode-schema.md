# series.json / epNN.json

Full working examples: `examples/doug/` (English, Kokoro) and `examples/timmy/` (German, HeyGen).

## series.json

```jsonc
{
  "title": "Doug's Comeback",
  "lang": "en",                   // "de" | "en": UI strings + caption language
  "strings": {},                  // optional overrides of the UI string table
  "handle": "@dougs.comeback",
  "hero": "doug",                 // key in cast
  "heroName": "Doug",             // used in the default vote question
  "voice": { "provider": "kokoro", "id": "am_michael", "speed": 1.12 },   // provider kokoro|heygen|silent; Kokoro voice (am_adam, am_michael, bm_george, af_heart, af_nova, af_sky, bf_emma, bf_isabella)
  "hud": { "episodeLabel": "EPISODE", "countdownIcon": "heart", "countdownLabel": "DAYS LEFT", "progressLabel": "RICH LEVEL" },
  "cast": { "doug": { /* look, see SKILL.md */ }, "mom": { } }
}
```

## epNN.json

```jsonc
{
  "series": "series.json",
  "episode": 2,
  "daysLeft": 29,
  "progress": 0,                  // HUD bar start, percent
  "progressText": "0%",
  "captionY": 1250,               // optional
  "tail": 1.4,                    // seconds held after the last line
  "scenes": [ /* in order; one scene = one shot */ ]
}
```

### A normal scene

```jsonc
{
  "say": "His entire fortune: four dollars and twelve cents.",   // or ["line 1", "line 2"]
  "text": "His entire fortune: $4.12",        // optional caption text (string or array per line)
  "pauseAfter": 0.6,                          // optional silence after the last line (lets a gag land)
  "voice": { "id": "bf_emma", "speed": 1.08 },// optional: another character speaking
  "bg": { "type": "garage" },                 // + per-type options: wall, floor, sky, sign, signColor, poster, color, boxes, window, shelf
  "camera": "push",                           // push (default) | pull | punch | none
  "shake": ["w:rip"],  "flash": ["L1+0.8"],   // camera shake / white flash moments
  "cast": [{
    "who": "doug", "x": 540, "y": 1620, "scale": 1, "flip": false,
    "pose": "stand", "face": "neutral",
    "faces": [["w:truth", "panic"], ["L1", "cry"]],   // [time, face]
    "poses": [["w:step", "armsUp"]],                  // [time, pose]
    "lookAt": [8, 0],                                 // pupil offset
    "lookOverride": { "outfit": "suit" },             // per-scene costume
    "enter": "slideLeft", "enterAt": 0,               // none | pop | slideLeft | slideRight | drop | rise
    "moves": [{ "at": "L1", "x": 800, "dur": 0.6 }],
    "exit": "end-0.3"
  }],
  "props": [{
    "type": "sticker", "text": "AGE 32", "x": 240, "y": 640, "rot": -8, "scale": 1, "size": 50,
    "at": "w:thirty",            // when it appears; omitted = visible from the cut, no animation
    "anim": "pop",               // pop | slideUp | slideDown | slideLeft | slideRight | drop | fade | none
    "exit": "L1",                // optional fade-out time
    "z": "front",                // front (over cast) | back (behind cast)
    "sfx": "pop"                 // override the automatic sound, or false
  }],
  "sfx": [{ "name": "notification", "at": 0.05, "vol": 0.4 }],
  "hudProgress": [{ "at": "w:kilo", "to": 2, "text": "2%", "pop": "+2%" }],
  "captions": true
}
```

### Times (`at`, `faces`, `exit`, …)

Seconds from the scene's cut, or: `"L1"` start of line 1 (0-based) · `"w:pedal"` when that word is spoken (prefix match, `"w:and#2"` = second hit) · `"end-0.4"` · any of these `+0.3` / `-0.2`.

### Prop fields by type

| type | fields |
| --- | --- |
| burst | text, shape ("none" = bare word), size, bg, bg2, color, wiggle |
| bubble | text, maxChars, size, tail (down/left/right), tailX, accentLast |
| thought | text, icon, size |
| label | text, toX, toY (pointer line, relative), size |
| sticker | text, rot, size, color |
| bigText | text, size, color, strokeColor |
| chip / sign | text, size, (sign) color |
| calendar | month, day |
| wallet / scale | text |
| ring | color |
| photo | w, h, tilt, color, caption (polaroid; put a cast member inside it) |
| stand | text, closed, closedText, color |
| hanger | small, tag |
| trash / money | n |
| icon | name, size |
| phone | screen: `lock` (time, date, notifications [{app,title,text,color,at}]) · `chat` (name, status, clock, avatarColor, messages [{from:"me"|"them", text, img:"dark"|true, at}]) · `call` (name, label) · `post` (app, name, meta, text, imgIcon, imgColor, likes, comments, likesAt) · `app` (title, big, bigColor, sub, color, chart) |
| svg | markup (SVG drawn around 0,0) |

### Vote scene (last scene)

```jsonc
{
  "kind": "vote",
  "say": ["And this is where you come in. What should Doug do?", "Option A: …", "Option B: …", "Comment A or B. Your comment decides!"],
  "face": "sad",
  "question": "WHAT SHOULD DOUG DO?", "questionAt": "w:what",
  "a": { "text": "Sell his comic collection", "icon": "comic", "at": "L1", "tag": "safe" },
  "b": { "text": "Flip burgers at Burger Barn", "icon": "burger", "at": "L2" },
  "cta": "Write A or B in the comments!", "ctaAt": "L3"
}
```

### Recap scene (first scene from episode 2)

```jsonc
{
  "kind": "recap",
  "say": ["Yesterday, you decided.", "Doug flips burgers!"],
  "face": "grin",
  "a": { "text": "Sell comics", "icon": "comic", "pct": 38 },
  "b": { "text": "Flip burgers", "icon": "burger", "pct": 62 },
  "winner": "b", "winnerAt": "L1"
}
```
