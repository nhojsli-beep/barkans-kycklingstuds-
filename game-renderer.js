import { W, H, RULES } from './game-core.js?v=7';

const WATER = 485;
const TAU = Math.PI * 2;

// The portrait's warm ink, coral and cream, extended into a lakeside palette.
const COLOR = {
  ink: '#303c2d', moss: '#536445', mossDark: '#3e5038', leaf: '#82915b',
  lime: '#c8dd79', limeLight: '#e0eba1', cream: '#fff6d9', paper: '#fff6d9',
  sky: '#dce9df', skyLow: '#f6edcc', cloudShade: '#d5dfcf',
  hillFar: '#b7c6a3', hill: '#98ad83', hillNear: '#809574',
  stone: '#d3b586', stoneLight: '#e8cf9f', stoneShade: '#b5946e',
  coral: '#f16a51', red: '#b74c40', redDark: '#843f37',
  water: '#88b9ab', waterDeep: '#4e8f87', waterDark: '#437c76', foam: '#dcefd8',
  yellow: '#f8d965', yellowLight: '#fff0a1', yellowShade: '#dcae40',
  orange: '#e99143', pink: '#e9a38a', shell: '#687d43', shellDark: '#425934',
  gold: '#f8d965', goldLight: '#fff59d', goldDark: '#c68400',
};
const PATH_CACHE = new Map();

const BODY = new Path2D('M-16 0 Q-22-4-22-11 Q-15-10-11-7 C-10-17 1-21 9-17 C20-17 23-7 17 3 C13 14-10 17-16 0Z');
const WING = new Path2D('M2-2 C-4-10-17-9-13-1 Q-10 8 2-2Z');
const SHELL = new Path2D('M-85 36 C-77 10-43 0 0 0 C43 0 77 10 85 36 Q51 49 0 46 Q-51 49-85 36Z');
const SHELL_PATCHES = [
  new Path2D('M-27 6 Q0-1 27 6 L35 24 21 37-21 37-35 24Z'),
  new Path2D('M-35 9 L-41 25-64 31-73 26 Q-59 13-35 9Z'),
  new Path2D('M35 9 L41 25 64 31 73 26 Q59 13 35 9Z'),
  new Path2D('M-37 30 L-25 42-55 40-72 35Z'),
  new Path2D('M37 30 L25 42 55 40 72 35Z'),
];
const FONT = '"JetBrainsMono Nerd Font", "JetBrains Mono", ui-monospace, monospace';
const FLAGS = [COLOR.coral, COLOR.lime, COLOR.paper, COLOR.coral, COLOR.lime];
const HOMES = [[360, 372, 24], [398, 369, 29], [438, 377, 22], [478, 374, 27], [528, 380, 20]];
const PAD_RIBS = [-84, -63, -49, 49, 63, 84];
const READY_CHICKENS = [130, 95, 62].map((x, age) => Object.freeze({
  x, y: RULES.cliffY, age, rotation: 0, impact: 0, bounces: 0, phase: 'queued', type: 'normal',
}));

function ellipse(ctx, x, y, rx, ry, fill, stroke, width = 2) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
}

function shape(ctx, path, fill, stroke, width = 2) {
  const geometry = typeof path === 'string'
    ? (PATH_CACHE.get(path) || PATH_CACHE.set(path, new Path2D(path)).get(path))
    : path;
  if (fill) { ctx.fillStyle = fill; ctx.fill(geometry); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(geometry); }
}

