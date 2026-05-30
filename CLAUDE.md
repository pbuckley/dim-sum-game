# Trivia game collection — Claude project notes

A monorepo of small browser-based trivia games. Each game is a single HTML file
plus a JSON data file. No build step, no backend. Serve with `python3 -m http.server`
(or any static server) and visit `http://localhost:8000/`.

## Repo layout

```
index.html         carousel game selector (left/right cycles games, Enter plays)
<game>.html        one game per file (e.g., dimsum.html, hershey.html)
<game>-data.json   matching data file (e.g., dimsum-data.json, hershey-data.json)
validate.js        data validator — runs in browser on load AND from CLI
scaling.js         viewport scaling for big-screen play (TV/projector)
keynav.js          keyboard shortcuts for in-game play (A/B/C/D, Enter, ←/→, R)
seed-<game>.md     optional: raw clue seeds before they're shaped into rounds
```

The naming pattern `<game>.html ↔ <game>-data.json` is load-bearing: validate.js
discovers all `*-data.json` files automatically, and each game's HTML fetches
its own data file by name.

## Adding a new game

1. Copy `hershey.html` (or `dimsum.html`) → `<newgame>.html`. Update:
   - `<title>` and the visible `.title` div
   - the `fetch("...-data.json")` URL and both error messages that reference it
2. Create `<newgame>-data.json` (see schema below). Don't seed it with the
   donor game's data — start fresh or use a `seed-<newgame>.md` file.
3. Add an entry to `index.html`'s `GAMES` array: `{ emoji, name, tagline, href }`.
4. Run `node validate.js` and load the game in a browser before declaring done.

Do NOT remove `<script src="validate.js"></script>`, `<script src="scaling.js"></script>`,
or `<script src="keynav.js" defer></script>` from any game — all three are required
infrastructure. `keynav.js` needs `defer` so it runs after the inline script
defines the per-game globals (`togglePick`, `submitAnswer`, `revealAll`,
`nextRound`, `prevRound`).

## Data file schema

```json
{
  "teams": ["Team 1", "Team 2"],
  "rounds": [
    {
      "clues": [
        {"l": "A", "text": "Days of Creation (before God rested)", "n": 6},
        {"l": "B", "text": "Books in the New Testament",           "n": 27},
        {"l": "C", "text": "Number of Commandments",               "n": 10},
        {"l": "D", "text": "Wheels on a tricycle",                  "n": 3}
      ],
      "answer": 16, "op": "+", "correct": ["A", "C"]
    }
  ]
}
```

Rules:
- Exactly 4 clues per round, letters A/B/C/D, no duplicates within a round.
- `op` must be `+`, `×`, or `−` (Unicode multiplication and minus, not `*`/`-`).
- `correct` is exactly 2 letters; their values under `op` must equal `answer`.
- For `−`, put the larger value at `correct[0]` so the displayed equation reads
  naturally (`153 − 150 = 3`, not `150 − 153`).
- No other pair of clues in the round may also satisfy the equation. The
  validator enforces this; design with it in mind from the start.

## Hard rules the validator enforces (and you must respect)

Run `node validate.js` after any data change. It catches:

1. **Ambiguous answers** — two different pairs both satisfying the equation.
   The classic trap: round contains two clues with the same value (e.g., both `12`),
   and the equation is `12 × 5 = 60` → either 12 paired with the 5 works.
2. **Math errors** — `correct` pair doesn't actually evaluate to `answer`.
3. **Duplicate letters** within a round (would collide on `cr-<letter>` DOM IDs).
4. **Missing/bad fields** — wrong op, non-numeric values, malformed `correct`.

If validation fails the game refuses to render and shows the errors instead.
Fix them before claiming the work is done.

## Authoring rules Claude must follow without being told

These are recurring mistakes — don't repeat them:

### Randomize correct-pair positions

**Never default to `["A", "B"]` for every round.** Spread the correct pair
across all six unordered pairs: `A,B / A,C / A,D / B,C / B,D / C,D`. For ~12
rounds aim for 2–3 of each. Concretely, when building a round:

1. Decide the equation and which two clue values are correct.
2. Pick a position pair from the six options, biased toward whichever pair has
   the fewest rounds so far in this game.
3. Place the correct values at those positions; shuffle distractors into the
   remaining slots.
4. For subtraction, keep larger-at-correct[0] regardless of which position
   letter that ends up being.

If asked to "add a round" to an existing game, count current letter-pair usage
and bias the new round toward an under-represented pair.

### Design distractors deliberately

A distractor isn't filler — it's the difficulty knob. Each round should have:

- **At least one "trap" distractor** whose numeric value equals the `answer`
  (e.g., if answer=88, include a `Milton Hershey died at 88` clue as a wrong
  option). Forces the player to do the math, not pattern-match.
- **At least one obviously-wrong distractor** (very large or very small number)
  so the round isn't impossibly tight.
- Distractors should be **on-theme** with the game (Bible game → Bible/Christian/
  kid clues; Hershey game → Hershey/candy clues). Off-theme distractors feel
  random and break immersion.
