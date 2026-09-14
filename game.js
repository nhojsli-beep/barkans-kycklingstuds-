import { createRenderer } from "./game-renderer.js";

const W = 1000;
const H = 625;
const STEP = 1 / 120;
const SHELL_Y = 495;
const SHELL_HALF = 96;
const FEET = 17;

// Constant physics matching Tigers Kycklingstuds WR video:
// T = 1.80s between bounces, deltaX = 210px stride
const BOUNCE_TIME = 1.80;
const GRAVITY = 780;
const VX = 210 / BOUNCE_TIME; // 116.667 px/s
const BOUNCE_VY = GRAVITY * (BOUNCE_TIME / 2); // 702 px/s
const LAUNCH_VY = -24; // gentle hop off cliff (x=150, y=183) to reach B1 at t=0.90s, x=255, y=478
const WALK_SPEED = 55; // px/s on cliff top
const CLIFF_EDGE_X = 150;
const CLIFF_Y = 183;
const REQUIRED_BOUNCES = 3;
const RECORD_KEY = "barkan-kycklingstuds-record";
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function initGame() {
  const root = document.querySelector("#game-root");
  if (!root) return () => {};
  root.innerHTML = `
    <section class="bounce-game" aria-labelledby="bounce-title">
      <div class="bounce-top">
        <div class="bounce-brand"><p class="eyebrow">TRANÅS ARCADE CLUB / SEDAN NYSS</p><h3 id="bounce-title">BÄRKANS KYCKLINGSTUDS</h3></div>
        <div class="bounce-actions">
          <button type="button" class="button sound-game" data-game-sound aria-pressed="false" aria-label="Slå på spelljud">Ljud av</button>
          <button type="button" class="button pause-game" disabled>Pausa</button>
          <button type="button" class="button expand-game" aria-pressed="false" aria-label="Förstora spelet">Förstora ↗</button>
        </div>
      </div>
      <div class="bounce-hud" aria-label="Spelstatistik">
        <div><span>PÅ KALASET</span><strong data-score>0</strong></div>
        <div><span>LIV KVAR</span><strong data-lives aria-label="3 av 3 liv"><i></i><i></i><i></i></strong></div>
        <div><span>KOMBO</span><strong data-combo>—</strong></div>
        <div><span>PERSONBÄSTA</span><strong data-best>0</strong></div>
        <div><span>VÅG</span><strong data-tempo>1</strong></div>
      </div>
      <div class="bounce-viewport">
        <canvas width="1000" height="625" tabindex="0" aria-label="Styr sköldpaddan och få varje kyckling att studsa tre gånger över vattnet. Kycklingarna kommer i överlappande rytmer. Tre missar avslutar rundan." aria-describedby="bounce-instructions"></canvas>
        <div class="bounce-overlay"><div class="bounce-panel">
          <p class="eyebrow" data-overlay-kicker>ETT KALAS. INGEN BRO. DIN TUR.</p>
          <h4 data-overlay-title>ALLA SKA MED.<br>INGEN KAN SIMMA.</h4>
          <p data-overlay-copy>Kycklingarna kommer i överlappande rytmer med gradvis fler gäster. Få varje kyckling att studsa tre gånger på skalet innan den når kalaset. Sikta på landningsmarkörerna och träffa mitt på skalet för Perfekt Studs. Guldgäster och kombo ger bonuspoäng. Tre plask = slut.</p>
          <div class="bounce-result" hidden>
            <div><span>RÄDDADE</span><strong data-result-score>0</strong></div>
            <div><span>STUDSAR</span><strong data-result-bounces>0</strong></div>
            <div><span>BÄSTA KOMBO</span><strong data-result-combo>0</strong></div>
            <div><span>PERFEKTA</span><strong data-result-perfect>0</strong></div>
          </div>
          <button type="button" class="button primary" data-play>SLÄPP KYCKLINGARNA ↗</button>
        </div></div>
      </div>

      <div class="bounce-bottom"><p id="bounce-instructions"><strong>FLYTTA. FÅNGA. PRIORITERA.</strong><br>Mus / dra med fingret / ← → eller A D · P / mellanslag = paus<br>Följ muspekaren direkt för precis sköldpaddsstyrning.</p><div class="bounce-arrows" aria-label="Flytta sköldpaddan"><button type="button" data-direction="-1" aria-label="Flytta vänster">←</button><button type="button" data-direction="1" aria-label="Flytta höger">→</button></div></div>
    </section>`;

  const canvas = root.querySelector("canvas");
  if (!canvas.getContext("2d")) {
    root.querySelector("[data-overlay-copy]").textContent = "Spelet behöver Canvas 2D. Prova en aktuell version av Chrome, Firefox eller Safari.";
    root.querySelector("[data-play]").disabled = true;
    return () => {};
  }
  const renderer = createRenderer(canvas);
  const game = root.querySelector(".bounce-game");
  const viewport = root.querySelector(".bounce-viewport");
  const overlay = root.querySelector(".bounce-overlay");
  const play = root.querySelector("[data-play]");
  const pause = root.querySelector(".pause-game");
  const expand = root.querySelector(".expand-game");
  const scoreNode = root.querySelector("[data-score]");
  const livesNode = root.querySelector("[data-lives]");
  const lifePips = [...livesNode.children];
  const comboNode = root.querySelector("[data-combo]");
  const bestNode = root.querySelector("[data-best]");
  const tempoNode = root.querySelector("[data-tempo]");

  const result = root.querySelector(".bounce-result");
  const sound = root.querySelector("[data-game-sound]");
  const masterSound = document.querySelector("#sound");
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const scene = {
    mode: "ready", time: 0, score: 0, misses: 0,
    turtle: { x: 307, impact: 0, facing: 1, vx: 0, shellHalf: SHELL_HALF },
    chickens: [], effects: [], lost: [], shake: 0,
    combo: 0, maxCombo: 0, perfectBounces: 0,
    wave: 1, level: 1,
    reducedMotion: motion.matches,
  };
  let best = 0;
  try {
    const saved = Number(localStorage.getItem(RECORD_KEY));
    if (Number.isFinite(saved) && saved > 0) best = Math.floor(saved);
  } catch {}

  let frame = 0;
  let last = 0;
  let accumulator = 0;
  let released = 0;
  let waveCount = 0;
  let waveTimer = 0.5;
  let currentWaveSpacing = 1.25;

  const hudState = { score: -1, best: -1, misses: -1, combo: "", wave: -1, mode: "" };
  let bounces = 0;
  let endAge = 0;
  let inputMode = "keyboard";
  let expanded = false;
  let previousOverflow = "";
  const heldKeys = new Set();
  const heldPointers = new Map();
  const cleanup = [];

  function listen(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    cleanup.push(() => target.removeEventListener(type, handler, options));
  }

  function signal(kind) {
    root.dispatchEvent(new CustomEvent("barkan-game-sound", { detail: kind }));
  }

  function stats() {
    if (hudState.score !== scene.score) {
      hudState.score = scene.score;
      scoreNode.textContent = scene.score;
    }
    if (hudState.best !== best) {
      hudState.best = best;
      bestNode.textContent = best;
    }
    if (hudState.misses !== scene.misses) {
      hudState.misses = scene.misses;
      livesNode.setAttribute("aria-label", `${3 - scene.misses} av 3 liv`);
      lifePips.forEach((pip, i) => pip.classList.toggle("lost", i >= 3 - scene.misses));
    }
    const combo = scene.combo > 1 ? `${scene.combo}×` : "—";
    if (hudState.combo !== combo) {
      hudState.combo = combo;
      comboNode.textContent = combo;
      comboNode.classList.toggle("is-active", scene.combo > 1);
    }
    if (hudState.wave !== scene.wave) {
      hudState.wave = scene.wave;
      tempoNode.textContent = `${scene.wave}`;
    }
    if (hudState.mode !== scene.mode) {
      hudState.mode = scene.mode;
      root.dataset.state = scene.mode;
    }
  }

  function showPanel(kicker, title, copy, action) {
    root.querySelector("[data-overlay-kicker]").textContent = kicker;
    root.querySelector("[data-overlay-title]").textContent = title;
    root.querySelector("[data-overlay-copy]").textContent = copy;
    play.textContent = action;
    overlay.hidden = false;
  }

  function release() {
    heldKeys.clear();
    heldPointers.clear();
  }

  function run() {
    cancelAnimationFrame(frame);
    scene.mode = "running";
    overlay.hidden = true;
    result.hidden = true;
    pause.disabled = false;
    pause.textContent = "Pausa";
    accumulator = 0;
    last = performance.now();
    stats();
    canvas.focus({ preventScroll: true });
    frame = requestAnimationFrame(tick);
  }

  function start() {
    if (scene.mode === "paused") { run(); return; }
    scene.time = scene.score = scene.misses = 0;
    scene.combo = scene.maxCombo = scene.perfectBounces = 0;
    scene.chickens.length = scene.effects.length = scene.lost.length = 0;
    scene.turtle.x = 307;
    scene.turtle.impact = scene.shake = scene.turtle.vx = 0;
    scene.turtle.facing = 1;
    scene.turtle.shellHalf = SHELL_HALF;
    released = 0;
    waveCount = 0;
    waveTimer = 0.5;
    scene.wave = 1;
    scene.level = 1;
    bounces = endAge = 0;
    inputMode = "keyboard";
    release();
    canvas.scrollIntoView({ block: "center", behavior: "instant" });
    signal("start");
    run();
  }

  function suspend() {
    if (scene.mode !== "running") return;
    cancelAnimationFrame(frame);
    scene.mode = "paused";
    release();
    pause.textContent = "Fortsätt";
    showPanel("FIKAPAUS", "INGEN STRESS. ÄN.",
      "Spelet står still. Bärkan passar på att förklara varför pauser är viktiga. Länge.",
      "FORTSÄTT KALASET ↗");
    stats();
    renderer.draw(scene);
  }

  function togglePause() {
    if (scene.mode === "running") suspend();
    else if (scene.mode === "paused") run();
  }

  function end() {
    scene.mode = "over";
    endAge = 0;
    pause.disabled = true;
    release();
    const record = scene.score > best;
    if (record) {
      best = scene.score;
      try { localStorage.setItem(RECORD_KEY, String(best)); } catch {}
    }
    showPanel(record ? "NYTT REKORD. RING TRANÅS TIDNING." : "TRE PLASK. ETT LÅNGT EFTERSNACK.",
      `${scene.score} GÄSTER PÅ KALASET.`,
      scene.score ? "Kycklingarna i vattnet fick badringar. De på land fick Bärkans livshistoria. Oklart vilka som hade mest tur." : "Ingen kom fram. Bärkan håller tal för en servett. Den har bett om notan.",
      "EN RUNDA TILL ↗");
    result.hidden = false;
    root.querySelector("[data-result-score]").textContent = scene.score;
    root.querySelector("[data-result-bounces]").textContent = bounces;
    root.querySelector("[data-result-combo]").textContent = `${scene.maxCombo}×`;
    root.querySelector("[data-result-perfect]").textContent = scene.perfectBounces;
    signal("over");
    stats();
    play.focus({ preventScroll: true });
  }

  function effect(kind, x, y) {
    scene.effects.push({ kind, x, y, age: 0, seed: scene.wave + bounces + scene.score });
  }

  function triggerNextWave() {
    waveCount++;
    scene.wave = waveCount;
    scene.level = Math.floor((waveCount - 1) / 4) + 1;

    // Wave size scaling:
    let size = 1;
    if (scene.score < 5) size = 1;
    else if (scene.score < 12) size = (waveCount % 2 === 0 ? 2 : 1);
    else if (scene.score < 25) size = 2;
    else size = (Math.random() < 0.4 ? 3 : 2);

    // Spacing between chickens within wave (time between consecutive jumps):
    // 0.90s creates the perfect alternating double-tap cadence without collisions
    currentWaveSpacing = 0.90;

    // Queue chickens walking out from far left of cliff across the open plateau
    const leadStartX = -20;
    const spacingPx = WALK_SPEED * currentWaveSpacing;

    for (let i = 0; i < size; i++) {
      const startX = leadStartX - i * spacingPx;
      let type = "normal";
      if (scene.level >= 2 && Math.random() < 0.18) type = "gold";

      scene.chickens.push({
        id: ++released,
        phase: "queued",
        x: startX,
        y: CLIFF_Y,
        vx: 0,
        vy: 0,
        bounces: 0,
        age: i * 0.4,
        rotation: 0,
        g: GRAVITY,
        type,
      });
    }

    // Next wave will only trigger after this wave has completely finished its catches.
    waveTimer = 1.4;
  }

  function moveTurtle(x) {
    const next = clamp(x, 235, 785);
    const dx = next - scene.turtle.x;
    if (Math.abs(dx) > 0.5) scene.turtle.facing = dx > 0 ? 1 : -1;
    scene.turtle.vx = dx / STEP;
    scene.turtle.x = next;
  }

  function update(dt) {
    scene.time += dt;

    // Keyboard / button movement:
    let movingRight = heldKeys.has("ArrowRight") || heldKeys.has("KeyD");
    let movingLeft = heldKeys.has("ArrowLeft") || heldKeys.has("KeyA");
    for (const direction of heldPointers.values()) {
      if (direction === 1) movingRight = true;
      else movingLeft = true;
    }
    const dir = Number(movingRight) - Number(movingLeft);
    if (dir) moveTurtle(scene.turtle.x + dir * 1400 * dt);
    else scene.turtle.vx *= 0.8;

    // Wave spawning logic:
    // Only spawn a new wave when all active flying catches AND queued cliff walks are finished!
    const hasActiveCatchers = scene.chickens.some(
      c => (c.phase === "flying" && c.bounces < REQUIRED_BOUNCES) || c.phase === "queued"
    );

    if (!hasActiveCatchers) {
      waveTimer -= dt;
      if (waveTimer <= 0) {
        triggerNextWave();
      }
    }

    // Update chickens
    for (let i = scene.chickens.length - 1; i >= 0; i--) {
      const c = scene.chickens[i];
      c.age += dt;

      // Queued on cliff: walking towards the edge
      if (c.phase === "queued") {
        c.x += WALK_SPEED * dt;
        if (c.x >= CLIFF_EDGE_X) {
          c.phase = "flying";
          c.x = CLIFF_EDGE_X;
          c.y = CLIFF_Y;
          c.vx = VX;
          c.vy = LAUNCH_VY;
          c.g = GRAVITY;
          c.bounces = 0;
        }
        continue;
      }

      // Landed on party platform: walking rightwards to the party
      if (c.phase === "landed") {
        c.x += 85 * dt;
        if (c.x > W + 40) scene.chickens.splice(i, 1);
        continue;
      }

      // Flying physics: constant and predictable trajectory
      const oldFeet = c.y + FEET;
      const oldX = c.x;

      c.x += c.vx * dt;
      c.y += c.vy * dt + 0.5 * GRAVITY * dt * dt;
      c.vy += GRAVITY * dt;
      c.rotation += dt * 2.8;
      const newFeet = c.y + FEET;

      // Check landing on party platform (after required bounces)
      if (c.bounces >= REQUIRED_BOUNCES && c.x >= 870 && c.vy > 0 && newFeet >= 355) {
        c.phase = "landed";
        c.y = 338;
        c.rotation = 0;
        c.age = 0;

        let points = 1;
        if (c.type === "gold") points = 3;
        scene.score += points;
        scene.combo++;
        if (scene.combo > scene.maxCombo) scene.maxCombo = scene.combo;

        if (c.type === "gold") {
          effect("gold", 900, 305);
          signal("gold-save");
        } else if (scene.combo >= 3) {
          effect("save", 900, 315);
          signal("combo");
        } else {
          effect("save", 900, 315);
          signal("saved");
        }
        stats();
        continue;
      }

      // Water surface bounce check
      const crossed = c.vy > 0 && oldFeet <= SHELL_Y && newFeet >= SHELL_Y;
      if (crossed) {
        const hitFrac = Math.max(0, Math.min(1, (SHELL_Y - oldFeet) / (newFeet - oldFeet || 1)));
        const hitX = oldX + c.vx * dt * hitFrac;
        const dx = hitX - scene.turtle.x;

        if (Math.abs(dx) <= SHELL_HALF) {
          // Clean bounce on turtle shell
          c.x = hitX;
          c.y = SHELL_Y - FEET;
          c.vy = -BOUNCE_VY;
          c.bounces++;
          bounces++;
          scene.combo++;
          if (scene.combo > scene.maxCombo) scene.maxCombo = scene.combo;
          scene.turtle.impact = 1;
          const isSweet = Math.abs(dx) <= SHELL_HALF * 0.38;
          if (isSweet) {
            scene.perfectBounces++;
            effect("perfect", hitX, SHELL_Y - 15);
            signal("bounce-perfect");
          } else {
            effect("bounce", hitX, SHELL_Y);
            signal("bounce");
          }
          const rem = dt * (1 - hitFrac);
          c.x += c.vx * rem;
          c.y += c.vy * rem + 0.5 * GRAVITY * rem * rem;
          c.vy += GRAVITY * rem;
          stats();
          continue;
        }
      }

      // Miss: splash in water
      if (c.y > H - 35 || c.x > W + 30) {
        scene.lost.push({ x: clamp(c.x, 205, 840) });
        effect("splash", c.x, 505);
        scene.chickens.splice(i, 1);
        scene.misses++;
        scene.combo = 0;
        scene.shake = 1;
        signal("splash");
        stats();
        if (scene.misses >= 3) {
          end();
          break;
        }
      }
    }
  }

  function animateEffects(dt) {
    scene.turtle.impact = Math.max(0, scene.turtle.impact - dt * 4);
    scene.shake = Math.max(0, scene.shake - dt * 3);
    for (let i = scene.effects.length - 1; i >= 0; i--) {
      const e = scene.effects[i];
      e.age += dt;
      if (e.age > (e.kind === "perfect" || e.kind === "gold" ? 1.5 : 1.2)) {
        scene.effects.splice(i, 1);
      }
    }
  }

  function tick(now) {
    if (scene.mode !== "running" && scene.mode !== "over") return;
    const delta = Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;
    accumulator += delta;
    while (accumulator >= STEP) {
      if (scene.mode === "running") update(STEP);
      else endAge += STEP;
      animateEffects(STEP);
      accumulator -= STEP;
    }
    renderer.draw(scene);
    if (scene.mode === "running" || endAge < 1.2) frame = requestAnimationFrame(tick);
  }

  function position(event) {
    const bounds = canvas.getBoundingClientRect();
    const worldX = ((event.clientX - bounds.left) * W) / bounds.width;
    moveTurtle(worldX);
  }

  listen(play, "click", start);
  listen(pause, "click", togglePause);

  listen(canvas, "pointerdown", (event) => {
    if (scene.mode !== "running") return;
    event.preventDefault();
    inputMode = event.pointerType;
    release();
    canvas.focus({ preventScroll: true });
    canvas.setPointerCapture(event.pointerId);
    position(event);
  });

  listen(canvas, "pointermove", (event) => {
    if (scene.mode !== "running") return;
    inputMode = event.pointerType;
    position(event);
  });

  listen(window, "mousemove", (event) => {
    if (scene.mode !== "running") return;
    inputMode = "mouse";
    position(event);
  });

  listen(window, "keydown", (event) => {
    if (["INPUT", "TEXTAREA"].includes(event.target?.tagName)) return;
    if (event.code === "Escape") {
      if (expanded) setExpanded(false);
      suspend();
      return;
    }
    if (scene.mode === "running" && (event.code === "KeyP" || (event.code === "Space" && !["BUTTON", "A"].includes(event.target?.tagName)))) {
      event.preventDefault();
      if (!event.repeat) togglePause();
      return;
    }
    if (scene.mode === "paused" && (event.code === "KeyP" || event.code === "Space")) {
      event.preventDefault();
      if (!event.repeat) run();
      return;
    }
    if (scene.mode === "over" && (event.code === "KeyR" || (event.code === "Space" && event.target !== play))) {
      event.preventDefault();
      start();
      return;
    }
    if (scene.mode === "running" && ["ArrowLeft", "ArrowRight", "KeyA", "KeyD"].includes(event.code)) {
      event.preventDefault();
      inputMode = "keyboard";
      heldKeys.add(event.code);
    }
  });

  listen(window, "keyup", (event) => heldKeys.delete(event.code));
  listen(canvas, "blur", release);

  for (const button of root.querySelectorAll("[data-direction]")) {
    listen(button, "pointerdown", (event) => {
      if (scene.mode !== "running") return;
      event.preventDefault();
      inputMode = "touch";
      button.setPointerCapture(event.pointerId);
      heldPointers.set(event.pointerId, Number(button.dataset.direction));
    });
    const up = (event) => heldPointers.delete(event.pointerId);
    listen(button, "pointerup", up);
    listen(button, "pointercancel", up);
    listen(button, "lostpointercapture", up);
  }

  function setExpanded(value) {
    expanded = value;
    if (value) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    } else document.body.style.overflow = previousOverflow;
    game.classList.toggle("is-expanded", value);
    expand.setAttribute("aria-pressed", String(value));
    expand.setAttribute("aria-label", value ? "Lämna förstorat spelläge" : "Förstora spelet");
    expand.textContent = value ? "Tillbaka ↙" : "Förstora ↗";
    if (!value) canvas.scrollIntoView({ block: "center", behavior: "instant" });
  }

  listen(expand, "click", () => setExpanded(!expanded));

  function syncSound() {
    const enabled = masterSound?.getAttribute("aria-pressed") === "true";
    sound.setAttribute("aria-pressed", String(enabled));
    sound.setAttribute("aria-label", enabled ? "Stäng av spelljud" : "Slå på spelljud");
    sound.textContent = enabled ? "Ljud på" : "Ljud av";
  }

  listen(sound, "click", () => masterSound?.click());
  const soundObserver = new MutationObserver(syncSound);
  if (masterSound) soundObserver.observe(masterSound, { attributes: true, attributeFilter: ["aria-pressed"] });
  syncSound();

  listen(document, "visibilitychange", () => { if (document.hidden) suspend(); });
  listen(window, "blur", () => suspend());
  listen(motion, "change", () => { scene.reducedMotion = motion.matches; renderer.draw(scene); });

  stats();
  renderer.draw(scene);

  return () => {
    cancelAnimationFrame(frame);
    soundObserver.disconnect();
    renderer.dispose();
    cleanup.forEach((remove) => remove());
    if (expanded) document.body.style.overflow = previousOverflow;
  };
}
