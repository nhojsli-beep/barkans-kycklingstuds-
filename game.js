import { createRenderer } from "./game-renderer.js";

const W = 1000;
const H = 625;
const STEP = 1 / 120;
const SHELL_Y = 495;
const SHELL_HALF = 88;
const FEET = 17;
const GRAVITY = 620;
const BOUNCE_TIME = 2.3;
const RECORD_KEY = "barkan-kycklingstuds-record";
const WAVE_SIZE = 3;
const WAVES_PER_LEVEL = 3;
const LEVEL_PACE_STEP = 0.035;
const MAX_PACE = 1.4;
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
        <div><span>TEMPO</span><strong data-tempo>1.00×</strong></div>
      </div>
      <div class="bounce-viewport">
        <canvas width="1000" height="625" tabindex="0" aria-label="Styr sköldpaddan och håll upp till tre kycklingar igång över vattnet. De släpps en i taget. Tre missar avslutar rundan." aria-describedby="bounce-instructions"></canvas>
        <div class="bounce-overlay"><div class="bounce-panel">
          <p class="eyebrow" data-overlay-kicker>ETT KALAS. INGEN BRO. DIN TUR.</p>
          <h4 data-overlay-title>ALLA SKA MED.<br>INGEN KAN SIMMA.</h4>
          <p data-overlay-copy>Kycklingarna kommer en i taget i varierad takt. Håll upp till tre igång och studsa dem till Bärkans kalas. Sikta på landningsmarkörerna och träffa mitt på skalet för Perfekt Studs. Guldgäster och kombo ger bonuspoäng. Tre plask = slut.</p>
          <div class="bounce-result" hidden>
            <div><span>RÄDDADE</span><strong data-result-score>0</strong></div>
            <div><span>STUDSAR</span><strong data-result-bounces>0</strong></div>
            <div><span>BÄSTA KOMBO</span><strong data-result-combo>0</strong></div>
            <div><span>PERFEKTA</span><strong data-result-perfect>0</strong></div>
          </div>
          <button type="button" class="button primary" data-play>SLÄPP KYCKLINGARNA ↗</button>
        </div></div>
      </div>

      <div class="bounce-bottom"><p id="bounce-instructions"><strong>FLYTTA. FÅNGA. TILLBAKA IGEN.</strong><br>Mus / dra med fingret / ← → eller A D · P / mellanslag = paus<br>Musen utanför spelplanen pausar automatiskt.</p><div class="bounce-arrows" aria-label="Flytta sköldpaddan"><button type="button" data-direction="-1" aria-label="Flytta vänster">←</button><button type="button" data-direction="1" aria-label="Flytta höger">→</button></div></div>
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
    turtle: { x: 307, impact: 0, facing: 1, vx: 0 },
    chickens: [], effects: [], lost: [], shake: 0,
    combo: 0, maxCombo: 0, perfectBounces: 0,
    wave: 0, level: 1, pace: 1,
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
  let spawnIn = 0.25;
  let released = 0;

  let bounces = 0;
  let pace = 1;
  let endAge = 0;
  let pointerPause = false;
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
    scoreNode.textContent = scene.score;
    bestNode.textContent = best;
    livesNode.setAttribute("aria-label", `${3 - scene.misses} av 3 liv`);
    lifePips.forEach((pip, i) => pip.classList.toggle("lost", i >= 3 - scene.misses));
    if (comboNode) {
      comboNode.textContent = scene.combo > 1 ? `${scene.combo}×` : "—";
      comboNode.classList.toggle("is-active", scene.combo > 1);
    }
    tempoNode.textContent = `${pace.toFixed(2)}×`;
    root.dataset.state = scene.mode;
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
    pointerPause = false;
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
    spawnIn = 0.25;
    released = 0;
    scene.wave = 0;
    scene.level = 1;
    bounces = endAge = 0;
    scene.pace = pace = 1;
    inputMode = "keyboard";
    release();
    canvas.scrollIntoView({ block: "center", behavior: "instant" });
    signal("start");
    run();
  }
  function suspend(fromPointer = false) {
    if (scene.mode !== "running") return;
    cancelAnimationFrame(frame);
    scene.mode = "paused";
    pointerPause = fromPointer;
    release();
    pause.textContent = "Fortsätt";
    showPanel("FIKAPAUS", "INGEN STRESS. ÄN.", fromPointer
      ? "För musen över spelplanen igen för att fortsätta. Kycklingarna väntar precis där du lämnade dem."
      : "Spelet står still. Bärkan passar på att förklara varför pauser är viktiga. Länge.", "FORTSÄTT KALASET ↗");
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
    pointerPause = false;
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
  function spawnChicken() {
    let active = 0;
    for (const bird of scene.chickens) {
      if (bird.phase === "queued") return;
      if (bird.phase !== "landed") active += 1;
    }
    if (active >= 3) return;
    const wave = Math.floor(released / WAVE_SIZE) + 1;
    const level = Math.floor((wave - 1) / WAVES_PER_LEVEL) + 1;
    scene.wave = wave;
    scene.level = level;
    pace = Math.min(MAX_PACE, 1 + (wave - 1) * LEVEL_PACE_STEP);
    scene.pace = pace;
    const roll = Math.random();
    let type = "normal";
    let gravMult = 1;
    let vx = 132 + Math.random() * 12;
    if (level >= 2 && roll < 0.18) {
      type = "gold";
      gravMult = 0.96;
    } else if (level >= 3 && roll < 0.38) {
      type = "speedy";
      vx += 8;
      gravMult = 1.04;
    } else if (level >= 4 && roll < 0.54) {
      type = "chonky";
      gravMult = 1.1;
    }
    scene.chickens.push({
      x: -22, y: 183, vy: 0, vx, gravMult, pace,
      rotation: 0, phase: "queued", launchVy: -170 - Math.random() * 30,
      age: 0, type, wave,
    });
    released += 1;
    // Separate arrivals, with a little breathing room between hidden waves.
    spawnIn = (1.05 + Math.random() * 0.65 + (released % WAVE_SIZE === 0 ? 0.35 : 0)) / pace;
    stats();
  }
  function canLaunch(bird) {
    const g = GRAVITY * bird.gravMult;
    const first = (-bird.launchVy + Math.sqrt(bird.launchVy * bird.launchVy + 2 * g * (SHELL_Y - FEET - bird.y))) / g;
    // Compare upcoming catches, not just spawn times. Leave time to cross the lake.
    for (const other of scene.chickens) {
      if (other.phase !== "flying" || other.y + FEET > SHELL_Y) continue;
      const otherG = GRAVITY * other.gravMult;
      const next = (-other.vy + Math.sqrt(other.vy * other.vy + 2 * otherG * (SHELL_Y - FEET - other.y))) / otherG;
      for (let a = 0; a < 3; a += 1) {
        const birdTime = first + a * BOUNCE_TIME;
        const birdX = 150 + bird.vx * birdTime;
        if (birdX > 870) break;
        for (let b = 0; b < 3; b += 1) {
          const otherTime = next + b * BOUNCE_TIME;
          const otherX = other.x + other.vx * otherTime;
          if (otherX > 870) break;
          const distance = Math.abs(birdX - otherX);
          if (distance <= SHELL_HALF) continue;
          const travel = distance / 950 + 0.18;
          if (Math.abs(birdTime / bird.pace - otherTime / other.pace) < travel) return false;
        }
      }
    }
    return true;
  }
  function moveTurtle(x) {
    const next = clamp(x, 245, 795);
    const dx = next - scene.turtle.x;
    if (Math.abs(dx) > 0.2) scene.turtle.facing = dx > 0 ? 1 : -1;
    scene.turtle.vx = dx / STEP;
    scene.turtle.x = next;
  }
  function update(dt) {
    scene.time += dt;
    let movingRight = heldKeys.has("ArrowRight") || heldKeys.has("KeyD");
    let movingLeft = heldKeys.has("ArrowLeft") || heldKeys.has("KeyA");
    for (const direction of heldPointers.values()) {
      if (direction === 1) movingRight = true;
      else movingLeft = true;
    }
    const direction = Number(movingRight) - Number(movingLeft);
    if (direction) moveTurtle(scene.turtle.x + direction * 950 * dt);
    else scene.turtle.vx *= 0.8;

    spawnIn -= dt;
    if (spawnIn <= 0) spawnChicken();

    for (let i = scene.chickens.length - 1; i >= 0; i--) {
      const c = scene.chickens[i];
      let flightDt = dt * c.pace;
      c.age += dt;
      if (c.phase === "queued") {
        const walkSpeed = 140;
        const walkTime = (150 - c.x) / walkSpeed;
        if (walkTime > flightDt) {
          c.x += walkSpeed * flightDt;
          continue;
        }
        flightDt -= walkTime;
        c.x = 150;
        if (!canLaunch(c)) continue;
        c.vy = c.launchVy;
        c.phase = "flying";
        c.age = 0;
      }
      if (c.phase === "landed") {
        c.x += 95 * flightDt;
        if (c.x > W + 30) scene.chickens.splice(i, 1);
        continue;
      }
      const oldFeet = c.y + FEET;
      const oldX = c.x;
      const oldVy = c.vy;
      const g = GRAVITY * (c.gravMult || 1);
      const vx = c.vx || 120;
      c.x += vx * flightDt;
      c.y += c.vy * flightDt + g * flightDt * flightDt / 2;
      c.vy += g * flightDt;
      c.rotation += flightDt * (c.type === "speedy" ? 3.8 : 2.7);

      if (c.x >= 870 && c.y + FEET <= 355) {
        c.phase = "landed";
        c.y = 338;
        c.rotation = 0;
        c.age = 0;

        let points = 1;
        if (c.type === "gold") points = 3;
        if (scene.combo >= 6) points += 2;
        else if (scene.combo >= 3) points += 1;

        scene.score += points;

        if (c.type === "gold") {
          effect("gold", 900, 305);
          signal("gold-save");
        } else if (points > 1) {
          effect("save", 900, 315);
          signal("combo");
        } else {
          effect("save", 900, 315);
          signal("saved");
        }
        stats();
        continue;
      }

      const newFeet = c.y + FEET;
      const crossed = c.vy > 0 && oldFeet <= SHELL_Y && newFeet >= SHELL_Y;

      if (crossed) {
        const hitTime = (-oldVy + Math.sqrt(oldVy * oldVy + 2 * g * (SHELL_Y - oldFeet))) / g;
        const hitX = oldX + vx * hitTime;
        const dx = hitX - scene.turtle.x;
        const shellHalf = SHELL_HALF;

        if (Math.abs(dx) <= shellHalf) {
          const norm = dx / SHELL_HALF;
          const isSweet = Math.abs(norm) <= 0.35;

          c.x = hitX;
          c.y = SHELL_Y - FEET;
          scene.turtle.impact = 1;
          bounces++;
          scene.combo++;
          if (scene.combo > scene.maxCombo) scene.maxCombo = scene.combo;

          // Stable airtime keeps three birds readable; edge hits do not scramble the rhythm.
          c.vy = -g * BOUNCE_TIME / 2;
          if (isSweet) {
            scene.perfectBounces++;
            effect("perfect", hitX, SHELL_Y - 15);
            signal("bounce-perfect");
          } else {
            effect("bounce", hitX, SHELL_Y);
            signal("bounce");
          }
          const remaining = flightDt - hitTime;
          c.x += c.vx * remaining;
          c.y += c.vy * remaining + g * remaining * remaining / 2;
          c.vy += g * remaining;
          stats();
        }
      }

      if (c.y > H - 35 || c.x > W + 30) {
        scene.lost.push({ x: clamp(c.x, 205, 840) });
        effect("splash", c.x, 505);
        scene.chickens.splice(i, 1);
        scene.misses++;
        scene.combo = 0;
        scene.shake = 1;
        signal("splash");
        stats();
        if (scene.misses >= 3) { end(); break; }
      }
    }
  }
  function animateEffects(dt) {
    scene.turtle.impact = Math.max(0, scene.turtle.impact - dt * 4);
    scene.shake = Math.max(0, scene.shake - dt * 3);
    for (let i = scene.effects.length - 1; i >= 0; i--) {
      const e = scene.effects[i];
      e.age += dt;
      if (e.age > (e.kind === "perfect" || e.kind === "gold" ? 1.5 : 1.2)) scene.effects.splice(i, 1);
    }
  }
  function tick(now) {
    if (scene.mode !== "running" && scene.mode !== "over") return;
    const delta = Math.max(0, (now - last) / 1000);
    last = now;
    if (delta > 0.5 && scene.mode === "running") { suspend(); return; }
    accumulator += Math.min(delta, 0.1);
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
    moveTurtle(((event.clientX - bounds.left) * W) / bounds.width);
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
    if (event.pointerType === "mouse" || canvas.hasPointerCapture(event.pointerId)) {
      inputMode = event.pointerType;
      position(event);
    }
  });
  listen(canvas, "pointercancel", () => suspend());
  listen(viewport, "pointerleave", (event) => {
    if (event.pointerType === "mouse" && inputMode === "mouse") suspend(true);
  });
  listen(viewport, "pointerenter", (event) => {
    if (event.pointerType === "mouse" && scene.mode === "paused" && pointerPause) {
      position(event);
      run();
    }
  });
  listen(window, "keydown", (event) => {
    if (["INPUT", "TEXTAREA"].includes(event.target?.tagName)) return;
    if (event.code === "Escape") {
      if (expanded) setExpanded(false);
      suspend();
      return;
    }
    // Space or P pauses/resumes during gameplay
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
    listen(button, "click", (event) => {
      if (event.detail === 0 && scene.mode === "running") moveTurtle(scene.turtle.x + Number(button.dataset.direction) * 75);
    });
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
  const observer = new IntersectionObserver((entries) => {
    if (!entries[0].isIntersecting) suspend();
  });
  observer.observe(canvas);
  stats();
  renderer.draw(scene);
  return () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
    soundObserver.disconnect();
    renderer.dispose();
    cleanup.forEach((remove) => remove());
    if (expanded) document.body.style.overflow = previousOverflow;
  };
}