function line(ctx, x1, y1, x2, y2, color, width = 2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

function label(ctx, text, x, y, size = 10, color = COLOR.mossDark) {
  ctx.fillStyle = color;
  ctx.font = `700 ${size}px ${FONT}`;
  ctx.fillText(text, x, y);
}

function cloud(ctx, x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  shape(ctx, 'M-66 17 C-87 14-85-10-65-15 C-63-47-17-49-4-25 C18-39 41-24 43-7 C75-11 91 21 59 27 L-48 29Z', COLOR.cream);
  shape(ctx, 'M-65 18 Q-15 31 58 18 Q69 29 47 30 L-51 31Z', COLOR.cloudShade);
  ctx.restore();
}

function pine(ctx, x, y, height, color) {
  line(ctx, x, y, x, y - height * 0.72, COLOR.moss, 3);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - height);
  ctx.lineTo(x + height * 0.22, y - height * 0.49);
  ctx.lineTo(x + height * 0.11, y - height * 0.51);
  ctx.lineTo(x + height * 0.3, y - height * 0.14);
  ctx.quadraticCurveTo(x, y - height * 0.05, x - height * 0.3, y - height * 0.14);
  ctx.lineTo(x - height * 0.11, y - height * 0.51);
  ctx.lineTo(x - height * 0.22, y - height * 0.49);
  ctx.closePath();
  ctx.fill();
}

function birch(ctx, x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  shape(ctx, 'M-5 0 L-3-116 4-116 6 0Z', COLOR.cream, COLOR.moss, 2);
  line(ctx, 0, -67, -26, -99, COLOR.moss, 3);
  line(ctx, 0, -82, 21, -112, COLOR.moss, 3);
  for (let i = 0; i < 6; i++) line(ctx, -3, -12 - i * 15, i % 2 ? 2 : 0, -14 - i * 15, COLOR.moss, 2);
  ellipse(ctx, -22, -112, 28, 34, COLOR.leaf);
  ellipse(ctx, 18, -126, 29, 34, COLOR.leaf);
  ellipse(ctx, -3, -141, 28, 31, COLOR.lime);
  ellipse(ctx, -22, -122, 18, 19, COLOR.lime);
  ellipse(ctx, 23, -137, 18, 18, COLOR.limeLight);
  for (let i = 0; i < 11; i++) {
    const xLeaf = Math.sin(i * 3.7) * 32;
    const yLeaf = -110 - (i * 13 % 48);
    line(ctx, xLeaf, yLeaf, xLeaf + 3, yLeaf - 5, COLOR.moss, 1.5);
  }
  ctx.restore();
}


function cliffs(ctx) {
  shape(ctx, 'M0 194 L165 194 Q174 200 170 210 L165 240 169 294 161 332 170 386 163 421 170 472 158 501 166 625 0 625Z', COLOR.stone, COLOR.ink, 3);
  shape(ctx, 'M0 220 L112 218 134 252 113 297 145 336 125 369 143 420 118 480 140 540 124 625 0 625Z', COLOR.stoneLight);
  shape(ctx, 'M138 224 L161 219 155 274 162 300 141 290Z M142 376 L162 387 153 427 164 468 144 486 137 454Z M144 526 L159 532 162 598 145 585Z', COLOR.stoneShade);
  shape(ctx, 'M870 357 L1000 357 1000 625 877 625 885 575 875 520 881 469 871 422Z', COLOR.stone, COLOR.ink, 3);
  shape(ctx, 'M917 373 L1000 373 1000 625 920 625 939 579 916 547 932 510 916 475 932 417Z', COLOR.stoneLight);
  shape(ctx, 'M878 393 L903 381 898 428 911 452 888 479 888 447Z M890 508 L912 524 899 562 904 602 882 622 892 572Z', COLOR.stoneShade);
  for (let i = 0; i < 23; i++) {
    const left = i % 2 === 0;
    const x = left ? 16 + (i * 37 % 112) : 900 + (i * 31 % 90);
    const y = left ? 257 + (i * 47 % 350) : 409 + (i * 41 % 210);
    line(ctx, x, y, x + 8 + i % 12, y - 2, COLOR.stoneShade, 1.5);
  }
  shape(ctx, 'M0 190 Q45 185 87 191 Q126 185 163 191 Q176 190 174 200 Q170 208 159 205 L0 205Z', COLOR.leaf, COLOR.ink, 3);
  shape(ctx, 'M0 189 Q72 187 108 190 L164 190 Q174 191 171 198 L0 198Z', COLOR.lime);
  shape(ctx, 'M880 345 Q924 342 961 348 L1000 346 1000 362 882 362 Q867 363 868 353 Q870 346 880 345Z', COLOR.leaf, COLOR.ink, 3);
  shape(ctx, 'M883 345 L1000 346 1000 353 876 354 Q870 352 883 345Z', COLOR.lime);
  // Root threads keep the cliffs hand-drawn, without busying the flight path.
  shape(ctx, 'M151 206 Q142 225 151 239 M145 221 L132 228 M892 362 Q901 379 894 395 M899 379 L910 383', null, COLOR.moss, 2);
  label(ctx, '40-ÅRSKALAS', 891, 391, 10);
}

