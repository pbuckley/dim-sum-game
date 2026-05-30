// keynav.js — keyboard shortcuts for in-game play.
//
//   A / B / C / D   toggle the corresponding clue
//   Enter            submit the current selection
//   ←  / →           previous / next round
//   R                reveal all clues (no scoring)
//
// Skips when the user is typing in INPUT/SELECT/TEXTAREA, and when the
// game-over panel is showing. Safe to include on non-game pages — bails out
// if the required per-game globals aren't defined.
//
// Per-game globals expected on window: togglePick, submitAnswer, revealAll,
// nextRound, prevRound. Each game's inline script defines these.

(function () {
  if (typeof window.togglePick !== "function") return; // not a game page

  document.addEventListener("keydown", function (e) {
    const tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    const gameOver = document.getElementById("game-over");
    if (gameOver && gameOver.style.display === "block") return;

    const k = e.key.toUpperCase();
    if (k === "A" || k === "B" || k === "C" || k === "D") {
      e.preventDefault();
      window.togglePick(k);
    } else if (e.key === "Enter") {
      e.preventDefault();
      window.submitAnswer();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      window.nextRound();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      if (typeof window.prevRound === "function") window.prevRound();
    } else if (k === "R") {
      e.preventDefault();
      window.revealAll();
    }
  });
})();
