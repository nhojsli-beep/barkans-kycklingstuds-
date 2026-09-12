const W = 1000,
  H = 560,
  STEP = 1 / 120;
const SHELL_Y = 433,
  SHELL_HALF = 64,
  GRAVITY = 600;
const RECORD_KEY = "barkan-kycklingstuds-record";

export function initGame() {
  const root = document.querySelector("#game-root");
  if (!root) return () => {};
  root.innerHTML = `
    <section class="bounce-game" aria-labelledby="bounce-title">
      <div class="bounce-top"><div><p class="eyebrow">KLASSISK STUDS. LOKALT KAOS.</p><h3 id="bounce-title">BÄRKANS KYCKLINGSTUDS</h3></div><button class="button pause-game" disabled>Pausa</button></div>
      <div class="bounce-hud" aria-label="Spelstatistik"><div><span>PÅ KALASET</span><strong data-score>0</strong></div><div><span>KVAR ATT TAPPA</span><strong data-lives>3 / 3</strong></div><div><span>PERSONBÄSTA</span><strong data-best>0</strong></div></div>
      <div class="bounce-viewport">
        <canvas width="1000" height="560" tabindex="0" aria-label="Kycklingstuds. Flytta sköldpaddan med mus, finger eller vänster och höger pil. Studsa kycklingarna till högra stranden. Tre i vattnet avslutar spelet." aria-describedby="bounce-instructions"></canvas>
        <div class="bounce-overlay"><div class="bounce-panel"><p class="eyebrow" data-overlay-kicker>INBJUDAN: NÄSTAN 40-ÅRSKALAS</p><h4 data-overlay-title>ALLA SKA MED.<br>INGEN KAN SIMMA.</h4><p data-overlay-copy>Bärkan har bjudit hela hönsgården. Bron? Den skulle han ”bara fixa”. Styr sköldpaddan och studsa gästerna till kalaset. Tre i vattnet = slut på festen.</p><button class="button primary" data-play>SLÄPP KYCKLINGARNA ↗</button></div></div>
      </div>
      <div class="bounce-comment" role="status"><span>BÄRKAN SÄGER</span><p data-comment>”Det är lugnt. Jag har sett en bro på YouTube.”</p></div>
      <div class="bounce-bottom"><p id="bounce-instructions"><strong>FLYTTA, FÅNGA, STUDSA.</strong> Mus / dra med fingret / ← →<br>Fånga under kycklingarna. Varje gäst på högra stranden ger 1 poäng. P = paus.</p><div class="bounce-arrows" aria-label="Flytta sköldpaddan"><button type="button" data-direction="-1" aria-label="Flytta vänster">←</button><button type="button" data-direction="1" aria-label="Flytta höger">→</button></div></div>
    </section>`;
  const canvas = root.querySelector("canvas"),
    ctx = canvas.getContext("2d");
  if (!ctx) {
    root.querySelector("[data-overlay-copy]").textContent =
      "Din webbläsare saknar Canvas 2D. Öppna sidan i en aktuell version av Chrome, Firefox eller Safari.";
    root.querySelector("[data-play]").disabled = true;
    return () => {};
  }
  const overlay = root.querySelector(".bounce-overlay"),
    play = root.querySelector("[data-play]");
  const pause = root.querySelector(".pause-game"),
    scoreNode = root.querySelector("[data-score]");
  const livesNode = root.querySelector("[data-lives]"),
    bestNode = root.querySelector("[data-best]");
  const comment = root.querySelector("[data-comment]");
  let best = 0;
  try {
    const saved = Number(localStorage.getItem(RECORD_KEY));
    if (Number.isFinite(saved) && saved > 0) best = Math.floor(saved);
  } catch {}
  bestNode.textContent = best;
  let state = "ready",
    score = 0,
    misses = 0,
    elapsed = 0,
    spawnIn = 0.7;
  let paddle = 260,
    target = 260,
    left = false,
    right = false;
  let frame = 0,
    last = 0,
    accumulator = 0;
  const chickens = [],
    effects = [];
  const portrait = new Image();
  portrait.src = "./barkan.svg";
  portrait.onload = () => {
    if (state !== "running") draw();
  };
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  function say(text) {
    comment.textContent = `”${text}”`;
  }
  function signal(kind) {
    root.dispatchEvent(new CustomEvent("barkan-game-sound", { detail: kind }));
  }
  function stats() {
    scoreNode.textContent = score;
    livesNode.textContent = `${3 - misses} / 3`;
    root.dataset.state = state;
  }
  function showPanel(kicker, title, copy, action) {
    root.querySelector("[data-overlay-kicker]").textContent = kicker;
    root.querySelector("[data-overlay-title]").textContent = title;
    root.querySelector("[data-overlay-copy]").textContent = copy;
    play.textContent = action;
    overlay.hidden = false;
  }
  function start() {
    if (state === "paused") {
      resume();
      return;
    }
    cancelAnimationFrame(frame);
    score = 0;
    misses = 0;
    elapsed = 0;
    spawnIn = 0.7;
    chickens.length = 0;
    effects.length = 0;
    paddle = target = 260;
    left = right = false;
    say("Välkomna! Mitt välkomsttal har bara 46 kapitel.");
    run();
  }
  function run() {
    state = "running";
    overlay.hidden = true;
    pause.disabled = false;
    pause.textContent = "Pausa";
    stats();
    accumulator = 0;
    last = performance.now();
    canvas.focus({ preventScroll: true });
    canvas.scrollIntoView({ block: "center", behavior: "instant" });
    frame = requestAnimationFrame(tick);
  }
  function suspend() {
    if (state !== "running") return;
    cancelAnimationFrame(frame);
    state = "paused";
    left = right = false;
    pause.textContent = "Fortsätt";
    showPanel(
      "FIKAPAUS",
      "KYCKLINGARNA VÄNTAR.",
      "Spelet står still. Bärkan använder pausen till att förklara varför pauser är viktiga. Länge.",
      "FORTSÄTT KALASET ↗",
    );
    stats();
    draw();
  }
  function resume() {
    if (state === "paused") run();
  }
  function end() {
    state = "over";
    cancelAnimationFrame(frame);
    pause.disabled = true;
    left = right = false;
    const record = score > best;
    if (record) {
      best = score;
      bestNode.textContent = best;
      try {
        localStorage.setItem(RECORD_KEY, String(best));
      } catch {}
    }
    showPanel(
      record
        ? "NYTT PERSONBÄSTA. RING TRANÅS TIDNING."
        : "TRE PLASK. ETT MYCKET LÅNGT EFTERSNACK.",
      `${score} GÄSTER PÅ KALASET.`,
      score
        ? "Kycklingarna i vattnet fick badringar. Gästerna på land fick Bärkans livshistoria. Oklart vilka som hade mest tur."
        : "Ingen kom fram. Bärkan håller tal för en servett. Den har bett om notan.",
      "EN FEST TILL ↗",
    );
    say("Jag tar det kort. Först: en genomgång av varje kyckling.");
    stats();
    play.focus({ preventScroll: true });
  }
  function spawn() {
    chickens.push({ x: 120, y: 226, vx: 128, vy: -65, bounces: 0 });
  }
  function effect(x, y, text, color) {
    effects.push({ x, y, text, color, life: 1 });
  }
  function update(dt) {
    elapsed += dt;
    spawnIn -= dt;
    if (left || right)
      target = paddle + ((right ? 1 : 0) - (left ? 1 : 0)) * 630 * dt;
    target = clamp(target, 165, 823);
    paddle += clamp(target - paddle, -1000 * dt, 1000 * dt);
    if (spawnIn <= 0) {
      spawn();
      spawnIn += Math.max(1.15, 2.9 - elapsed * 0.016);
    }
    for (let i = chickens.length - 1; i >= 0; i--) {
      const c = chickens[i],
        oldFeet = c.y + 14;
      c.vy += GRAVITY * dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      // Swept feet crossing prevents fast falls from tunnelling through the shell or bank.
      if (c.vy > 0 && oldFeet <= 290 && c.y + 14 >= 290 && c.x >= 864) {
        score++;
        chickens.splice(i, 1);
        stats();
        effect(896, 250, "+1 GÄST", "#375627");
        signal("saved");
        const lines = [
          "En till! Jag börjar välkomsttalet från början.",
          "Du kom för tårtan. Du stannar för att jag blockerar dörren.",
          "Ingen går innan jag berättat om parkeringen.",
          "Stort hjärta. Små fåglar. Orimlig logistik.",
        ];
        say(lines[(score - 1) % lines.length]);
        continue;
      }
      if (
        c.vy > 0 &&
        oldFeet <= SHELL_Y &&
        c.y + 14 >= SHELL_Y &&
        Math.abs(c.x - paddle) <= SHELL_HALF + 8
      ) {
        c.y = SHELL_Y - 14;
        c.vy = -540;
        c.bounces++;
        effect(
          c.x,
          SHELL_Y - 30,
          ["BOING!", "BÄRK!", "STUDS!"][c.bounces % 3],
          "#293725",
        );
        signal("bounce");
      }
      if (c.y > 494 || c.x > 1040) {
        effects.push({
          x: c.x,
          y: 490,
          text: "PLASK!",
          color: "#fffbed",
          life: 1,
        });
        chickens.splice(i, 1);
        misses++;
        stats();
        signal("splash");
        say(
          [
            "Det där var vattenvägen. Enligt min plan.",
            "Två badar. Det räknas som poolparty, va?",
            "Vi behöver prata om bron. Har ni tre timmar?",
          ][misses - 1],
        );
        if (misses === 3) {
          end();
          break;
        }
      }
    }
    for (let i = effects.length - 1; i >= 0; i--) {
      effects[i].life -= dt;
      effects[i].y -= 25 * dt;
      if (effects[i].life <= 0) effects.splice(i, 1);
    }
  }
  function tick(now) {
    if (state !== "running") return;
    const delta = (now - last) / 1000;
    last = now;
    // A suspended/throttled tab must not fast-forward into three unavoidable losses.
    if (delta > 0.5) {
      suspend();
      return;
    }
    accumulator += Math.max(0, delta);
    while (accumulator >= STEP && state === "running") {
      update(STEP);
      accumulator -= STEP;
    }
    draw();
    if (state === "running") frame = requestAnimationFrame(tick);
  }
  function ellipse(x, y, rx, ry, fill, stroke = "#293725") {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
  }
  function rect(x, y, w, h, fill) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
  }
  function text(value, x, y, size = 16, color = "#293725", align = "left") {
    ctx.font = `800 ${size}px "DM Sans", sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.fillText(value, x, y);
  }
  function chicken(c) {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(Math.sin(c.vy / 450) * 0.17);
    ellipse(0, 0, 17, 15, "#ffe37d");
    ellipse(-5, 3, 9, 6, "#edba53");
    ellipse(8, -11, 11, 11, "#fff091");
    ctx.beginPath();
    ctx.moveTo(17, -13);
    ctx.lineTo(27, -9);
    ctx.lineTo(17, -5);
    ctx.fillStyle = "#ef7056";
    ctx.fill();
    ctx.stroke();
    ellipse(12, -14, 2, 3, "#293725", null);
    ellipse(5, -23, 4, 4, "#ef7056");
    ctx.strokeStyle = "#a56335";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-2, 14);
    ctx.lineTo(-5, 20);
    ctx.moveTo(7, 14);
    ctx.lineTo(9, 20);
    ctx.stroke();
    ctx.restore();
  }
  function draw() {
    ctx.clearRect(0, 0, W, H);
    rect(0, 0, W, H, "#dce9db");
    // The town and bunting stay still: motion is reserved for the actual game.
    ellipse(754, 78, 42, 42, "#f4d97c", null);
    for (let i = 0; i < 5; i++) {
      const x = 195 + i * 127;
      ellipse(x, 80 + (i % 2) * 38, 46, 13, "#f5f5e8", null);
    }
    rect(130, 288, 740, 175, "#b8c6a3");
    for (let i = 0; i < 9; i++) {
      const x = 145 + i * 81,
        y = 248 - (i % 3) * 19;
      rect(x, y, 58, 82, "#a6b59a");
      ctx.beginPath();
      ctx.moveTo(x - 4, y);
      ctx.lineTo(x + 29, y - 22);
      ctx.lineTo(x + 62, y);
      ctx.fillStyle = "#889e84";
      ctx.fill();
      for (let n = 0; n < 3; n++)
        rect(x + 9 + n * 16, y + 14, 7, 12, "#dce5cc");
    }
    ctx.strokeStyle = "#819577";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 72);
    ctx.quadraticCurveTo(500, 155, 1000, 55);
    ctx.stroke();
    for (let i = 0; i < 15; i++) {
      const x = i * 72,
        y = 72 + Math.sin((i / 15) * Math.PI) * 35;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 24, y + 3);
      ctx.lineTo(x + 10, y + 28);
      ctx.closePath();
      ctx.fillStyle = i % 2 ? "#ef7056" : "#d7fc70";
      ctx.fill();
      ctx.stroke();
    }
    rect(0, 464, W, 96, "#598f8b");
    for (let row = 0; row < 3; row++) {
      ctx.beginPath();
      for (let x = 0; x <= W; x += 8) {
        const y = 475 + row * 32 + Math.sin(x / 37 + elapsed * 1.6 + row) * 4;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = row % 2 ? "#91b7a8" : "#c5d9bc";
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    const sharkX = 490 + Math.sin(elapsed * 0.23) * 115;
    ctx.beginPath();
    ctx.moveTo(sharkX - 24, 512);
    ctx.lineTo(sharkX + 8, 487);
    ctx.lineTo(sharkX + 18, 512);
    ctx.fillStyle = "#396b6a";
    ctx.fill();
    text("EN HELT VEGETARISK HAJ", sharkX, 542, 9, "#d3e4ca", "center");
    rect(0, 255, 136, 305, "#87996c");
    rect(0, 255, 136, 15, "#d7fc70");
    rect(864, 290, 136, 270, "#87996c");
    rect(864, 290, 136, 15, "#d7fc70");
    for (let i = 0; i < 5; i++) {
      rect(18 + (i % 2) * 35, 302 + i * 49, 40, 4, "#70835b");
      rect(886 + (i % 2) * 28, 337 + i * 45, 42, 4, "#70835b");
    }
    text("HÖNSGÅRDEN", 65, 211, 11, "#34472d", "center");
    text("TRANÅS", 65, 229, 10, "#677a54", "center");
    rect(881, 319, 106, 37, "#eeeee4");
    text("BÄRKAN 39-ish", 934, 342, 11, "#293725", "center");
    if (portrait.complete && portrait.naturalWidth)
      ctx.drawImage(portrait, 869, 132, 134, 158);
    // Cake, candle and a ludicrously small party hat.
    rect(875, 267, 24, 22, "#f7e2a8");
    rect(875, 265, 24, 6, "#ef7056");
    rect(885, 251, 3, 15, "#eeeee4");
    ellipse(887, 249, 3, 5, "#efb851", null);
    ctx.beginPath();
    ctx.moveTo(924, 158);
    ctx.lineTo(943, 119);
    ctx.lineTo(954, 161);
    ctx.fillStyle = "#d7fc70";
    ctx.fill();
    ctx.strokeStyle = "#293725";
    ctx.stroke();
    ellipse(943, 117, 4, 4, "#ef7056");
    // The turtle is the paddle, not a jump button.
    const bob = state === "running" ? Math.sin(elapsed * 7) * 2 : 0;
    ellipse(paddle - 37, SHELL_Y + 27 + bob, 17, 8, "#a7bd70");
    ellipse(paddle + 32, SHELL_Y + 29 + bob, 18, 8, "#a7bd70");
    ellipse(paddle + 70, SHELL_Y + 8, 20, 13, "#d7df8b");
    ellipse(paddle, SHELL_Y + 9, SHELL_HALF, 26, "#6b824b");
    for (let i = -1; i <= 1; i++)
      ellipse(
        paddle + i * 31,
        SHELL_Y + 8,
        13,
        16,
        i % 2 ? "#b6c779" : "#94aa60",
      );
    ellipse(paddle + 77, SHELL_Y + 4, 2.5, 3, "#293725", null);
    text("SKÖLD-BÄRKAN", paddle, SHELL_Y + 16, 8, "#263520", "center");
    if (state === "ready") {
      chicken({ x: 215, y: 310, vy: 100 });
      chicken({ x: 526, y: 233, vy: -100 });
    }
    for (const c of chickens) chicken(c);
    for (const e of effects) {
      ctx.globalAlpha = Math.max(0, e.life);
      text(e.text, e.x, e.y, 18, e.color, "center");
    }
    ctx.globalAlpha = 1;
  }
  function position(event) {
    const bounds = canvas.getBoundingClientRect();
    target = clamp(
      ((event.clientX - bounds.left) * W) / bounds.width,
      165,
      823,
    );
  }
  function pointerDown(event) {
    if (state !== "running") return;
    event.preventDefault();
    canvas.focus({ preventScroll: true });
    canvas.setPointerCapture(event.pointerId);
    position(event);
  }
  function pointerMove(event) {
    if (
      state === "running" &&
      (event.pointerType === "mouse" ||
        canvas.hasPointerCapture(event.pointerId))
    )
      position(event);
  }
  function keyDown(event) {
    if (event.code === "KeyP" && !event.repeat) {
      event.preventDefault();
      state === "running" ? suspend() : resume();
      return;
    }
    if (state !== "running") return;
    if (event.code === "ArrowLeft" || event.code === "ArrowRight") {
      event.preventDefault();
      if (event.code === "ArrowLeft") left = true;
      else right = true;
    }
  }
  function keyUp(event) {
    if (event.code === "ArrowLeft") left = false;
    if (event.code === "ArrowRight") right = false;
  }
  function release() {
    left = right = false;
  }
  function visibility() {
    if (document.hidden) suspend();
  }
  function pauseClick() {
    state === "running" ? suspend() : resume();
  }
  play.addEventListener("click", start);
  pause.addEventListener("click", pauseClick);
  canvas.addEventListener("pointerdown", pointerDown);
  canvas.addEventListener("pointermove", pointerMove);
  canvas.addEventListener("keydown", keyDown);
  canvas.addEventListener("keyup", keyUp);
  canvas.addEventListener("blur", release);
  const arrowCleanups = [];
  root.querySelectorAll("[data-direction]").forEach((button) => {
    const down = (event) => {
      if (state !== "running") return;
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      if (button.dataset.direction === "-1") left = true;
      else right = true;
    };
    const up = () => release();
    const click = (event) => {
      if (event.detail === 0 && state === "running")
        target = clamp(
          target + Number(button.dataset.direction) * 65,
          165,
          823,
        );
    };
    button.addEventListener("pointerdown", down);
    button.addEventListener("pointerup", up);
    button.addEventListener("pointercancel", up);
    button.addEventListener("lostpointercapture", up);
    button.addEventListener("click", click);
    arrowCleanups.push(() => {
      button.removeEventListener("pointerdown", down);
      button.removeEventListener("pointerup", up);
      button.removeEventListener("pointercancel", up);
      button.removeEventListener("lostpointercapture", up);
      button.removeEventListener("click", click);
    });
  });
  document.addEventListener("visibilitychange", visibility);
  const observer = new IntersectionObserver((entries) => {
    if (!entries[0].isIntersecting) suspend();
  });
  observer.observe(canvas);
  stats();
  draw();
  return () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
    portrait.onload = null;
    document.removeEventListener("visibilitychange", visibility);
    play.removeEventListener("click", start);
    pause.removeEventListener("click", pauseClick);
    canvas.removeEventListener("pointerdown", pointerDown);
    canvas.removeEventListener("pointermove", pointerMove);
    canvas.removeEventListener("keydown", keyDown);
    canvas.removeEventListener("keyup", keyUp);
    canvas.removeEventListener("blur", release);
    arrowCleanups.forEach((clean) => clean());
  };
}