function party(ctx, portrait) {
  birch(ctx, 986, 347, 0.72);
  line(ctx, 928, 235, 928, 345, COLOR.mossDark, 3);
  line(ctx, 995, 223, 995, 349, COLOR.mossDark, 3);
  shape(ctx, 'M928 240 Q961 253 995 228', null, COLOR.mossDark, 1.5);
  for (let i = 0; i < FLAGS.length; i++) {
    const x = 933 + i * 12;
    const y = 242 + Math.sin(i * 0.75) * 7 - i * 2;
    ctx.fillStyle = FLAGS[i];
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 9, y); ctx.lineTo(x + 5, y + 12); ctx.closePath(); ctx.fill();
  }
  if (portrait) ctx.drawImage(portrait, 928, 255, 72, 80);
  // Öppen landningsbana på gräset (x=870-925), bordet och tårtan flyttade till x=928-974:
  line(ctx, 936, 330, 936, 347, COLOR.mossDark, 3);
  line(ctx, 966, 330, 966, 347, COLOR.mossDark, 3);
  shape(ctx, 'M928 326 L974 326 974 332 928 332Z', COLOR.cream, COLOR.mossDark, 2);
  shape(ctx, 'M933 309 L968 309 968 325 933 325Z', COLOR.pink, COLOR.ink, 1.5);
  shape(ctx, 'M933 310 Q938 302 944 309 Q950 303 956 309 Q962 303 968 309 L968 315 Q963 319 959 314 Q954 320 949 314 Q943 320 938 314 L933 316Z', COLOR.cream);
  ellipse(ctx, 940, 306, 3, 4, COLOR.coral);
  ellipse(ctx, 962, 306, 3, 4, COLOR.coral);
  label(ctx, '40', 944, 303, 12, COLOR.coral);
  ellipse(ctx, 948, 291, 1.5, 3, COLOR.yellow);
  ellipse(ctx, 956, 291, 1.5, 3, COLOR.yellow);
}

