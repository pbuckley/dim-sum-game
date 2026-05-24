// Validates game-data.json. Runs in browser (loaded via <script>) and Node (node validate.js).
// Checks per round:
//   - clue letters are unique
//   - op is one of + × −, answer is a number
//   - correct lists exactly 2 letters and they exist
//   - the correct pair actually satisfies the equation
//   - no OTHER pair of clues in the round also satisfies the equation (ambiguous answer)

function validateRound(r, idx) {
  const errors = [];
  const label = `round ${idx + 1}`;

  if (!Array.isArray(r.clues) || r.clues.length < 2) {
    return [`${label}: needs at least 2 clues`];
  }

  const letters = r.clues.map(c => c.l);
  const dupes = [...new Set(letters.filter((l, i) => letters.indexOf(l) !== i))];
  if (dupes.length) {
    return [`${label}: duplicate clue letter(s): ${dupes.join(", ")}`];
  }

  if (!["+", "×", "−"].includes(r.op)) {
    errors.push(`${label}: op must be "+", "×", or "−" (got "${r.op}")`);
  }
  if (typeof r.answer !== "number") {
    errors.push(`${label}: answer must be a number`);
  }
  if (!Array.isArray(r.correct) || r.correct.length !== 2) {
    return [...errors, `${label}: correct must list exactly 2 clue letters`];
  }

  const byLetter = Object.fromEntries(r.clues.map(c => [c.l, c]));
  for (const l of r.correct) {
    if (!byLetter[l]) return [...errors, `${label}: correct references missing clue "${l}"`];
    if (typeof byLetter[l].n !== "number") return [...errors, `${label}: clue ${l} has non-numeric value`];
  }
  if (errors.length) return errors;

  const evalPair = (op, a, b) => op === "+" ? a + b : op === "×" ? a * b : a - b;
  // subtraction is order-dependent; the game accepts the pair regardless of which order satisfies.
  const matches = (op, x, y, target) =>
    op === "−" ? (x - y === target || y - x === target) : evalPair(op, x, y) === target;

  const [c1, c2] = r.correct.map(l => byLetter[l].n);
  if (!matches(r.op, c1, c2, r.answer)) {
    errors.push(`${label}: correct pair ${r.correct.join(",")} gives ${evalPair(r.op, c1, c2)}, not ${r.answer}`);
  }

  const correctSet = [...r.correct].sort().join(",");
  for (let i = 0; i < r.clues.length; i++) {
    for (let j = i + 1; j < r.clues.length; j++) {
      const a = r.clues[i], b = r.clues[j];
      if ([a.l, b.l].sort().join(",") === correctSet) continue;
      if (matches(r.op, a.n, b.n, r.answer)) {
        errors.push(`${label}: ambiguous — pair ${a.l}(${a.n}) & ${b.l}(${b.n}) also satisfies ${r.op} = ${r.answer}`);
      }
    }
  }

  return errors;
}

function validateGameData(data) {
  if (!data || !Array.isArray(data.rounds)) return ["game-data must have a rounds[] array"];
  const errors = [];
  data.rounds.forEach((r, i) => errors.push(...validateRound(r, i)));
  return errors;
}

if (typeof window !== "undefined") window.validateGameData = validateGameData;

if (typeof require !== "undefined" && typeof module !== "undefined" && require.main === module) {
  const fs = require("fs");
  const path = process.argv[2] || "game-data.json";
  const data = JSON.parse(fs.readFileSync(path, "utf8"));
  const errors = validateGameData(data);
  if (errors.length) {
    console.error(`FAIL: ${errors.length} issue(s) in ${path}:`);
    errors.forEach(e => console.error("  - " + e));
    process.exit(1);
  } else {
    console.log(`OK: ${data.rounds.length} rounds validated, no issues`);
  }
}
