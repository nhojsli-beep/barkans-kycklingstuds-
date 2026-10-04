import test from 'node:test';
import assert from 'node:assert/strict';
import { W, H, STEP, RULES, createGameState, beginRound, stepGame, setPaused, canScheduleContacts } from '../game-core.js';

const idle = { direction: 0, targetX: null };
const close = (actual, expected, epsilon = 1e-8) => assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} != ${expected}`);
function running(kind = 'arcade') {
  const state = createGameState();
  state.mode = kind === 'practice' ? 'practice' : 'running';
  state.roundKind = kind;
  state._nextClusterTime = Infinity;
  return state;
}
function advance(state, seconds, input = idle, sounds = []) {
  for (let i = 0; i < Math.round(seconds / STEP); i++) stepGame(state, STEP, input, kind => sounds.push(kind));
  return sounds;
}
function bird(overrides = {}) {
  return { id: 1, phase: 'flying', spawnTime: 0, x: 300, y: 400, vx: RULES.vx, vy: 200,
    bounces: 0, perfectHits: 0, age: 0, rotation: 0, impact: 0, type: 'normal', contacts: [], preview: null, ...overrides };
}
function contactBird(hitX, hitTime = STEP / 2, overrides = {}) {
  const vy = 200;
  return bird({ x: hitX - RULES.vx * hitTime,
    y: RULES.shellY - RULES.feet - vy * hitTime - RULES.gravity * hitTime * hitTime / 2,
    vy, ...overrides });
}
function landingBird(overrides = {}) {
  return bird({ x: RULES.partyX, y: RULES.partyY - RULES.feet - 1, vy: 200,
    bounces: 3, ...overrides });
}
function autoSave(state) {
  for (let i = 0; i < 1500; i++) {
    const current = state.chickens.find(c => c.phase === 'queued' || c.phase === 'flying');
    if (current?.phase === 'landed') return;
    const targetX = current?.contacts[0]?.x ?? state.turtle.x;
    stepGame(state, STEP, { direction: 0, targetX });
    if (current && current.phase === 'landed') return current;
  }
  assert.fail('bird did not reach the party');
}

test('shared dimensions and the exact rule contract', () => {
  assert.equal(W, 1000); assert.equal(H, 625); assert.equal(STEP, 1 / 120);
  assert.deepEqual(RULES, { shellY: 495, shellHalf: 105, perfectHalf: 39.9, feet: 17,
    bounceTime: 1.8, gravity: 780, stride: 205, launchVy: -240, walkSpeed: 75,
    cliffEdgeX: 160, cliffY: 183, requiredBounces: 3, turtleMinX: 260,
    turtleMaxX: 750, turtleSpeed: 1400, partyX: 870, partyY: 345,
    vx: 205 / 1.8, bounceVy: 702 });
});

test('ready state is empty and inert; rounds reset without losing motion preference', () => {
  const state = createGameState();
  assert.equal(state.mode, 'ready');
  assert.deepEqual(state.chickens, []); assert.deepEqual(state.effects, []); assert.deepEqual(state.lost, []);
  advance(state, 1); assert.equal(state.time, 0);
  Object.assign(state, { score: 30, saved: 7, misses: 3, combo: 4, maxCombo: 5, bounces: 10, perfectBounces: 8, reducedMotion: true });
  state.chickens.push(bird()); state.effects.push({ kind: 'splash' }); state.lost.push({ x: 400 });
  const sounds = [];
  beginRound(state, 'arcade', kind => sounds.push(kind));
  assert.equal(state.mode, 'countdown'); assert.equal(state.countdownRemaining, 3);
  assert.equal(state.turtle.x, 300); assert.equal(state.reducedMotion, true);
  for (const key of ['time', 'score', 'saved', 'misses', 'combo', 'maxCombo', 'bounces', 'perfectBounces', '_released', '_clusterIndex']) assert.equal(state[key], 0);
  assert.deepEqual(state.chickens, []); assert.deepEqual(state.effects, []); assert.deepEqual(state.lost, []);
  assert.deepEqual(sounds, ['countdown']);
});

test('countdown emits exactly three ticks, then starts its first bird at x120', () => {
  const state = createGameState(); const sounds = [];
  beginRound(state, 'arcade', kind => sounds.push(kind));
  advance(state, 1, idle, sounds); assert.equal(state.chickens.length, 0);
  advance(state, 1, idle, sounds); assert.equal(state.mode, 'countdown');
  advance(state, 1, idle, sounds);
  assert.equal(state.mode, 'running'); assert.equal(state.time, 0);
  assert.deepEqual(sounds, ['countdown', 'countdown', 'countdown', 'start']);
  assert.equal(state.chickens.length, 1); assert.equal(state.chickens[0].x, 120);
  assert.equal(state.chickens[0].y, 183); assert.equal(state.chickens[0].contacts.length, 3);
  const contacts = state.chickens[0].contacts;
  close(contacts[1].time - contacts[0].time, 1.8); close(contacts[2].x - contacts[1].x, 205);
});

for (const offset of [-105, 105, -39.9, 39.9, -39.91, 39.91]) {
  test(`inclusive shell/perfect contact boundary ${offset}`, () => {
    const state = running(); state.turtle.x = 500;
    const c = contactBird(500 + offset); state.chickens.push(c);
    const sounds = advance(state, STEP);
    assert.equal(c.bounces, 1); assert.equal(state.bounces, 1); assert.equal(state.misses, 0);
    assert.equal(c.perfectHits, Math.abs(offset) <= 39.9 ? 1 : 0);
    assert.deepEqual(sounds, [Math.abs(offset) <= 39.9 ? 'bounce-perfect' : 'bounce']);
    close(c.vy, -702 + RULES.gravity * STEP / 2);
    close(c.y, 478 - 702 * STEP / 2 + RULES.gravity * (STEP / 2) ** 2 / 2);
    advance(state, STEP); assert.equal(c.bounces, 1); assert.equal(state.misses, 0);
  });
}
for (const offset of [-105.01, 105.01]) {
  test(`shell contact just outside ${offset} splashes immediately once`, () => {
    const state = running(); state.turtle.x = 500; state.combo = 6;
    state.chickens.push(contactBird(500 + offset));
    const sounds = advance(state, STEP);
    assert.equal(state.chickens.length, 0); assert.equal(state.misses, 1); assert.equal(state.combo, 0);
    close(state.lost[0].x, 500 + offset); close(state.effects[0].x, 500 + offset);
    assert.equal(state.effects[0].y, 505); assert.equal(state.shake, 1);
    assert.deepEqual(sounds, ['splash']); advance(state, STEP, idle, sounds);
    assert.deepEqual(sounds, ['splash']);
  });
}

test('contact uses turtle position at exact impact, not its end position', () => {
  const state = running(); state.turtle.x = 300;
  const hitTime = STEP / 4;
  state.chickens.push(contactBird(300 + 1400 * hitTime + 105, hitTime));
  advance(state, STEP, { direction: -1, targetX: null });
  assert.equal(state.misses, 1, 'moving away must miss even though starting position could catch');
  const other = running(); other.turtle.x = 300;
  other.chickens.push(contactBird(300 + 1400 * hitTime - 105, hitTime));
  advance(other, STEP, { direction: 1, targetX: null });
  assert.equal(other.bounces, 1, 'end position alone would incorrectly miss');
});

test('target arrival within a step stops movement before impact', () => {
  const state = running(); state.turtle.x = 300;
  state.chickens.push(contactBird(303 + 39.9, STEP * 0.8));
  advance(state, STEP, { direction: 0, targetX: 303 });
  assert.equal(state.turtle.x, 303); assert.equal(state.perfectBounces, 1);
});

test('cliff transition integrates the remaining substep without altering reservations', () => {
  const state = running();
  const c = bird({ phase: 'queued', x: 159.8, y: 183, vx: 0, vy: 0 }); state.chickens.push(c);
  advance(state, STEP);
  const remainder = STEP - 0.2 / 75;
  assert.equal(c.phase, 'flying'); close(c.x, 160 + RULES.vx * remainder);
  close(c.y, 183 - 240 * remainder + 390 * remainder ** 2);
  close(c.vy, -240 + 780 * remainder);
});

test('delta is clamped and small frames accumulate into identical fixed physics', () => {
  const a = running(); const b = running(); const c = running();
  a.chickens.push(bird()); b.chickens.push(bird()); c.chickens.push(bird());
  stepGame(a, 10); advance(b, 0.1);
  for (let i = 0; i < 24; i++) stepGame(c, STEP / 2);
  close(a.time, 0.1); close(a.chickens[0].y, b.chickens[0].y); close(a.chickens[0].y, c.chickens[0].y);
});

test('all input modes share speed and world clamps', () => {
  const state = running(); advance(state, STEP, { direction: 1, targetX: null });
  close(state.turtle.x, 300 + 1400 * STEP);
  advance(state, 1, { direction: 0, targetX: 1000 }); assert.equal(state.turtle.x, 750);
  advance(state, 1, { direction: -1, targetX: null }); assert.equal(state.turtle.x, 260);
  advance(state, 1, idle); assert.equal(state.turtle.x, 260);
});

for (const type of ['normal', 'gold']) {
  test(`three actual perfect contacts pay ${type === 'gold' ? 6 : 4} points only at arrival for ${type}`, () => {
    const state = createGameState(); beginRound(state, 'arcade'); advance(state, 3);
    state.chickens[0].type = type;
    const c = autoSave(state);
    assert.equal(c.bounces, 3); assert.equal(c.perfectHits, 3);
    assert.equal(state.saved, 1); assert.equal(state.score, type === 'gold' ? 6 : 4);
    assert.equal(state.combo, 1); assert.equal(state.maxCombo, 1);
    assert.equal(state.bounces, 3); assert.equal(state.perfectBounces, 3);
    assert.equal(c.y, 328); assert.equal(c.preview, null); assert.deepEqual(c.contacts, []);
    const points = state.effects.find(e => e.kind === (type === 'gold' ? 'gold' : 'save')).points;
    assert.equal(points, state.score);
    advance(state, 0.2); assert.equal(state.saved, 1); assert.equal(state.score, points);
    state._nextClusterTime = Infinity; advance(state, 3); assert.ok(!state.chickens.includes(c));
  });
}

test('a miss after two perfect bounces pays no rescue points and resets the streak', () => {
  const state = running(); state.combo = 5; state.maxCombo = 5;
  state.chickens.push(contactBird(710, STEP / 2, { bounces: 2, perfectHits: 2 }));
  advance(state, STEP);
  assert.equal(state.score, 0); assert.equal(state.saved, 0); assert.equal(state.combo, 0); assert.equal(state.maxCombo, 5);
});

for (const combo of [9, 10, 19, 20, 29]) {
  test(`scoring and celebration at streak ${combo + 1}`, () => {
    const state = running(); state.combo = combo; state.maxCombo = combo;
    state.chickens.push(landingBird({ perfectHits: 3 }));
    const sounds = advance(state, STEP);
    assert.equal(state.combo, combo + 1); assert.equal(state.maxCombo, combo + 1);
    assert.equal(state.score, 4 * Math.min(3, 1 + Math.floor(combo / 10)));
    assert.equal(sounds[0], combo === 10 || combo === 20 ? 'combo' : 'saved');
  });
}

test('gold celebration wins over multiplier upgrade; fewer than three bounces cannot land', () => {
  const state = running(); state.combo = 10;
  state.chickens.push(landingBird({ type: 'gold', perfectHits: 3 }));
  assert.equal(advance(state, STEP)[0], 'gold-save'); assert.equal(state.score, 12);
  const other = running(); other.chickens.push(landingBird({ bounces: 2 }));
  advance(other, STEP); assert.equal(other.saved, 0); assert.equal(other.chickens[0].phase, 'flying');
});

test('preview is model-owned, reusable, and follows the real next contact', () => {
  const state = running(); const c = bird(); state.chickens.push(c);
  advance(state, STEP); assert.ok(c.preview); assert.equal(c.preview.bounce, 1);
  const preview = c.preview;
  const expectedX = c.x + c.vx * preview.seconds; close(preview.x, expectedX);
  state.turtle.x = preview.x; advance(state, STEP);
  assert.equal(c.preview, preview); assert.equal(c.preview.alignment, 'perfect');
  state.turtle.x = preview.x - 60; advance(state, STEP); assert.equal(c.preview.alignment, 'hit');
  state.turtle.x = 750; advance(state, STEP); assert.equal(c.preview.alignment, 'miss');
  c.vy = -400; advance(state, STEP); assert.equal(c.preview, null);
  c.vy = 200; c.bounces = 3; advance(state, STEP); assert.equal(c.preview, null);
});

test('preview is absent for remote future or party-side shell intersections', () => {
  const state = running(); state.chickens.push(bird({ y: -1000, vy: 1 }), bird({ x: 900 }));
  advance(state, STEP);
  assert.equal(state.chickens[0].preview, null); assert.equal(state.chickens[1].preview, null);
});

test('reachable interval scheduler rejects clashes and accepts overlaps or sufficient travel', () => {
  const state = running(); state.chickens.push(bird({ contacts: [{ time: 0.2, x: 300, bounce: 1 }] }));
  assert.equal(canScheduleContacts(state, [{ time: 0.21, x: 710, bounce: 1 }]), false);
  assert.equal(canScheduleContacts(state, [{ time: 0.2, x: 330, bounce: 1 }]), true);
  assert.equal(canScheduleContacts(state, [{ time: 0.5, x: 710, bounce: 1 }]), true);
  assert.equal(canScheduleContacts(state, [{ time: 0.5, x: 1000, bounce: 1 }]), false);
  assert.equal(canScheduleContacts(state, [{ time: 0.5, x: 100, bounce: 1 }]), false);
  state.chickens[0].bounces = 1;
  assert.equal(canScheduleContacts(state, [{ time: 0.21, x: 710, bounce: 1 }]), false, 'current turtle cannot reach that contact yet');
  state.turtle.x = 710;
  assert.equal(canScheduleContacts(state, [{ time: 0.21, x: 710, bounce: 1 }]), true);
});

test('scheduler sorts candidates and carries intervals rather than picking arbitrary centers', () => {
  const state = running();
  assert.equal(canScheduleContacts(state, [{ time: 0.5, x: 710 }, { time: 0.2, x: 300 }]), true);
  assert.equal(canScheduleContacts(state, [{ time: 0.2, x: 400 }, { time: 0.2, x: 500 }]), true, 'reachable centers overlap despite differing targets');
  assert.equal(canScheduleContacts(state, [{ time: 0.2, x: 400 }, { time: 0.2, x: 620 }]), false);
  assert.equal(canScheduleContacts(state, []), true);
});

test('actual conflicting flock is postponed by .10 and retains unmodified physics', () => {
  const state = running(); state.saved = 3; state.wave = 2; state._released = 1; state._nextClusterTime = 0;
  const firstFlight = (240 + Math.sqrt(240 ** 2 + 2 * 780 * 295)) / 780;
  const firstContact = 110 / 75 + firstFlight;
  state.chickens.push(bird({ phase: 'queued', spawnTime: Infinity, x: 50, y: 183,
    contacts: [{ time: firstContact + 0.01, x: 710, bounce: 1 }] }));
  advance(state, STEP); assert.equal(state.chickens.length, 1); close(state._nextClusterTime, 0.1);
  assert.equal(state._released, 1); assert.equal(state._clusterIndex, 0);
  state.chickens.length = 0; advance(state, 0.1);
  assert.equal(state.chickens.length, 1);
  const c = state.chickens[0]; assert.equal(c.x, 50 + 75 * STEP); assert.equal(c.type, 'normal');
  close(c.contacts[1].time - c.contacts[0].time, 1.8); close(c.contacts[1].x - c.contacts[0].x, 205);
});

test('a two-bird candidate waits when 11 active birds occupy the cap, then uses freed slots', () => {
  const state = running(); state.saved = 3; state.wave = 2; state._released = 11; state._clusterIndex = 1; state._nextClusterTime = 0;
  for (let i = 0; i < 11; i++) state.chickens.push(bird({ phase: 'queued', spawnTime: Infinity, contacts: [] }));
  advance(state, STEP); assert.equal(state.chickens.length, 11); close(state._nextClusterTime, 0.1);
  state.chickens.pop(); advance(state, 0.1);
  assert.equal(state.chickens.filter(c => c.phase === 'queued' || c.phase === 'flying').length, 12);
  close(state.chickens[11].spawnTime - state.chickens[10].spawnTime, 0.18);
  assert.equal(state.chickens[11].x, 50);
});

for (const [saved, wave, sizes, interval] of [[0, 1, [1], 4.1], [3, 2, [1, 2], 2.8],
  [10, 3, [2, 3], 2.2], [25, 4, [2, 3, 4], 1.7], [50, 5, [3, 4], 1.35]]) {
  test(`saved threshold ${saved} changes actual wave ${wave} flock sizes and interval`, () => {
    const state = running(); state.saved = saved; state._nextClusterTime = 0;
    for (let index = 0; index < sizes.length * 2; index++) {
      state.chickens.length = 0;
      const now = state.time; state._nextClusterTime = now;
      advance(state, STEP);
      assert.equal(state.wave, wave); assert.equal(state.chickens.length, sizes[index % sizes.length]);
      close(state._nextClusterTime - now, interval);
      for (let i = 1; i < state.chickens.length; i++) close(state.chickens[i].spawnTime - state.chickens[i - 1].spawnTime, 0.18);
    }
  });
}

test('wave follows saved count, never bonus score; every eighth bird from wave two is gold', () => {
  const state = running(); state.score = 500; state._nextClusterTime = 0;
  advance(state, STEP); assert.equal(state.wave, 1); assert.equal(state.chickens[0].type, 'normal');
  state.saved = 3; state.chickens.length = 0; state._released = 7; state._clusterIndex = 0; state._nextClusterTime = state.time;
  const sounds = advance(state, STEP); assert.equal(state.wave, 2); assert.ok(sounds.includes('wave'));
  assert.equal(state.chickens[0].id, 8); assert.equal(state.chickens[0].type, 'gold');
  state.chickens.length = 0; state._nextClusterTime = state.time;
  advance(state, STEP); assert.ok(state.chickens.every(c => c.type === 'normal'));
});

test('newcomer gate keeps the first bird alone even after the nominal interval', () => {
  const state = createGameState(); beginRound(state, 'arcade'); advance(state, 3);
  for (let i = 0; i < 600; i++) {
    const targetX = state.chickens[0].contacts[0]?.x ?? state.turtle.x;
    stepGame(state, STEP, { direction: 0, targetX });
  }
  // Two contacts are complete and the nominal 4.1-second interval has elapsed.
  assert.equal(state.saved, 0); assert.equal(state._released, 1);
  assert.equal(state.chickens.filter(c => c.phase !== 'landed').length, 1);
});

test('third miss ends once, clears planned birds, preserves three float guests, and resets cleanly', () => {
  const state = running(); const sounds = [];
  for (let i = 0; i < 3; i++) {
    state.chickens.push(contactBird(710));
    if (i === 2) state.chickens.push(bird({ phase: 'queued', spawnTime: 20, contacts: [{ time: 22, x: 300, bounce: 1 }] }));
    advance(state, STEP, idle, sounds);
  }
  assert.equal(state.mode, 'over'); assert.equal(state.misses, 3); assert.equal(state.lost.length, 3);
  assert.deepEqual(state.chickens, []); assert.equal(sounds.filter(s => s === 'over').length, 1);
  const time = state.time; advance(state, 1, idle, sounds); assert.equal(state.time, time);
  assert.equal(state.effects.length, 0); assert.equal(sounds.filter(s => s === 'splash').length, 3);
  beginRound(state, 'arcade'); assert.equal(state.misses, 0); assert.equal(state.combo, 0);
  assert.deepEqual(state.effects, []); assert.deepEqual(state.lost, []);
});

for (const mode of ['countdown', 'running', 'practice']) {
  test(`pause freezes ${mode} positions, countdown, effects, and reservations`, () => {
    const state = running(mode === 'practice' ? 'practice' : 'arcade');
    state.mode = mode; state.countdownRemaining = 1.75;
    state.chickens.push(bird({ bounces: 2, contacts: [{ time: 2, x: 710, bounce: 3 }] }));
    state.effects.push({ kind: 'perfect', age: 0.2, duration: 0.9 });
    setPaused(state, true); const snapshot = structuredClone(state);
    advance(state, 5); assert.deepEqual(state, snapshot);
    setPaused(state, false); assert.equal(state.mode, mode);
    advance(state, STEP);
    if (mode === 'countdown') close(state.countdownRemaining, 1.75 - STEP);
    else { close(state.time, STEP); close(state.chickens[0].contacts[0].time, 2); assert.notEqual(state.chickens[0].y, snapshot.chickens[0].y); }
  });
}

test('practice repeats saves and misses after one second without arcade accounting', () => {
  const state = createGameState(); beginRound(state, 'practice'); advance(state, 3);
  assert.equal(state.mode, 'practice'); assert.equal(state.chickens.length, 1);
  autoSave(state); assert.equal(state.feedback, 'BRA! TRE STUDSAR.');
  assert.equal(state.score, 0); assert.equal(state.saved, 0); assert.equal(state.combo, 0); assert.equal(state.maxCombo, 0);
  advance(state, 0.9); assert.equal(state.chickens.filter(c => c.phase === 'queued' || c.phase === 'flying').length, 0);
  advance(state, 0.2); assert.equal(state.chickens.filter(c => c.phase === 'queued' || c.phase === 'flying').length, 1);
  assert.equal(state.chickens.find(c => c.phase === 'queued').x < 120, true);
  advance(state, 3, { direction: 0, targetX: 750 });
  assert.match(state.feedback, /FÖRSÖK IGEN/); assert.equal(state.misses, 0); assert.equal(state.score, 0);
  for (let n = 0; n < 5; n++) advance(state, 4, { direction: 0, targetX: 750 });
  assert.equal(state.mode, 'practice'); assert.equal(state.misses, 0); assert.equal(state.combo, 0);
  assert.ok(state.lost.length <= 1); assert.ok(state.chickens.filter(c => c.phase === 'queued' || c.phase === 'flying').length <= 1);
  assert.ok(state.chickens.every(c => c.type === 'normal'));
  beginRound(state, 'arcade'); assert.equal(state.mode, 'countdown'); assert.deepEqual(state.chickens, []);
});

test('effect lifetime is explicit and expires at the renderer duration', () => {
  const state = running(); state.chickens.push(contactBird(300)); advance(state, STEP);
  assert.equal(state.effects[0].kind, 'perfect'); assert.equal(state.effects[0].duration, 0.9);
  advance(state, 0.9); assert.equal(state.effects.length, 0);
  state.chickens.length = 0; state.chickens.push(contactBird(710)); advance(state, STEP);
  assert.equal(state.effects[0].duration, 0.6); advance(state, 0.6); assert.equal(state.effects.length, 0);
});

for (const [saved, wave, interval, secondSize] of [[2, 1, 4.1, 1], [9, 2, 2.8, 2],
  [24, 3, 2.2, 3], [49, 4, 1.7, 3], [80, 5, 1.35, 4]]) {
  test(`wave ${wave} actually waits ${interval}s between flock releases at ${saved} saved`, () => {
    const state = running(); state.saved = saved; state._nextClusterTime = 0;
    advance(state, STEP);
    assert.equal(state.wave, wave);
    const released = state._released;
    state.chickens.length = 0; // Isolate the rhythm from contact-based postponement.
    advance(state, interval - STEP);
    assert.equal(state._released, released, 'no early release');
    advance(state, STEP);
    assert.equal(state._released - released, secondSize);
    close(state.chickens[0].spawnTime, interval);
    assert.ok(state.chickens.every(c => c.x < 120 && c.y === RULES.cliffY));
  });
}

test('miss float positions are clamped, without moving the splash from actual impact', () => {
  for (const [hitX, floatX] of [[180, 205], [900, 840]]) {
    const state = running(); state.turtle.x = 500;
    state.chickens.push(contactBird(hitX)); advance(state, STEP);
    assert.equal(state.lost[0].x, floatX); close(state.effects[0].x, hitX);
  }
});

test('pause between actual second and third contact resumes the same complete trajectory', () => {
  const state = createGameState(); beginRound(state, 'arcade'); advance(state, 3);
  const c = state.chickens[0];
  while (c.bounces < 2) stepGame(state, STEP, { direction: 0, targetX: c.contacts[0].x });
  const remaining = c.contacts[0].time - state.time;
  setPaused(state, true);
  const position = { x: c.x, y: c.y, vy: c.vy, time: state.time };
  advance(state, 10);
  assert.deepEqual({ x: c.x, y: c.y, vy: c.vy, time: state.time }, position);
  close(c.contacts[0].time - state.time, remaining);
  setPaused(state, false); autoSave(state);
  assert.equal(state.saved, 1); assert.equal(state.score, 4); assert.equal(state.misses, 0);
});

test('preview, hit physics, and scoring are unchanged by reduced motion', () => {
  const a = running(); const b = running(); b.reducedMotion = true;
  a.chickens.push(contactBird(300)); b.chickens.push(contactBird(300));
  advance(a, 0.5); advance(b, 0.5);
  assert.deepEqual(a.chickens, b.chickens);
  assert.equal(a.bounces, b.bounces); assert.equal(a.score, b.score);
});