function scenery(ctx, portrait) {
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const sky = ctx.createLinearGradient(0, 0, 0, WATER);
  sky.addColorStop(0, COLOR.sky); sky.addColorStop(1, COLOR.skyLow);
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  ellipse(ctx, 789, 91, 41, 41, COLOR.cream);
  ellipse(ctx, 789, 91, 32, 32, COLOR.yellowLight);
  cloud(ctx, 283, 88, 0.85);
  cloud(ctx, 646, 48, 0.5);
  cloud(ctx, 917, 108, 0.65);
  shape(ctx, 'M0 335 Q110 260 239 326 Q366 246 507 329 Q651 270 787 331 Q911 274 1000 318 L1000 495 0 495Z', COLOR.hillFar);
  shape(ctx, 'M0 381 Q171 322 281 375 Q452 312 570 369 Q694 325 806 365 Q925 332 1000 379 L1000 495 0 495Z', COLOR.hill);
  // Small silhouettes anchor the lake in Småland, far behind the action.
  for (let i = 0; i < 28; i++) pine(ctx, 173 + i * 27, 405 + Math.sin(i * 1.7) * 8, 24 + i * 19 % 31, i % 3 ? COLOR.hillNear : COLOR.hill);
  ctx.globalAlpha = 0.72;
  for (const [x, y, width] of HOMES) {
    ctx.fillStyle = COLOR.paper; ctx.fillRect(x, y, width, 19);
    ctx.beginPath(); ctx.moveTo(x - 3, y); ctx.lineTo(x + width / 2, y - 12); ctx.lineTo(x + width + 3, y); ctx.closePath(); ctx.fillStyle = COLOR.red; ctx.fill();
    ctx.fillStyle = COLOR.hillNear; ctx.fillRect(x + 5, y + 5, 4, 6); ctx.fillRect(x + width - 9, y + 5, 4, 6);
  }
  shape(ctx, 'M469 374 L469 342 475 329 481 342 481 374Z', COLOR.paper);
  shape(ctx, 'M467 343 L475 325 483 343Z', COLOR.moss);
  ctx.globalAlpha = 1;
  shape(ctx, 'M0 430 Q185 404 324 433 Q426 413 547 437 Q703 407 835 433 Q933 411 1000 434 L1000 497 0 497Z', COLOR.hillNear);
  shape(ctx, 'M0 464 Q157 447 338 465 Q522 449 681 466 Q865 451 1000 463 L1000 505 0 505Z', COLOR.hill);
  const lake = ctx.createLinearGradient(0, WATER, 0, H);
  lake.addColorStop(0, COLOR.water); lake.addColorStop(1, COLOR.waterDeep);
  ctx.fillStyle = lake; ctx.fillRect(0, WATER, W, H - WATER);
  // Broken reflections, painted once rather than recalculated each frame.
  ctx.globalAlpha = 0.23;
  for (let i = 0; i < 35; i++) {
    const x = 190 + i * 71 % 660;
    const y = 502 + i * 23 % 120;
    line(ctx, x, y, x + 12 + i * 11 % 46, y, i % 3 ? COLOR.foam : COLOR.waterDark, 2);
  }
  ctx.globalAlpha = 1;
  cliffs(ctx);
  // Öppen klipplatå för fri sikt på gående kycklingar
  party(ctx, portrait);
  for (let i = 0; i < 11; i++) {
    const x = i < 6 ? 124 + i * 8 : 944 + (i - 6) * 12;
    const y = i < 6 ? 190 : 345;
    line(ctx, x, y, x - 2, y - 7, COLOR.moss, 1.5);
    ellipse(ctx, x - 2, y - 8, 2, 2, i % 2 ? COLOR.cream : COLOR.coral);
  }
  ctx.save(); ctx.translate(803, 431); ctx.rotate(-0.035);
  label(ctx, 'SOMMEN', -33, 0, 9, COLOR.mossDark);
  line(ctx, -22, 7, 24, 7, COLOR.mossDark, 1);
  ctx.restore();
}

function water(ctx, time) {
  ctx.save();
  ctx.beginPath(); ctx.rect(174, WATER - 7, 692, H - WATER + 7); ctx.clip();
  ctx.beginPath(); ctx.moveTo(170, WATER);
  for (let x = 170; x <= 880; x += 8) {
    ctx.lineTo(x, WATER + Math.sin(x * 0.032 + time * 1.7) * 3 + Math.sin(x * 0.073 - time) * 1.5);
  }
  ctx.strokeStyle = COLOR.foam; ctx.lineWidth = 3; ctx.stroke();
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 13; i++) {
    const x = 195 + i * 73 % 633 + Math.sin(time * 0.6 + i) * 6;
    const y = 508 + i * 29 % 111;
    line(ctx, x, y, x + 14 + i % 3 * 8, y, COLOR.foam, 1.5);
  }
  ctx.restore();
}


function landingIndicator(ctx, bird, state) {
  const preview = bird.preview;
  if (!preview) return;
  const urgent = preview.seconds < 0.45;
  const width = urgent ? 3.5 : 2;
  ctx.save();
  ctx.translate(preview.x, 483);
  if (preview.alignment === 'miss') {
    const direction = preview.x < state.x ? -1 : 1;
    line(ctx, -direction * 8, 0, direction * 8, 0, COLOR.paper, width + 3);
    line(ctx, direction * 8, 0, direction * 2, -6, COLOR.paper, width + 3);
    line(ctx, direction * 8, 0, direction * 2, 6, COLOR.paper, width + 3);
    line(ctx, -direction * 8, 0, direction * 8, 0, COLOR.coral, width);
    line(ctx, direction * 8, 0, direction * 2, -6, COLOR.coral, width);
    line(ctx, direction * 8, 0, direction * 2, 6, COLOR.coral, width);
  } else {
    const perfect = preview.alignment === 'perfect';
    ellipse(ctx, 0, 0, 8, 8, COLOR.paper, perfect ? COLOR.coral : COLOR.moss, width);
    if (perfect) ellipse(ctx, 0, 0, 4, 4, null, COLOR.coral, 1.5);
  }
  ctx.restore();
}

