// A classic three-bounce reconstruction, approximately supported by the reference.
// This module owns simulation time; controllers pass elapsed frame time to stepGame.
export const W = 1000;
export const H = 625;
export const STEP = 1 / 120;
export const RULES = Object.freeze({
  shellY: 495, shellHalf: 105, perfectHalf: 39.9, feet: 17,
  bounceTime: 1.8, gravity: 780, stride: 205, launchVy: -240,
  walkSpeed: 75, cliffEdgeX: 160, cliffY: 183, requiredBounces: 3,
  turtleMinX: 260, turtleMaxX: 750, turtleSpeed: 1400,
  partyX: 870, partyY: 345, vx: 205 / 1.8, bounceVy: 780 * (1.8 / 2),
});

const WAVES = [
  { sizes: [1], interval: 4.1 },
  { sizes: [1, 2], interval: 2.8 },
  { sizes: [2, 3], interval: 2.2 },
  { sizes: [2, 3, 4], interval: 1.7 },
  { sizes: [3, 4], interval: 1.35 },
];
const EPSILON = 1e-9;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const sound = (callback, kind) => { if (callback) callback(kind); };
const active = bird => bird.phase === "queued" || bird.phase === "flying";
const waveFor = saved => saved >= 50 ? 5 : saved >= 25 ? 4 : saved >= 10 ? 3 : saved >= 3 ? 2 : 1;
const multiplier = combo => Math.min(3, 1 + Math.floor(Math.max(0, combo - 1) / 10));

// Positive, downward intersection of the ballistic arc with a horizontal plane.
function fallTime(y, vy, plane) {
  const discriminant = vy * vy + 2 * RULES.gravity * (plane - y);
  return discriminant < 0 ? Infinity : (-vy + Math.sqrt(discriminant)) / RULES.gravity;
}
const firstFlight = fallTime(RULES.cliffY + RULES.feet, RULES.launchVy, RULES.shellY);

export function createGameState() {
  return {
    mode: "ready", roundKind: "arcade", resumeMode: null, countdownRemaining: 0,
    time: 0, score: 0, saved: 0, misses: 0, combo: 0, maxCombo: 0,
    bounces: 0, perfectBounces: 0, wave: 1,
    turtle: { x: 300, impact: 0, facing: 1, vx: 0 },
    chickens: [], effects: [], lost: [], shake: 0, reducedMotion: false,
    feedback: "", _accumulator: 0, _released: 0, _clusterIndex: 0,
    _nextClusterTime: 0,
  };
}

export function beginRound(state, kind, onSound) {
  const reducedMotion = state.reducedMotion;
  Object.assign(state, createGameState());
  state.reducedMotion = reducedMotion;
  state.roundKind = kind === "practice" ? "practice" : "arcade";
  state.mode = "countdown";
  state.countdownRemaining = 3;
  sound(onSound, "countdown");
}

export function setPaused(state, paused) {
  if (paused && (state.mode === "countdown" || state.mode === "running" || state.mode === "practice")) {
    state.resumeMode = state.mode;
    state.mode = "paused";
    state._accumulator = 0;
  } else if (!paused && state.mode === "paused") {
    state.mode = state.resumeMode;
    state.resumeMode = null;
    state._accumulator = 0;
  }
}

export function canScheduleContacts(state, candidateContacts) {
  const contacts = [];
  for (const bird of state.chickens) {
    if (!active(bird)) continue;
    for (const contact of bird.contacts) {
      if (contact.bounce > bird.bounces && contact.time >= state.time - EPSILON) contacts.push(contact);
    }
  }
  contacts.push(...candidateContacts);
  contacts.sort((a, b) => a.time - b.time);
  let min = state.turtle.x;
  let max = min;
  let time = state.time;
  for (const contact of contacts) {
    const margin = RULES.turtleSpeed * Math.max(0, contact.time - time - 0.12);
    min = Math.max(RULES.turtleMinX, contact.x - RULES.shellHalf, min - margin);
    max = Math.min(RULES.turtleMaxX, contact.x + RULES.shellHalf, max + margin);
    if (min > max + EPSILON) return false;
    time = contact.time;
  }
  return true;
}

