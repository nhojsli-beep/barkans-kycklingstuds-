import { W, H, STEP, RULES, createGameState, beginRound, stepGame, setPaused } from "./game-core.js?v=7";
import { createRenderer } from "./game-renderer.js?v=7";

const RECORD_KEY = "barkan-kycklingstuds-record";
const DIRECTIONS = new Map([["ArrowLeft", -1], ["KeyA", -1], ["ArrowRight", 1], ["KeyD", 1]]);
const activeMode = mode => mode === "countdown" || mode === "running" || mode === "practice";
const label = (full, short) => `<span class="bounce-label-full">${full}</span><span class="bounce-label-short" aria-hidden="true">${short}</span>`;

export function initGame() {
  const root = document.querySelector("#game-root");
  if (!root) return () => {};
  root.innerHTML = `
    <section class="bounce-game" role="region" aria-labelledby="bounce-title">
      <div class="bounce-top">
        <div class="bounce-brand"><p class="eyebrow">TRANÅS ARCADE CLUB / SEDAN NYSS</p><h3 id="bounce-title">BÄRKANS KYCKLINGSTUDS</h3></div>
        <div class="bounce-actions">
          <button type="button" class="button sound-game" data-game-sound aria-pressed="false" aria-label="Slå på spelljud">Ljud av</button>
          <button type="button" class="button pause-game" aria-label="Pausa spelet" disabled>Pausa</button>
          <button type="button" class="button expand-game" aria-pressed="false" aria-label="Förstora spelet">${label("Förstora ↗", "Större ↗")}</button>
        </div>
      </div>
      <div class="bounce-hud" aria-label="Spelstatistik">
        <div><span>POÄNG</span><strong data-score>0</strong></div>
        <div><span>LIV</span><strong data-lives aria-label="3 av 3 liv"><i></i><i></i><i></i></strong></div>
        <div><span>RÄDDADE</span><strong data-saved>0</strong></div>
        <div><span>PERSONBÄSTA</span><strong data-best>0</strong></div>
      </div>
      <div class="bounce-hud-secondary"><span>VÅG <strong data-wave>1</strong></span><span><strong data-combo>0</strong> I RAD · <strong data-multiplier>×1</strong></span></div>
      <div class="bounce-stage-area"><div class="bounce-viewport">
        <canvas width="${W}" height="${H}" tabindex="0" aria-label="Flytta sköldpaddan. Fånga varje kyckling tre gånger på skalet innan den når kalaset. Träff mitt på skalet ger perfekt studs. Tre plask avslutar en arkadrunda." aria-describedby="bounce-instructions"></canvas>
        <div class="bounce-countdown" aria-hidden="true" hidden>3</div>
        <div class="bounce-practice-status" hidden><strong data-practice-progress>ÖVNING · 0/${RULES.requiredBounces}</strong><span data-feedback>Följ landningsmarkören.</span></div>
        <div class="bounce-overlay"><div class="bounce-panel" aria-labelledby="bounce-panel-title">
          <div class="bounce-panel-content">
            <img class="bounce-panel-portrait" src="./barkan.svg" alt="" width="84" height="96">
            <p class="eyebrow" data-overlay-kicker>ETT KALAS. INGEN BRO. DIN TUR.</p>
            <h4 id="bounce-panel-title" data-overlay-title>ALLA SKA TILL KALASET.</h4>
            <p data-overlay-copy hidden></p>
            <ol class="bounce-steps"><li>Flytta sköldpaddan.</li><li>Fånga varje kyckling tre gånger.</li><li>Tre plask avslutar rundan.</li></ol>
            <div class="bounce-result" hidden>
              <div><span>POÄNG</span><strong data-result-score>0</strong></div>
              <div><span>RÄDDADE</span><strong data-result-saved>0</strong></div>
              <div><span>BÄSTA SVIT</span><strong data-result-combo>0</strong></div>
              <div><span>PERFEKTA STUDSAR</span><strong data-result-perfect>0</strong></div>
              <div class="bounce-result-total"><span>TOTALA STUDSAR</span><strong data-result-bounces>0</strong></div>
            </div>
          </div>
          <div class="bounce-panel-actions">
            <button type="button" class="button primary" data-play aria-label="Starta kalaset">${label("STARTA KALASET", "STARTA")}</button>
            <button type="button" class="button" data-practice aria-label="Öva studsen">${label("ÖVA STUDSEN", "ÖVA")}</button>
            <button type="button" class="button primary" data-resume aria-label="Fortsätt kalaset" hidden>${label("FORTSÄTT KALASET ↗", "FORTSÄTT")}</button>
            <button type="button" class="button" data-menu hidden>TILL MENYN</button>
          </div>
        </div></div>
      </div></div>
      <div class="bounce-bottom">
        <p id="bounce-instructions"><strong>TRE STUDSAR ÖVER SOMMEN.</strong><br>Mus / dra med fingret / ← → eller A D · P / mellanslag = paus.<br><span>Vänd mobilen för större spelplan.</span></p>
        <div class="bounce-practice-actions" hidden><button type="button" class="button primary" data-start-arcade>BÖRJA KALASET</button><button type="button" class="button" data-menu>TILL MENYN</button></div>
        <div class="bounce-arrows" aria-label="Flytta sköldpaddan"><button type="button" data-direction="-1" aria-label="Flytta vänster" disabled>←</button><button type="button" data-direction="1" aria-label="Flytta höger" disabled>→</button></div>
      </div>
      <p class="bounce-live" role="status" aria-live="polite" aria-atomic="true"></p>
    </section>`;

  const game = root.querySelector(".bounce-game");
  const canvas = root.querySelector("canvas");
  const overlay = root.querySelector(".bounce-overlay");
  const play = root.querySelector("[data-play]");
  const practice = root.querySelector("[data-practice]");
  const resume = root.querySelector("[data-resume]");
  const pause = root.querySelector(".pause-game");
  const expand = root.querySelector(".expand-game");
  const sound = root.querySelector("[data-game-sound]");
  const result = root.querySelector(".bounce-result");
  const steps = root.querySelector(".bounce-steps");
  const copy = root.querySelector("[data-overlay-copy]");
  const portrait = root.querySelector(".bounce-panel-portrait");
  const countdown = root.querySelector(".bounce-countdown");
  const practiceActions = root.querySelector(".bounce-practice-actions");
  const practiceStatus = root.querySelector(".bounce-practice-status");
  const live = root.querySelector(".bounce-live");
  const arrowButtons = [...root.querySelectorAll("[data-direction]")];
  const lifePips = [...root.querySelector("[data-lives]").children];
  const nodes = Object.fromEntries(["score", "saved", "best", "wave", "combo", "multiplier"].map(key => [key, root.querySelector(`[data-${key}]`)]));
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const masterSound = document.querySelector("#sound");
  const cleanup = [];
  let scene = createGameState();
  scene.reducedMotion = motion.matches;
  let best = 0;
  try {
    const saved = Number(localStorage.getItem(RECORD_KEY));
    if (Number.isFinite(saved) && saved > 0) best = Math.floor(saved);
  } catch {}
  const input = { direction: 0, targetX: null };
  const heldKeys = new Set();
  const heldPointers = new Map();
  const hudState = {};
  let activePointer = null;
  let frame = 0;
  let last = 0;
  let expanded = false;
  let previousOverflow = "";
  let previousFocus = null;
  let disposed = false;
  let portraitAvailable = true;
  const canvasAvailable = !!canvas.getContext("2d");
  const renderer = canvasAvailable ? createRenderer(canvas) : null;

  function listen(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    cleanup.push(() => target.removeEventListener(type, handler, options));
  }
  function signal(kind) {
    root.dispatchEvent(new CustomEvent("barkan-game-sound", { detail: kind }));
  }
  function announce(message) { live.textContent = message; }
  function release() {
    heldKeys.clear();
    const pointer = activePointer;
    activePointer = null;
    if (pointer !== null && canvas.hasPointerCapture(pointer)) canvas.releasePointerCapture(pointer);
    for (const [id, entry] of heldPointers) {
      if (entry.button.hasPointerCapture(id)) entry.button.releasePointerCapture(id);
    }
    heldPointers.clear();
    input.direction = 0;
    input.targetX = null;
  }
  function updateDirection() {
    let left = false;
    let right = false;
    for (const key of heldKeys) {
      left ||= DIRECTIONS.get(key) === -1;
      right ||= DIRECTIONS.get(key) === 1;
    }
    for (const entry of heldPointers.values()) {
      left ||= entry.direction === -1;
      right ||= entry.direction === 1;
    }
    input.direction = Number(right) - Number(left);
    input.targetX = null;
  }
  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
  }
  function needsFrame() {
    return activeMode(scene.mode) || (scene.mode === "over" && (scene.effects.length > 0 || scene.shake > 0 || scene.turtle.impact > 0));
  }
  function run() {
    if (!disposed && !frame && needsFrame()) {
      last = performance.now();
      frame = requestAnimationFrame(tick);
    }
  }
  function showPanel(mode, record = false) {
    overlay.hidden = false;
    portrait.hidden = mode !== "ready" || !portraitAvailable;
    steps.hidden = mode !== "ready";
    result.hidden = mode !== "over";
    copy.hidden = mode === "ready";
    play.hidden = mode === "paused";
    practice.hidden = mode !== "ready";
    resume.hidden = mode !== "paused";
    root.querySelector(".bounce-panel-actions [data-menu]").hidden = mode !== "paused" || scene.roundKind !== "practice";
    const kicker = root.querySelector("[data-overlay-kicker]");
    const title = root.querySelector("[data-overlay-title]");
    if (mode === "ready") {
      kicker.textContent = "ETT KALAS. INGEN BRO. DIN TUR.";
      title.textContent = "ALLA SKA TILL KALASET.";
      play.innerHTML = label("STARTA KALASET", "STARTA");
      play.setAttribute("aria-label", "Starta kalaset");
    } else if (mode === "paused") {
      kicker.textContent = "FIKAPAUS";
      title.textContent = "INGEN STRESS. ÄN.";
      copy.textContent = "Spelet står still. Bärkan passar på att förklara varför pauser är viktiga. Länge. Fortsätt när kaffet är klart.";
    } else {
      kicker.textContent = record ? "NYTT REKORD. RING TRANÅS TIDNING." : "TRE PLASK. ETT LÅNGT EFTERSNACK.";
      title.textContent = `${scene.saved} GÄSTER PÅ KALASET.`;
      copy.textContent = scene.saved ? "Kycklingarna i Sommen fick badringar. Gästerna på land fick Bärkans livshistoria. Oklart vilka som hade mest tur." : "Ingen kom fram. Bärkan håller tal för en servett. Den har bett om notan.";
      play.innerHTML = label("SPELA IGEN ↗", "SPELA IGEN");
      play.setAttribute("aria-label", "Spela igen");
      for (const [key, value] of Object.entries({ score: scene.score, saved: scene.saved, combo: scene.maxCombo, perfect: scene.perfectBounces, bounces: scene.bounces })) {
        root.querySelector(`[data-result-${key}]`).textContent = value;
      }
    }
  }
  function stats() {
    const values = { score: scene.score, saved: scene.saved, best, wave: scene.wave, combo: scene.combo, multiplier: `×${Math.min(3, 1 + Math.floor(Math.max(0, scene.combo - 1) / 10))}` };
    for (const key in values) {
      if (hudState[key] !== values[key]) {
        if (key === "wave" && hudState.wave !== undefined && scene.wave > hudState.wave) announce(`Våg ${scene.wave}. Fler gäster är på väg!`);
        hudState[key] = values[key];
        nodes[key].textContent = values[key];
      }
    }
    if (hudState.misses !== scene.misses) {
      if (hudState.misses !== undefined && scene.misses > hudState.misses) announce(`Plask! ${3 - scene.misses} liv kvar.`);
      hudState.misses = scene.misses;
      root.querySelector("[data-lives]").setAttribute("aria-label", `${3 - scene.misses} av 3 liv`);
      lifePips.forEach((pip, i) => pip.classList.toggle("lost", i >= 3 - scene.misses));
    }
    if (hudState.mode !== scene.mode) {
      hudState.mode = scene.mode;
      root.dataset.state = game.dataset.state = scene.mode;
      game.dataset.roundKind = scene.roundKind;
      pause.disabled = !canvasAvailable || (!activeMode(scene.mode) && scene.mode !== "paused");
      pause.textContent = scene.mode === "paused" ? "Fortsätt" : "Pausa";
      pause.setAttribute("aria-label", scene.mode === "paused" ? "Fortsätt spelet" : "Pausa spelet");
      arrowButtons.forEach(button => { button.disabled = !activeMode(scene.mode) || !canvasAvailable; });
      overlay.hidden = scene.mode !== "ready" && scene.mode !== "paused" && scene.mode !== "over";
      if (scene.mode === "ready" || scene.mode === "paused") showPanel(scene.mode);
      if (scene.mode === "over") {
        release();
        const record = scene.roundKind === "arcade" && scene.score > best;
        if (record) {
          best = scene.score;
          nodes.best.textContent = hudState.best = best;
          try { localStorage.setItem(RECORD_KEY, String(best)); } catch {}
        }
        showPanel("over", record);
        announce(`Rundan är slut. ${scene.score} poäng. ${scene.saved} räddade gäster.${record ? " Nytt rekord!" : ""}`);
        play.focus({ preventScroll: true });
      }
    }
    countdown.hidden = scene.mode !== "countdown";
    if (!countdown.hidden) {
      const count = Math.max(1, Math.ceil(scene.countdownRemaining - STEP / 2));
      if (hudState.countdown !== count) { hudState.countdown = count; countdown.textContent = count; }
    }
    const practicing = scene.roundKind === "practice" && scene.mode !== "ready";
    practiceActions.hidden = !practicing;
    practiceStatus.hidden = !practicing || scene.mode === "paused";
    if (practicing) {
      let progress = 0;
      let hasActiveBird = false;
      for (const bird of scene.chickens) {
        if (bird.phase !== "queued" && bird.phase !== "flying") continue;
        hasActiveBird = true;
        progress = Math.max(progress, bird.bounces);
      }
      if (!hasActiveBird && scene.feedback.startsWith("BRA!")) progress = RULES.requiredBounces;
      const text = `ÖVNING · ${progress}/${RULES.requiredBounces}`;
      if (hudState.progress !== text) { hudState.progress = text; root.querySelector("[data-practice-progress]").textContent = text; }
      const feedback = scene.feedback || "Följ landningsmarkören. Fånga tre studsar.";
      if (hudState.feedback !== feedback) {
        hudState.feedback = feedback;
        root.querySelector("[data-feedback]").textContent = feedback;
        if (scene.feedback) announce(scene.feedback);
      }
    }
  }
  function tick(now) {
    frame = 0;
    if (disposed || !needsFrame()) return;
    const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;
    stepGame(scene, dt, input, signal);
    stats();
    renderer.draw(scene);
    if (needsFrame()) frame = requestAnimationFrame(tick);
  }
  function start(kind = "arcade") {
    if (!canvasAvailable) return;
    stop();
    release();
    beginRound(scene, kind, signal);
    stats();
    renderer.draw(scene);
    canvas.focus({ preventScroll: true });
    announce(kind === "practice" ? "Öva tre studsar. Kalaset börjar om tre sekunder." : "Kalaset börjar om tre sekunder.");
    run();
  }
  function suspend() {
    if (!activeMode(scene.mode)) { release(); return; }
    stop();
    release();
    setPaused(scene, true);
    stats();
    renderer.draw(scene);
    announce("Fikapaus. Spelet står still.");
  }
  function togglePause() {
    if (scene.mode === "paused") {
      stop();
      release();
      setPaused(scene, false);
      stats();
      renderer.draw(scene);
      canvas.focus({ preventScroll: true });
      announce("Kalaset fortsätter.");
      run();
    } else suspend();
  }
  function menu() {
    stop();
    release();
    scene = createGameState();
    scene.reducedMotion = motion.matches;
    stats();
    renderer.draw(scene);
    announce("Till menyn. Välj kalas eller övning.");
    play.focus({ preventScroll: true });
  }
  function position(event) {
    const bounds = canvas.getBoundingClientRect();
    if (bounds.width <= 0) return;
    if (event.pointerType === "mouse" && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) return;
    heldKeys.clear();
    for (const [id, entry] of heldPointers) {
      if (entry.button.hasPointerCapture(id)) entry.button.releasePointerCapture(id);
    }
    heldPointers.clear();
    input.direction = 0;
    input.targetX = ((event.clientX - bounds.left) * W) / bounds.width;
  }
  function setExpanded(value) {
    if (expanded === value) return;
    expanded = value;
    if (value) {
      previousOverflow = document.body.style.overflow;
      previousFocus = document.activeElement;
      document.body.style.overflow = "hidden";
      game.setAttribute("role", "dialog");
      game.setAttribute("aria-modal", "true");
    } else {
      document.body.style.overflow = previousOverflow;
      game.setAttribute("role", "region");
      game.removeAttribute("aria-modal");
    }
    game.classList.toggle("is-expanded", value);
    expand.setAttribute("aria-pressed", String(value));
    expand.setAttribute("aria-label", value ? "Lämna förstorat spelläge" : "Förstora spelet");
    expand.innerHTML = value ? label("Tillbaka ↙", "Stäng ↙") : label("Förstora ↗", "Större ↗");
    if (value) expand.focus({ preventScroll: true });
    else if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
  }
  function syncSound() {
    const unavailable = !masterSound || masterSound.disabled;
    const enabled = !unavailable && masterSound.getAttribute("aria-pressed") === "true";
    sound.disabled = unavailable;
    sound.setAttribute("aria-pressed", String(enabled));
    sound.setAttribute("aria-label", unavailable ? "Ljud saknas" : enabled ? "Stäng av spelljud" : "Slå på spelljud");
    sound.textContent = unavailable ? "Ljud saknas" : enabled ? "Ljud på" : "Ljud av";
  }

  listen(root, "click", event => {
    const button = event.target.closest("button");
    if (!button || button.disabled) return;
    if (button.hasAttribute("data-play") || button.hasAttribute("data-start-arcade")) start("arcade");
    else if (button.hasAttribute("data-practice")) start("practice");
    else if (button.hasAttribute("data-menu")) menu();
    else if (button === pause || button === resume) togglePause();
    else if (button === expand) setExpanded(!expanded);
    else if (button === sound) masterSound?.click();
  });
  listen(portrait, "error", () => { portraitAvailable = false; portrait.hidden = true; });
  listen(canvas, "pointerdown", event => {
    if (!activeMode(scene.mode) || (event.pointerType === "mouse" && event.button !== 0)) return;
    event.preventDefault();
    release();
    activePointer = event.pointerId;
    canvas.setPointerCapture(event.pointerId);
    canvas.focus({ preventScroll: true });
    position(event);
  });
  listen(canvas, "pointermove", event => {
    if (!activeMode(scene.mode)) return;
    if (event.pointerType === "mouse" || event.pointerId === activePointer) position(event);
  });
  const pointerEnd = event => {
    if (event.pointerId !== activePointer) return;
    activePointer = null;
    input.targetX = null;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  };
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) listen(canvas, type, pointerEnd);
  listen(canvas, "pointerleave", event => {
    if (event.pointerType === "mouse") input.targetX = null;
  });
  for (const button of arrowButtons) {
    listen(button, "pointerdown", event => {
      if (!activeMode(scene.mode)) return;
      event.preventDefault();
      if (!heldPointers.size) release();
      button.setPointerCapture(event.pointerId);
      heldPointers.set(event.pointerId, { direction: Number(button.dataset.direction), button });
      updateDirection();
    });
    const up = event => {
      heldPointers.delete(event.pointerId);
      updateDirection();
      if (button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId);
    };
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) listen(button, type, up);
  }
  listen(window, "keydown", event => {
    if (expanded && event.code === "Tab") {
      const buttons = [...game.querySelectorAll("button:not(:disabled)")].filter(button => button.getClientRects().length > 0);
      if (buttons.length) {
        const index = buttons.indexOf(document.activeElement);
        const next = event.shiftKey ? (index <= 0 ? buttons.length - 1 : index - 1) : (index + 1) % buttons.length;
        event.preventDefault();
        buttons[next].focus({ preventScroll: true });
      }
      return;
    }
    if (!expanded && !game.contains(document.activeElement)) return;
    if (event.target.closest("input, textarea, select, [contenteditable]:not([contenteditable='false'])")) return;
    if (event.code === "Escape") {
      event.preventDefault();
      if (expanded) setExpanded(false);
      suspend();
      return;
    }
    if (event.code === "Space" && event.target.closest("button, a, [role='button']")) return;
    if (event.code === "KeyP" || event.code === "Space") {
      if (activeMode(scene.mode) || scene.mode === "paused") {
        event.preventDefault();
        if (!event.repeat) togglePause();
      }
      return;
    }
    if (event.code === "KeyR" && scene.mode === "over") {
      event.preventDefault();
      if (!event.repeat) start("arcade");
      return;
    }
    if (DIRECTIONS.has(event.code) && activeMode(scene.mode)) {
      event.preventDefault();
      if (input.targetX !== null || activePointer !== null || heldPointers.size) release();
      heldKeys.add(event.code);
      updateDirection();
    }
  });
  listen(window, "keyup", event => {
    if (heldKeys.delete(event.code)) updateDirection();
  });
  listen(game, "focusout", event => {
    if (!game.contains(event.relatedTarget)) release();
  });
  listen(document, "focusin", event => {
    if (expanded && !game.contains(event.target)) expand.focus({ preventScroll: true });
  });
  listen(document, "visibilitychange", () => { if (document.hidden) suspend(); });
  listen(window, "blur", suspend);
  listen(motion, "change", () => {
    scene.reducedMotion = motion.matches;
    renderer?.draw(scene);
  });
  const soundObserver = new MutationObserver(syncSound);
  if (masterSound) soundObserver.observe(masterSound, { attributes: true, attributeFilter: ["aria-pressed", "disabled"] });
  syncSound();
  stats();
  if (canvasAvailable) renderer.draw(scene);
  else {
    copy.hidden = false;
    copy.textContent = "Spelet behöver Canvas 2D. Prova en aktuell version av Chrome, Firefox eller Safari.";
    play.disabled = practice.disabled = true;
  }

  return () => {
    disposed = true;
    stop();
    release();
    soundObserver.disconnect();
    cleanup.forEach(remove => remove());
    renderer?.dispose();
    if (expanded) setExpanded(false);
  };
}