function chickenBody(ctx, gold, flap, flying, reducedMotion) {
  const bodyColor = gold ? COLOR.gold : COLOR.yellow;
  const shadeColor = gold ? COLOR.goldDark : COLOR.yellowShade;
  const lightColor = gold ? COLOR.goldLight : COLOR.yellowLight;
  shape(ctx, BODY, bodyColor, COLOR.ink, 2);
  shape(ctx, 'M-13 4 Q-3 17 13 6 Q7 15-3 13 Q-10 12-13 4Z', shadeColor);
  ellipse(ctx, 6, -10, 7, 6, lightColor);
  shape(ctx, 'M5-18 Q0-25 7-22 L9-18 M10-18 Q10-24 15-23 L14-18', bodyColor, COLOR.ink, 1.5);
  shape(ctx, 'M17-11 L25-7 17-4Z', COLOR.orange, COLOR.ink, 1.5);
  ellipse(ctx, 11, -10, 2.2, 3, COLOR.ink);
  ellipse(ctx, 11.7, -11, 0.7, 0.9, COLOR.cream);
  ellipse(ctx, 12, -3, 3.2, 2, COLOR.pink);
  if (gold) {
    shape(ctx, 'M-1-21 L-4-31 3-27 7-34 11-27 18-31 15-21Z', COLOR.gold, COLOR.ink, 1.5);
    line(ctx, 1, -23, 13, -23, COLOR.goldDark, 2);
    ellipse(ctx, 7, -27, 1.8, 1.8, COLOR.coral);
  }
  ctx.save();
  ctx.translate(-4, -1);
  ctx.rotate(reducedMotion ? 0 : flying ? -0.55 + flap * 0.75 : flap * 0.12);
  shape(ctx, WING, shadeColor, COLOR.ink, 1.5);
  line(ctx, -9, -2, -4, 0, lightColor, 1.5);
  ctx.restore();
}

function chicken(ctx, bird, time, reducedMotion) {
  const flying = bird.phase === 'flying';
  const walk = reducedMotion || flying ? 0 : Math.sin(bird.age * 13);
  const flap = reducedMotion ? 0 : Math.sin(time * (flying ? 24 : 8) + bird.age * 2);
  const squash = reducedMotion ? 0 : Math.min(1, Math.max(0, bird.impact || 0)) * 0.15;
  ctx.save();
  ctx.translate(bird.x, bird.y);
  if (!flying) ellipse(ctx, 0, RULES.feet + 1, 14, 2, COLOR.stoneShade);

  // Feet stay in world space: neither body rotation nor squash moves contact.
  ctx.lineCap = 'butt';
  const feet = RULES.feet - 1.25;
  line(ctx, -5, 8, -6 + walk * 3, feet, COLOR.ink, 3.5);
  line(ctx, 5, 8, 7 - walk * 3, feet, COLOR.ink, 3.5);
  line(ctx, -9 + walk * 3, feet, -2 + walk * 3, feet, COLOR.orange, 2.5);
  line(ctx, 4 - walk * 3, feet, 11 - walk * 3, feet, COLOR.orange, 2.5);
  ctx.lineCap = 'round';

  ctx.save();
  ctx.translate(0, flying ? 0 : -Math.abs(walk) * 1.3);
  ctx.rotate(reducedMotion ? 0 : bird.rotation || 0);
  ctx.scale(1 + squash * 0.5, 1 - squash);
  chickenBody(ctx, bird.type === 'gold', flap, flying, reducedMotion);
  ctx.restore();

  if (flying) {
    for (let i = 0; i < RULES.requiredBounces; i++) {
      ellipse(ctx, (i - 1) * 10, -43, 3, 3,
        i < bird.bounces ? COLOR.coral : COLOR.paper, COLOR.ink, 1.25);
    }
  }
  ctx.restore();
}