function addEffect(state, kind, x, y, points = 0, message = "") {
  const duration = kind === "bounce" || kind === "splash" ? 0.6 : 0.9;
  state.effects.push({ kind, x, y, age: 0, seed: state._released + state.bounces,
    points, duration, message });
}

function updateWave(state, onSound) {
  const wave = waveFor(state.saved);
  if (wave === state.wave) return;
  state.wave = wave;
  addEffect(state, "wave", W / 2, 48, 0, `VÅG ${wave}`);
  sound(onSound, "wave");
}

function makeBird(state, index, spawnTime) {
  const x = state._released + index === 0 ? 120 : 50;
  const contactTime = spawnTime + (RULES.cliffEdgeX - x) / RULES.walkSpeed + firstFlight;
  const contactX = RULES.cliffEdgeX + RULES.vx * firstFlight;
  const contacts = [];
  for (let bounce = 1; bounce <= RULES.requiredBounces; bounce++) {
    contacts.push({ time: contactTime + (bounce - 1) * RULES.bounceTime,
      x: contactX + (bounce - 1) * RULES.stride, bounce });
  }
  const id = state._released + index + 1;
  return { id, phase: "queued", clusterId: state._clusterIndex, clusterIndex: index,
    spawnTime, x, y: RULES.cliffY, baseY: RULES.cliffY, vx: 0, vy: 0,
    bounces: 0, perfectHits: 0, age: 0, rotation: 0, impact: 0,
    type: state.roundKind !== "practice" && state.wave >= 2 && id % 8 === 0 ? "gold" : "normal",
    contacts, preview: null };
}

function scheduleCluster(state) {
  if (state.time + EPSILON < state._nextClusterTime) return;
  let activeCount = 0;
  for (const bird of state.chickens) if (active(bird)) activeCount++;
  const practice = state.roundKind === "practice";
  if ((practice || state.saved === 0) && activeCount) return;
  const wave = WAVES[state.wave - 1];
  const size = practice ? 1 : wave.sizes[state._clusterIndex % wave.sizes.length];
  if (activeCount + size > 12) {
    state._nextClusterTime = state.time + 0.10;
    return;
  }
  const birds = [];
  const contacts = [];
  for (let i = 0; i < size; i++) {
    const bird = makeBird(state, i, state.time + i * 0.18);
    birds.push(bird);
    contacts.push(...bird.contacts);
  }
  if (!canScheduleContacts(state, contacts)) {
    state._nextClusterTime = state.time + 0.10;
    return;
  }
  if (practice) { state.lost.length = 0; state.feedback = ""; }
  state.chickens.push(...birds);
  state._released += size;
  state._clusterIndex++;
  state._nextClusterTime = practice ? Infinity : state.time + wave.interval;
}

function saveBird(state, bird, onSound) {
  bird.phase = "landed";
  bird.y = RULES.partyY - RULES.feet;
  bird.rotation = 0;
  bird.age = 0;
  bird.preview = null;
  bird.contacts.length = 0;
  if (state.roundKind === "practice") {
    state.feedback = "BRA! TRE STUDSAR.";
    state._nextClusterTime = state.time + 1;
    addEffect(state, "save", 900, 315, 0, state.feedback);
    sound(onSound, "saved");
    return;
  }
  const oldMultiplier = multiplier(state.combo);
  state.saved++;
  state.combo++;
  state.maxCombo = Math.max(state.maxCombo, state.combo);
  const newMultiplier = multiplier(state.combo);
  const points = ((bird.type === "gold" ? 3 : 1) + bird.perfectHits) * newMultiplier;
  state.score += points;
  addEffect(state, bird.type === "gold" ? "gold" : "save", 900, 315, points);
  sound(onSound, bird.type === "gold" ? "gold-save" : newMultiplier > oldMultiplier ? "combo" : "saved");
  updateWave(state, onSound);
}

