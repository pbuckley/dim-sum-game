// scaling.js — viewport-size scaling for big-screen play.
// Adds a fixed-position size toggle (1×–4×), keyboard shortcuts (+, -, 0),
// and remembers the choice in localStorage so it survives reloads.
//
// Sizes are tuned for the rooms most likely to be in front of the TV:
//   1× : laptop / 14" monitor (default)
//   2× : 42" living-room TV
//   3× : ~110" projector screen
//   4× : ~240" big-room projector
//
// Uses CSS `zoom` (supported in all modern browsers including Firefox since
// v126). Zoom is preferable to transform:scale here because it scales hit
// targets, scrolling, and layout correctly — no overflow or click-offset
// surprises. The fixed size-toggle scales with everything else, which keeps
// it readable and clickable from across a room.

(function () {
  const SIZES = [
    { id: 1, label: "1×", title: "Laptop / 14\" monitor", zoom: 1.0 },
    { id: 2, label: "2×", title: "TV ~42\"",              zoom: 1.6 },
    { id: 3, label: "3×", title: "Projector ~110\"",      zoom: 2.5 },
    { id: 4, label: "4×", title: "Big projector ~240\"",  zoom: 3.5 }
  ];

  const css = `
    .size-toggle {
      position: fixed; top: 0.5rem; right: 0.5rem;
      display: flex; gap: 2px; background: #fff;
      border: 0.5px solid rgba(0,0,0,0.15); border-radius: 8px; padding: 3px;
      z-index: 1000; font-family: system-ui, -apple-system, sans-serif;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .size-btn {
      padding: 4px 9px; font-size: 11px; border-radius: 5px;
      border: none; background: transparent; color: #5f5e5a;
      cursor: pointer; font-family: inherit; font-weight: 500;
    }
    .size-btn:hover { background: #f5f4f0; color: #1a1a18; }
    .size-btn.selected { background: #185FA5; color: #fff; }
    body.size-2 { zoom: 1.6; }
    body.size-3 { zoom: 2.5; }
    body.size-4 { zoom: 3.5; }
  `;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  const toggle = document.createElement("div");
  toggle.className = "size-toggle";
  toggle.innerHTML = SIZES.map(s =>
    `<button class="size-btn" data-size="${s.id}" title="${s.title}">${s.label}</button>`
  ).join("");
  document.body.appendChild(toggle);

  function applySize(s) {
    if (!SIZES.some(x => x.id === s)) s = 1;
    SIZES.forEach(x => document.body.classList.remove(`size-${x.id}`));
    if (s > 1) document.body.classList.add(`size-${s}`);
    toggle.querySelectorAll(".size-btn").forEach(b =>
      b.classList.toggle("selected", parseInt(b.dataset.size) === s)
    );
    localStorage.setItem("game-size", String(s));
  }

  toggle.querySelectorAll(".size-btn").forEach(b => {
    b.onclick = () => applySize(parseInt(b.dataset.size));
  });

  document.addEventListener("keydown", e => {
    // Don't hijack when the user is typing in an input/select.
    const tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
    const cur = parseInt(localStorage.getItem("game-size") || "1");
    if (e.key === "+" || e.key === "=") {
      if (cur < SIZES.length) { e.preventDefault(); applySize(cur + 1); }
    } else if (e.key === "-" || e.key === "_") {
      if (cur > 1) { e.preventDefault(); applySize(cur - 1); }
    } else if (e.key === "0") {
      e.preventDefault();
      applySize(1);
    }
  });

  applySize(parseInt(localStorage.getItem("game-size") || "1"));
})();
