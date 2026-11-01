# The format bible

Derived frame by frame from three reference episodes (German originals, ~60–70 s each, 9:16, all from different accounts using the same formula). Our version is English.

## The engine of the series

- **A hero, a goal, a deadline.** "30 days until his first date", "30 days to get a million". The countdown is on screen all the time.
- **The audience steers.** Every episode ends on an A/B choice. The next episode starts with "Last episode, you decided…" and acts out the winner. Comments are the growth engine: the CTA is the most important line.
- **Episodes are serial.** Episode number and days left change every time; a progress meter (GLOW-UP %, money) creeps up in small, earned steps.

## Beat sheet (≈55 s, ~140–160 spoken words)

| Time | Beat | Picture |
| --- | --- | --- |
| 0–2 s | **Hook**: the number and the stakes in one line. "Thirty days." | The hero in his habitat, already on screen at frame 0 (thumbnail). Never a black or text-only first frame. |
| 2–8 s | **Setup**: goal, deadline, why it matters. | A phone (lock screen notification, chat, post), calendar, the person who sets the goal. |
| 8–20 s | **How bad it is**: 3–4 rapid, exaggerated, *specific* details. "His deodorant is so old there's dust on it." | One prop or close-up per detail, sticker/label pops on the key word, flies, stains. |
| 20–42 s | **The attempt**: a chain of 4–6 short cause→effect gags that escalate and backfire. | Hard cut every 1–3 s, comic sound words (RRRIP!, SPLAT!, BONK!), face changes, camera shake on the hit. |
| 42–47 s | **Rock bottom**: the hero realises it won't work alone. | Crying/sad face on a sunburst background. |
| 47–57 s | **Vote**: "And this is where YOU come in. What should X do? Option A… Option B… Comment A or B. Your comment decides!" | Dimmed hero, big two-line question (white + yellow), blue A card, orange B card with icons, white CTA pill. |

Episode 2+ inserts at the start: **Recap (4–6 s)** — "Yesterday you decided Doug has to go jogging." with animated result bars (60 % WINNER! / 40 %), then the winning option is acted out (small win → progress meter + "+2%"), then a **new complication** creates the next vote.

### Writing rules (English)

- Third-person narrator, present tense, short punchy sentences; deadpan, a little mean, never cruel.
- One idea per sentence; 3–9 words per sentence is the sweet spot. Numbers are concrete and odd ($4.12, 1.2 km, since 2019).
- Every detail must be *visual* — if you can't draw it in one shot, cut it.
- Rule of three for "how bad it is"; escalate the attempt; the last gag is the biggest.
- Both options must be tempting and have a downside ("Quick cash, but…"). Options that split the audience ~50/50 get the most comments.
- Write numbers in `say` as words so the voice reads them right ("thirty-two"), and put the digits in `text` for the captions ("32").
- Avoid brand names, real people and other creators' characters.

## Visual language

- **Style**: flat 2D vector cartoon, thick dark outlines (`#1d1b2f`), no gradients except the phone. Characters have a huge round head, big white eyes with small pupils, rosy cheeks, puffy shoulder balls, short legs, chunky shoes. Slobs get pimples, stubble, stains and orbiting flies.
- **Palette**: dark violet base (`#2a2152`, `#17132b`), purple `#6b4ff0`, yellow `#ffd23f`, red `#e8414b`, blue `#3466f0`, orange `#f5862b`, green `#36c26b`.
- **Framing**: hero centred, full body, feet at ~83 % height; simple single-location backgrounds; phone screens fill the middle of the frame.
- **Motion**: hard cuts, no transitions. Inside a shot: slow push-in, idle breathing, blinks, props pop in on their word (scale overshoot), sound words wiggle, camera shake on impacts, white flash on the biggest hit.
- **HUD** (top, fixed all video): `EPISODE N` purple pill + `♥ N DAYS LEFT` dark pill, and below it a progress bar with label and value.
- **Captions**: Montserrat Black, uppercase, white with a thick dark stroke, 2–3 words at a time in the lower middle; the word being spoken turns **yellow** (karaoke). They sit over the character — that is part of the look.
- **Platform safety**: nothing important in the top 168 px or below ~1330 px (TikTok UI); captions at y≈1250.

## What the builder already does for you

- Scene length = its narration; cuts land 60 ms before each line.
- Word-timed events: any `at` can be `"w:word"` so a prop pops exactly when the word is spoken.
- Auto SFX on pops, phone pings, vote cards, recap winner.
- Expressions change with an anticipation squash; arms swing with overshoot; blinks and breathing are seeded, so every render is identical.