function missBird(state, bird, x, onSound) {
  bird.contacts.length = 0;
  state.lost.push({ x: clamp(x, 205, 840) });
  addEffect(state, "splash", x, 505);
  state.shake = 1;
  sound(onSound, "splash");
  if (state.roundKind === "practice") {
    state.feedback = "FÖRSÖK IGEN. FÅNGA TRE STUDSAR.";
    state.effects[state.effects.length - 1].message = state.feedback;
    state._nextClusterTime = state.time + 1;
  } else {
    state.misses++;
    state.combo = 0;
    if (state.misses >= 3) {
      state.mode = "over";
      state.chickens.length = 0;
      state._nextClusterTime = Infinity;
      sound(onSound, "over");
    }
  }
}

function advanceFlight(bird, dt) {
  bird.x += bird.vx * dt;
  bird.y += bird.vy * dt + 0.5 * RULES.gravity * dt * dt;
  bird.vy += RULES.gravity * dt;
}

function updateBird(state, bird, dt, startTime, turtleStart, turtleVelocity, turtleTarget, onSound, isPointer) {
  bird.age += dt;
  bird.impact = Math.max(0, bird.impact - dt * 5);
  let elapsed = 0;
  if (bird.phase === "queued") {
    elapsed = Math.max(0, bird.spawnTime - startTime);
    if (elapsed >= dt) return true;
    const toEdge = (RULES.cliffEdgeX - bird.x) / RULES.walkSpeed;
    const walk = Math.min(dt - elapsed, toEdge);
    bird.x += RULES.walkSpeed * walk;
    elapsed += walk;
    if (toEdge > walk + EPSILON) return true;
    bird.x = RULES.cliffEdgeX;
    bird.phase = "flying";
    bird.vx = RULES.vx;
    bird.vy = RULES.launchVy;
  }
  if (bird.phase === "landed") {
    bird.x += 85 * dt;
    return bird.x <= W + 40;
  }
  const remaining = dt - elapsed;
  const oldFeet = bird.y + RULES.feet;
  const newFeet = oldFeet + bird.vy * remaining + 0.5 * RULES.gravity * remaining * remaining;
  const newVy = bird.vy + RULES.gravity * remaining;
  if (bird.bounces >= RULES.requiredBounces && newVy > 0 && newFeet >= RULES.partyY &&
      bird.x + bird.vx * remaining >= RULES.partyX) {
    advanceFlight(bird, remaining);
    saveBird(state, bird, onSound);
    return true;
  }
  if (bird.bounces < RULES.requiredBounces && newVy > 0 && oldFeet <= RULES.shellY && newFeet >= RULES.shellY) {
    const hitTime = clamp(fallTime(oldFeet, bird.vy, RULES.shellY), 0, remaining);
    const hitFrac = remaining ? hitTime / remaining : 0;
    const hitX = bird.x + bird.vx * remaining * hitFrac;
    const turtleX = isPointer ? turtleTarget : clamp(turtleStart + turtleVelocity * (elapsed + hitTime),
      Math.min(turtleStart, turtleTarget), Math.max(turtleStart, turtleTarget));
    const distance = Math.abs(hitX - turtleX);
    if (distance > RULES.shellHalf + EPSILON) {
      missBird(state, bird, hitX, onSound);
      return false;
    }
    bird.x = hitX;
    bird.y = RULES.shellY - RULES.feet;
    bird.vy = -RULES.bounceVy;
    bird.bounces++;
    state.bounces++;
    bird.impact = state.turtle.impact = 1;
    const perfect = distance <= RULES.perfectHalf + EPSILON;
    if (perfect) { bird.perfectHits++; state.perfectBounces++; }
    addEffect(state, perfect ? "perfect" : "bounce", hitX, RULES.shellY - 15);
    sound(onSound, perfect ? "bounce-perfect" : "bounce");
    // Reservations are removed as soon as their contacts are consumed.
    while (bird.contacts.length && bird.contacts[0].bounce <= bird.bounces) bird.contacts.shift();
    advanceFlight(bird, remaining - hitTime);
  } else {
    advanceFlight(bird, remaining);
  }
  bird.rotation += remaining * 2.8;
  return true;
}