function turtle(ctx, state, time, reducedMotion) {
  const impact = reducedMotion ? 0 : Math.max(0, Math.min(1, state.impact || 0));
  const facing = state.facing < 0 ? -1 : 1;
  const paddle = reducedMotion ? 0 : Math.sin(time * 5);
  ctx.save();
  ctx.translate(state.x, RULES.shellY);
  ellipse(ctx, 0, 65, 100, 9, COLOR.waterDark);
  ctx.globalAlpha = 0.65;
  ellipse(ctx, 0, 65, 110 + (reducedMotion ? 0 : Math.sin(time * 3) * 4), 12, null, COLOR.foam, 1.5);
  ctx.globalAlpha = 1;

  // All squash is below the fixed, horizontal contact surface.
  ctx.save();
  ctx.translate(0, 12);
  ctx.scale(1, 1 - impact * 0.18);
  ctx.save(); ctx.scale(facing, 1);
  ctx.save(); ctx.translate(-57, 42); ctx.rotate(reducedMotion ? 0 : -0.3 + paddle * 0.18);
  ellipse(ctx, 0, 13, 12, 19, COLOR.lime, COLOR.ink, 2);
  line(ctx, -3, 22, -3, 28, COLOR.leaf, 1.5);
  ctx.restore();
  ctx.save(); ctx.translate(57, 42); ctx.rotate(reducedMotion ? 0 : 0.3 - paddle * 0.18);
  ellipse(ctx, 0, 13, 12, 19, COLOR.lime, COLOR.ink, 2);
  line(ctx, 3, 22, 3, 28, COLOR.leaf, 1.5);
  ctx.restore();
  shape(ctx, 'M-88 34 Q-113 36-102 43 L-86 45Z', COLOR.lime, COLOR.ink, 2);
  shape(ctx, 'M81 27 Q96 34 102 21 C111 7 135 17 131 34 Q127 49 109 43 L91 47Z', COLOR.lime, COLOR.ink, 2.5);
  ellipse(ctx, 118, 22, 8, 5, COLOR.limeLight);
  ellipse(ctx, 122, 24, 2.4, 3, COLOR.ink);
  ellipse(ctx, 123, 23, 0.8, 0.8, COLOR.cream);
  ellipse(ctx, 119, 33, 3.5, 2, COLOR.pink);
  shape(ctx, 'M124 35 Q129 37 132 32', null, COLOR.ink, 1.5);
  ctx.restore();
  ctx.save();
  ctx.scale(1.12, 1);
  shape(ctx, SHELL, COLOR.shell, COLOR.ink, 3);
  shape(ctx, 'M-84 36 Q0 54 84 36 L79 42 Q0 58-79 42Z', COLOR.lime, COLOR.ink, 2);
  for (let i = 0; i < SHELL_PATCHES.length; i++) {
    shape(ctx, SHELL_PATCHES[i], i ? COLOR.leaf : COLOR.lime, COLOR.shellDark, 2);
  }
  ctx.restore();
  ctx.restore();

  // Pad top and brackets share the core's exact collision coordinates.
  const half = RULES.shellHalf;
  const perfect = RULES.perfectHalf;
  ctx.fillStyle = COLOR.paper;
  ctx.fillRect(-half, 0, half * 2, 12);
  ctx.lineCap = 'butt';
  line(ctx, -half, 1.5, half, 1.5, COLOR.ink, 3);
  line(ctx, -half, 12, half, 12, COLOR.ink, 2);
  for (const x of PAD_RIBS) line(ctx, x, 4, x, 9, COLOR.coral, 1.5);
  line(ctx, -half, 0, -half, 15, COLOR.coral, 3);
  line(ctx, -half, 15, -half + 9, 15, COLOR.coral, 3);
  line(ctx, half, 0, half, 15, COLOR.coral, 3);
  line(ctx, half - 9, 15, half, 15, COLOR.coral, 3);
  ellipse(ctx, 0, 6, perfect - 0.75, 5, COLOR.yellowLight, COLOR.ink, 1.5);
  ellipse(ctx, 0, 6, perfect * 0.55, 3.5, COLOR.coral);
  ellipse(ctx, 0, 6, 6, 2, COLOR.paper);
  ctx.restore();
}