- **Avoid value `1` as a distractor in `×` rounds** — `1 × X = X` will create
  ambiguity if any other clue equals the answer. The validator will catch it,
  but design it out from the start.

### Avoid duplicate clue text across rounds

The same fact shouldn't be a clue in two different rounds — it's tedious for
the player and wastes design surface. Each clue text appears at most once per
data file. Different rounds may have clues with the same *value* (e.g., one
round's `Disciples of Jesus = 12` and another's `Months in a year = 12`),
just different text.

### Category mixing (themed games)

For a Bible-themed game, every round should be a *mix* — not one round all-Bible
followed by one round all-general-knowledge. Aim for 25–50% non-theme clues per
round. The mixed-in clues should still feel age- and audience-appropriate
(kid-friendly facts, Christian pop culture for a church-audience game, etc.).

### Use existing UI patterns

The game HTML scaffolding (scoreboard, mode toggle, coin-flip, clue grid,
controls bar, game-over screen) is consistent across all games. When cloning,
preserve it. Don't invent new layouts unless the user asks. Particularly:

- Clue rows themselves are the answer buttons (no separate A/B/C/D button row).
- Mode toggle (Solo vs Two teams) appears above the scoreboard, hides after
  round 1.
- Coin-flip "who goes first?" selector appears above the turn indicator in
  Two-team mode only, hides after round 1.
- Body class `mode-solo` collapses the second team's UI.

## Trivia design — general principles

- **Verifiable facts only.** If a number comes from tradition rather than a
  primary source (e.g., "3 Wise Men" — Matthew doesn't specify), label it as
  such in the clue text or skip it. Players will challenge wrong answers.
- **Pace difficulty.** Open with an easy round to set rhythm; ramp up. Don't
  open with `153 − 150 = 3`.
- **Mix operators.** Aim for roughly balanced `+ / × / −` across the game.
  An all-multiplication game gets monotonous and gives away the strategy.
- **Pick "satisfying" reveals.** When two clues' values combine cleanly to a
  meaningful number, the round feels designed. `Loaves(5) + Baskets(12) = 17`
  beats `Some random number + some random number = arbitrary total`.
- **Sanity-check ambiguity manually before validating.** Especially in `×`
  rounds — products grow fast and collisions are easy to miss.
- **Verify candy/Bible/etc. facts before committing them.** "Year Toblerone
  introduced" should match what Wikipedia and the Toblerone company agree on.

## Web-based trivia specifics

- **No backend, no auth, no analytics.** State lives in memory (game progress)
  or `localStorage` (size preference). Don't add backend dependencies.
- **Must work offline** once the page is loaded. No CDN-required behavior in
  the game logic itself (the Tabler icons CDN link in `<head>` is cosmetic
  and the game runs fine without it).
- **Serve over HTTP, not `file://`.** `fetch()` for the JSON file blocks on
  `file://`. Each game's error panel already tells the user this. Don't
  switch to inlined data — it defeats the point of editable JSON.
- **Keyboard-friendly.** Existing shortcuts: `+/-/0` for size (scaling.js);
  `A/B/C/D` to pick a clue, Enter to submit, `←/→` to navigate rounds, `R` to
  reveal all (keynav.js); `←/→` and Enter on the carousel. Don't add new
  shortcuts that conflict. Every game must define `prevRound()` so the `←`
  shortcut works — see existing games for the one-liner.
- **Re-answering protection.** Each game tracks `answeredRounds` as a `Set`
  and refuses to re-score if the player navigates back to an answered round.
  Preserve this pattern when cloning — don't let `prevRound` allow score
  inflation.
- **Big-screen play matters.** Use the size toggle (top-right corner) to
  preview at 2×/3× before declaring a layout finished. Things that look fine
  at 1× sometimes wrap awkwardly at 3×.

## Testing checklist before finishing a game change

1. `node validate.js` — must pass for every `*-data.json`.
2. Open the game in a browser. Play round 1 in Two-team mode, confirm scoring
   and the next-team-up rotation.
3. Toggle to Solo mode at the start; confirm Team 2's card disappears, no
   coin-flip, no turn indicator, and game-over shows `X of N correct`.
4. Bump to 2× via the size toggle; confirm nothing wraps or overflows.
5. Check that the carousel on `index.html` still navigates to the changed game.

## Don'ts (recurring failure modes)

- Don't make every round's correct pair `["A", "B"]`. (Distribute.)
- Don't make every round's `op` the same. (Vary.)
- Don't include two clues with the same value when one of them, paired with
  another clue, also satisfies the equation. (Validator catches; design out.)
- Don't reuse identical clue text across rounds.
- Don't write `*` or `-` for op — use `×` and `−`.
- Don't open the game by double-clicking the file — `fetch()` will fail.
- Don't remove `validate.js` or `scaling.js` script tags from any game.
- Don't add backend/network dependencies.
- Don't change the `<game>.html ↔ <game>-data.json` naming pattern —
  validate.js discovery and the carousel both depend on it.