function updatePreview(state, bird) {
  if (bird.phase !== "flying" || bird.vy <= 0 || bird.bounces >= RULES.requiredBounces) {
    bird.preview = null;
    return;
  }
  const seconds = fallTime(bird.y + RULES.feet, bird.vy, RULES.shellY);
  const x = bird.x + bird.vx * seconds;
  if (seconds < 0 || seconds > 1.6 || x >= RULES.partyX) { bird.preview = null; return; }
  const distance = Math.abs(x - state.turtle.x);
  const preview = bird.preview || (bird.preview = {});
  preview.x = x;
  preview.seconds = seconds;
  preview.bounce = bird.bounces + 1;
  preview.alignment = distance <= RULES.perfectHalf + EPSILON ? "perfect" :
    distance <= RULES.shellHalf + EPSILON ? "hit" : "miss";
}

function animateEffects(state, dt) {
  for (let i = state.effects.length - 1; i >= 0; i--) {
    const effect = state.effects[i];
    effect.age += dt;
    if (effect.age + EPSILON >= effect.duration) state.effects.splice(i, 1);
  }
  state.shake = Math.max(0, state.shake - dt * 4);
  state.turtle.impact = Math.max(0, state.turtle.impact - dt * 5);
}

function fixedStep(state, dt, input, onSound) {
  if (state.mode === "over") { animateEffects(state, dt); return; }
  if (state.mode === "countdown") {
    const before = state.countdownRemaining;
    state.countdownRemaining = Math.max(0, before - dt);
    if (before > 2 + EPSILON && state.countdownRemaining <= 2 + EPSILON) sound(onSound, "countdown");
    if (before > 1 + EPSILON && state.countdownRemaining <= 1 + EPSILON) sound(onSound, "countdown");
    if (state.countdownRemaining > EPSILON) return;
    state.countdownRemaining = 0;
    state.mode = state.roundKind === "practice" ? "practice" : "running";
    sound(onSound, "start");
    scheduleCluster(state);
    return;
  }
  const startTime = state.time;
  animateEffects(state, dt);
  updateWave(state, onSound);
  scheduleCluster(state);
  const turtleStart = state.turtle.x;
  const isPointer = input.targetX != null;
  const target = isPointer ? clamp(input.targetX, RULES.turtleMinX, RULES.turtleMaxX) :
    clamp(turtleStart + input.direction * RULES.turtleSpeed * dt, RULES.turtleMinX, RULES.turtleMaxX);
  const nextX = isPointer ? target :
    turtleStart + Math.sign(target - turtleStart) * Math.min(Math.abs(target - turtleStart), RULES.turtleSpeed * dt);
  const turtleVelocity = Math.sign(target - turtleStart) * RULES.turtleSpeed;
  state.turtle.vx = turtleVelocity;
  if (Math.abs(nextX - turtleStart) > 0.01) state.turtle.facing = Math.sign(nextX - turtleStart);
  state.turtle.x = nextX;
  state.time += dt;
  // Release order is stable; identical trajectories do not overtake one another.
  for (let i = 0; i < state.chickens.length;) {
    const bird = state.chickens[i];
    const keep = updateBird(state, bird, dt, startTime, turtleStart, turtleVelocity, target, onSound, isPointer);
    if (state.mode === "over") break;
    if (!keep) state.chickens.splice(i, 1);
    else { updatePreview(state, bird); i++; }
  }
}

const IDLE_INPUT = Object.freeze({ direction: 0, targetX: null });
export function stepGame(state, dt, input = IDLE_INPUT, onSound) {
  if (state.mode === "ready" || state.mode === "paused" || !Number.isFinite(dt) || dt <= 0) return;
  state._accumulator += Math.min(0.1, dt);
  while (state._accumulator + EPSILON >= STEP) {
    state._accumulator = Math.max(0, state._accumulator - STEP);
    fixedStep(state, STEP, input, onSound);
  }
}