function swimmingChick(ctx, lost, index, time, reducedMotion) {
  const x = Math.max(205, Math.min(840, lost.x));
  const y = 581 + index % 2 * 15 + (reducedMotion ? 0 : Math.sin(time * 2 + index * 2) * 2);
  ellipse(ctx, x, y + 7, 25, 5, null, COLOR.foam, 1.5);
  ctx.save();
  ctx.translate(x, y - 10);
  ctx.scale(0.7, 0.7);
  chickenBody(ctx, false, reducedMotion ? 0 : Math.sin(time * 4 + index), false, reducedMotion);
  ctx.restore();
  ellipse(ctx, x, y, 18, 7, COLOR.coral, COLOR.ink, 2);
  ellipse(ctx, x, y - 2, 11, 3.5, COLOR.water, COLOR.redDark, 1.5);
  line(ctx, x - 14, y - 3, x - 10, y + 4, COLOR.paper, 4);
  line(ctx, x + 12, y - 4, x + 9, y + 5, COLOR.paper, 4);
  ellipse(ctx, x, y - 5, 8, 3, COLOR.yellow);
}

function effect(ctx, item, reducedMotion) {
  const progress = Math.min(1, Math.max(0, item.age / item.duration));
  if (progress >= 1) return;
  const travel = reducedMotion ? 0 : progress;
  ctx.save();
  ctx.globalAlpha = Math.min(1, (1 - progress) * 3);
  if (item.kind === 'bounce' || item.kind === 'perfect') {
    const perfect = item.kind === 'perfect';
    ellipse(ctx, item.x, RULES.shellY - 3, 12 + travel * 22, 5 + travel * 6,
      null, perfect ? COLOR.coral : COLOR.paper, 3);
    if (perfect && progress < 0.7) {
      ctx.textAlign = 'center';
      label(ctx, 'PERFEKT', item.x, item.y - 25 - travel * 10, 13, COLOR.ink);
    }
  } else if (item.kind === 'splash') {
    ellipse(ctx, item.x, WATER + 15, 18 + travel * 38, 6 + travel * 7, null, COLOR.foam, 3);
    for (let i = 0; i < 6; i++) {
      const angle = i * Math.PI / 5;
      const x = item.x + Math.cos(angle) * (12 + travel * 37);
      const y = item.y - Math.sin(angle) * (12 + travel * 28) + travel * travel * 18;
      ellipse(ctx, x, y, 2.5, 4, COLOR.foam);
    }
  } else if (item.kind === 'save' || item.kind === 'gold') {
    ctx.textAlign = 'center';
    if (item.points > 0) {
      label(ctx, `+${item.points}`, 900, 287 - travel * 24, 17,
        item.kind === 'gold' ? COLOR.goldDark : COLOR.ink);
    }
    // Small celebration ring stays at the portrait, never on the landing lane.
    for (let i = 0; i < 8; i++) {
      const angle = i * TAU / 8 + (item.seed || 0) * 0.4;
      const radius = 27 + travel * 5;
      ctx.save();
      ctx.translate(963 + Math.cos(angle) * radius, 285 + Math.sin(angle) * (radius + 8));
      if (!reducedMotion) ctx.rotate(angle + progress * 2);
      ctx.fillStyle = i % 3 === 0 ? COLOR.coral : i % 3 === 1 ? COLOR.moss : COLOR.gold;
      ctx.fillRect(-2, -3, 4, 6);
      ctx.restore();
    }
  }
  if (item.message) {
    const wave = item.kind === 'wave';
    const x = wave ? item.x : W / 2;
    const y = wave ? item.y : 111;
    ctx.font = `700 ${wave ? 17 : 15}px ${FONT}`;
    const width = ctx.measureText(item.message).width + 24;
    ctx.fillStyle = COLOR.paper;
    ctx.fillRect(x - width / 2, y - 20, width, 29);
    ctx.textAlign = 'center';
    label(ctx, item.message, x, y, wave ? 17 : 15, COLOR.ink);
  }
  ctx.restore();
}

