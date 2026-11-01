# Visual bible

The look is a dark, minimal **3D tactics board**: a line-drawn pitch floating in
darkness, faceless mannequins, bold condensed headlines. It reads instantly on
a phone, muted or not.

## Canvas

- 1080 × 1920, 30 fps, 9:16.
- TikTok UI covers y < 168 px (status/search) and y > 1330 px (caption, buttons).
  All text and the key action live in **168–1330 px**. The bottom third shows
  only pitch texture and secondary players.
- The engine shifts the 3D picture up by `viewShiftY` (default 40 px) so the
  camera focus sits slightly above centre.

## Colour tokens

| Token | Hex | Use |
| --- | --- | --- |
| bg | `#151820` | Background, floor, fog |
| grid | `#262b38` | 6 m floor grid (the "board" texture) |
| line | `#e8ebf2` @ 62 % | Pitch lines, goal posts and net |
| ink | `#f4f4f2` | Headline line 1, labels, stats numbers |
| accent (mint green) | `#3ddc84` | Headline punchline, chapter square, "YOU" labels, "GAP" markers, counter flash |
| alert (red) | `#ff4a4a` | Pass / run arrows, stats bar |
| muted | `#8b93a5` | Chapter text, handle |
| Team light | `#ece7dc` | The attacking / "hero" side (white-beige mannequins) |
| Team dark | `#5b647b` | The other side (slate blue-grey) |

Real-club scenarios may use club-like colours for the teams (e.g. yellow
`#f2c230` vs navy `#22336b`), but keep pitch, text and arrows as above.

## Typography

- **Headline**: Anton ("PX Display"), 118 px, uppercase, line-height 0.98,
  left 40 px, top 240 px. Line 1 white, line 2 mint green (the punchline).
  A one-line title is white unless `"titleColor": "green"`.
  Words pop in (back-out, 0.22 s) across the first ~⅓ of the beat.
- **Chapter label**: green 18 px square + JetBrains Mono 500 ("PX Mono"), 30 px,
  letter-spacing 0.2em, muted, at top 196 px. Examples: `THE PROBLEM`,
  `THE LINEUP`, `THE SIMULATION`, `THE RESULT`, `THE FIX`, `TEAM A VS TEAM B`.
- **Player labels** (canvas): PX Mono 700, 26–30 px, white (or green for the
  viewer's player "YOU"), soft shadow, above the head; `"below": true` puts
  them under the feet (use when two labels would collide).
- **Stats ticker**: red 6 × 46 px bar + PX Mono 700 36 px, `PASSES 9 · SHOTS 0`,
  top 1192 px. A changed number flashes green and scales 1.35 → 1.
- **Formation badge**: PX Mono 700 52 px in a 4 px white box (`4-3-3`), top 520 px.
- **Handle**: PX Mono 500 28 px, muted, top 1272 px, whole video.

## 3D scene

- Pitch: 105 × 68 m, lines as 14 cm ribbons, both penalty areas, arcs, centre
  circle, goals with posts and a grid net. Linear fog fitted to camera distance
  fades everything far away into the background.
- Figures: capsule torso, sphere head, capsule limbs, matte Lambert, blob
  shadow. Rendered 1.3× life size and scaled up further on wide shots so a
  top-down formation still reads. Walk/run cycle from speed, kick pose on every
  pass, idle sway. Players face the ball when standing.
- Blindfolded team (`"blindfold": true`): white band over the eyes, arms
  reaching forward, heading drifts, never faces the ball.
- Ball: small white sphere with shadow, glued to the holder's foot, eased on
  passes, arcs with `lift`.
- Rings: white ground ring under a highlighted player, pops in.
- Arrows: dashed (18/13 px), 5 px, red with a head for passes and runs; white,
  4 px, no head for formation links. Drawn on over the pass duration and held
  until the beat ends.

## Camera language

| Preset | Elevation | Default span | Use |
| --- | --- | --- | --- |
| `high` | 52° | 17 m | Default. Close tactical view, like a drone over the box |
| `broadcast` | 34° | 22 m | More depth, for shots and runs towards goal |
| `low` | 16° | 12 m | Drama: one player, a duel |
| `top` | 78° | 78 m | Line-ups and shapes (with `badge` + `links` + `names`) |

`span` = metres visible across the frame at the focus point (smaller = closer).
Moves between beats blend over 1.1 s (ease in-out); each shot drifts 6 %
towards the focus point; `orbit` (radians) adds a slow turn - use it on the
outro. `cut: true` for a hard cut.

## Frame checklist (look at every snapshot)

1. Headline readable, nothing important behind it. When the goal is in frame it
   sits just under the headline (move `focus` z towards the goal, i.e. more
   negative, if it hides behind the text).
2. The figure the voice talks about is big (≥ 120 px tall) and labelled/ringed.
3. Arrows start and end on screen.
4. Labels don't overlap each other or the stats line.
5. Nothing important below y = 1330 px.
6. Something moves in every beat.