/** Stateless canvas view; the controller owns time, motion and all game rules. */
export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const background = document.createElement('canvas');
  background.width = background.height = 0;
  const bg = background.getContext('2d');
  const portrait = new Image();
  let portraitReady = false;
  let lastScene = null;
  let disposed = false;
  let pixelWidth = 0;
  let pixelHeight = 0;
  let sceneryDirty = true;

  function resize() {
    if (disposed) return;
    const bounds = canvas.getBoundingClientRect();
    if (bounds.width <= 0) {
      pixelWidth = pixelHeight = 0;
      canvas.width = canvas.height = 0;
      background.width = background.height = 0;
      sceneryDirty = true;
      return;
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(bounds.width * dpr));
    // The world and backing store always retain 8:5, independent of CSS sizing.
    const height = Math.max(1, Math.round(width * H / W));
    if (width === pixelWidth && height === pixelHeight) return;
    pixelWidth = width; pixelHeight = height;
    canvas.width = background.width = width;
    canvas.height = background.height = height;
    sceneryDirty = true;
    if (lastScene) draw(lastScene);
  }

  function draw(scene) {
    if (disposed) return;
    lastScene = scene;
    if (!pixelWidth || !pixelHeight) return;
    if (sceneryDirty) {
      bg.setTransform(pixelWidth / W, 0, 0, pixelHeight / H, 0, 0);
      scenery(bg, portraitReady ? portrait : null);
      sceneryDirty = false;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, pixelWidth, pixelHeight);
    ctx.drawImage(background, 0, 0);
    ctx.setTransform(pixelWidth / W, 0, 0, pixelHeight / H, 0, 0);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const time = scene.reducedMotion ? 0 : scene.time || 0;
    ctx.save();
    if (!scene.reducedMotion && scene.shake > 0) {
      ctx.translate(Math.sin(time * 71) * scene.shake * 2, Math.cos(time * 59) * scene.shake * 1.5);
    }
    water(ctx, time);
    for (let i = 0; i < scene.lost.length && i < 3; i++) {
      swimmingChick(ctx, scene.lost[i], i, time, scene.reducedMotion);
    }
    turtle(ctx, scene.turtle, time, scene.reducedMotion);
    for (const bird of scene.chickens) landingIndicator(ctx, bird, scene.turtle);
    if (scene.mode === 'ready' && !scene.chickens.length) {
      for (const bird of READY_CHICKENS) chicken(ctx, bird, time, scene.reducedMotion);
    }
    for (const bird of scene.chickens) {
      if (bird.phase === 'queued' && bird.x < -25) continue;
      chicken(ctx, bird, time, scene.reducedMotion);
    }
    for (const item of scene.effects) effect(ctx, item, scene.reducedMotion);
    ctx.restore();
  }

  function invalidateScenery() {
    if (disposed) return;
    sceneryDirty = true;
    if (lastScene) draw(lastScene);
  }
  portrait.onload = () => {
    if (disposed) return;
    portraitReady = true;
    invalidateScenery();
  };
  portrait.onerror = () => {
    if (disposed) return;
    portraitReady = false;
    invalidateScenery();
  };
  portrait.src = new URL('./barkan.svg', import.meta.url).href;
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  // Window resize also catches DPR changes when moving between displays.
  window.addEventListener('resize', resize);
  const fonts = document.fonts;
  if (fonts) {
    fonts.addEventListener('loadingdone', invalidateScenery);
    fonts.ready.then(invalidateScenery);
  }
  resize();

  return {
    draw,
    dispose() {
      disposed = true;
      observer.disconnect();
      window.removeEventListener('resize', resize);
      if (fonts) fonts.removeEventListener('loadingdone', invalidateScenery);
      portrait.onload = null;
      portrait.onerror = null;
      portrait.removeAttribute('src');
      lastScene = null;
      background.width = background.height = 0;
    },
  };
}
