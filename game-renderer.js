const W = 1000;
const H = 625;
const WATER = 485;
const SHELL_TOP = 495;
const TAU = Math.PI * 2;

// The portrait's warm ink, coral and cream, extended into a lakeside palette.
const COLOR = {
  ink: '#303c2d', moss: '#536445', mossDark: '#3e5038', leaf: '#82915b',
  lime: '#c8dd79', limeLight: '#e0eba1', cream: '#fff6d9', paper: '#f2ecd5',
  sky: '#dce9df', skyLow: '#f6edcc', cloudShade: '#d5dfcf',
  hillFar: '#b7c6a3', hill: '#98ad83', hillNear: '#809574',
  stone: '#d3b586', stoneLight: '#e8cf9f', stoneShade: '#b5946e',
  coral: '#f16a51', red: '#b74c40', redDark: '#843f37',
  water: '#88b9ab', waterDeep: '#4e8f87', waterDark: '#437c76', foam: '#dcefd8',
  yellow: '#f8d965', yellowLight: '#fff0a1', yellowShade: '#dcae40',
  orange: '#e99143', pink: '#e9a38a', shell: '#687d43', shellDark: '#425934',
  gold: '#ffd54f', goldLight: '#fff59d', goldDark: '#c68400',
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
  ctx.font = `700 ${size}px "Arial", sans-serif`;
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

function barn(ctx) {
  shape(ctx, 'M14 111 L64 69 116 110 116 191 14 191Z', COLOR.red, COLOR.ink, 3);
  shape(ctx, 'M5 111 L64 62 124 111 118 118 64 77 12 119Z', COLOR.mossDark, COLOR.ink, 3);
  shape(ctx, 'M17 119 L111 119 111 129 17 129Z', COLOR.coral);
  for (let x = 24; x < 115; x += 13) line(ctx, x, 128, x, 187, COLOR.redDark, 2);
  shape(ctx, 'M52 192 L52 143 Q66 130 80 143 L80 192Z', COLOR.redDark, COLOR.cream, 4);
  line(ctx, 67, 140, 67, 191, COLOR.cream, 2);
  line(ctx, 54, 149, 78, 185, COLOR.paper, 2);
  ellipse(ctx, 65, 103, 9, 9, COLOR.sky, COLOR.cream, 4);
  line(ctx, 58, 103, 72, 103, COLOR.cream, 2);
  line(ctx, 65, 96, 65, 111, COLOR.cream, 2);
  shape(ctx, 'M18 130 L36 130 36 151 18 151Z', COLOR.sky, COLOR.cream, 3);
  line(ctx, 27, 131, 27, 150, COLOR.cream);
  label(ctx, 'ÄGGSTRA ALLT', 21, 170, 5, COLOR.cream);
  line(ctx, 104, 64, 104, 91, COLOR.ink, 2);
  shape(ctx, 'M104 64 L119 70 104 75Z', COLOR.coral);
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
  label(ctx, 'HÖNSGÅRDEN', 25, 237, 10);
  label(ctx, '40-ÅRSKALAS', 891, 391, 10);
}

function party(ctx, portrait) {
  birch(ctx, 980, 347, 0.74);
  line(ctx, 883, 235, 883, 345, COLOR.mossDark, 3);
  line(ctx, 995, 223, 995, 349, COLOR.mossDark, 3);
  shape(ctx, 'M883 240 Q939 260 995 228', null, COLOR.mossDark, 1.5);
  const flags = [COLOR.coral, COLOR.lime, COLOR.paper, COLOR.coral, COLOR.lime];
  for (let i = 0; i < flags.length; i++) {
    const x = 889 + i * 21;
    const y = 242 + Math.sin(i * 0.75) * 7 - i * 2;
    ctx.fillStyle = flags[i];
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 14, y); ctx.lineTo(x + 8, y + 18); ctx.closePath(); ctx.fill();
  }
  if (portrait) ctx.drawImage(portrait, 926, 260, 77, 84);
  // Little picnic table and a proper strawberry birthday cake.
  line(ctx, 887, 330, 887, 347, COLOR.mossDark, 3);
  line(ctx, 917, 330, 917, 347, COLOR.mossDark, 3);
  shape(ctx, 'M879 326 L925 326 925 332 879 332Z', COLOR.cream, COLOR.mossDark, 2);
  shape(ctx, 'M884 309 L919 309 919 325 884 325Z', COLOR.pink, COLOR.ink, 1.5);
  shape(ctx, 'M884 310 Q889 302 895 309 Q901 303 907 309 Q913 303 919 309 L919 315 Q914 319 910 314 Q905 320 900 314 Q894 320 889 314 L884 316Z', COLOR.cream);
  ellipse(ctx, 891, 306, 3, 4, COLOR.coral);
  ellipse(ctx, 913, 306, 3, 4, COLOR.coral);
  label(ctx, '40', 895, 303, 12, COLOR.coral);
  ellipse(ctx, 899, 291, 1.5, 3, COLOR.yellow);
  ellipse(ctx, 907, 291, 1.5, 3, COLOR.yellow);
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
  const homes = [[360, 372, 24], [398, 369, 29], [438, 377, 22], [478, 374, 27], [528, 380, 20]];
  ctx.globalAlpha = 0.72;
  for (const [x, y, width] of homes) {
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
  birch(ctx, 21, 192, 0.63);
  barn(ctx);
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

function bannerPlane(ctx, time, reducedMotion) {
  const cycleWidth = W + 560;
  const speed = 55;
  const planeX = ((time * speed + 320) % cycleWidth) - 460;
  const bob = reducedMotion ? 0 : Math.sin(time * 2.2) * 4.5;
  const planeY = 56 + bob;

  if (planeX < -460 || planeX > W + 60) return;

  ctx.save();
  ctx.translate(planeX, planeY);

  // Tow line from plane tail to banner
  const towEndX = -48;
  const towWave = reducedMotion ? 0 : Math.sin(time * 4) * 2;
  const towEndY = 2 + towWave;
  line(ctx, -22, 1, towEndX, towEndY, COLOR.ink, 1.5);

  // Fluttering banner
  const bannerW = 285;
  const bannerH = 26;
  const bannerX = towEndX - bannerW;
  const bannerY = towEndY - bannerH / 2;

  ctx.save();
  ctx.beginPath();
  const segments = 8;
  const segW = bannerW / segments;

  // Top wavy edge
  for (let i = 0; i <= segments; i++) {
    const sx = bannerX + i * segW;
    const wave = reducedMotion ? 0 : Math.sin(time * 5.5 - i * 0.7) * 2.8;
    const sy = bannerY + wave;
    if (i === 0) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  }

  // Right edge connected to tow line
  const rightWave = reducedMotion ? 0 : Math.sin(time * 5.5 - segments * 0.7) * 2.8;
  ctx.lineTo(towEndX, bannerY + bannerH + rightWave);

  // Bottom wavy edge (drawn backwards)
  for (let i = segments; i >= 0; i--) {
    const sx = bannerX + i * segW;
    const wave = reducedMotion ? 0 : Math.sin(time * 5.5 - i * 0.7) * 2.8;
    const sy = bannerY + bannerH + wave;
    ctx.lineTo(sx, sy);
  }

  // Swallowtail notch cut on the left end
  const notchWave = reducedMotion ? 0 : Math.sin(time * 5.5) * 2.8;
  ctx.lineTo(bannerX + 14, bannerY + bannerH / 2 + notchWave);
  ctx.closePath();

  ctx.fillStyle = COLOR.paper;
  ctx.fill();
  ctx.strokeStyle = COLOR.ink;
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Banner text: "John äger och Jonathan suger rumpa"
  ctx.fillStyle = COLOR.ink;
  ctx.font = 'bold 12px "Arial", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const midWave = reducedMotion ? 0 : Math.sin(time * 5.5 - 2.8) * 2.5;
  ctx.fillText('John äger och Jonathan suger rumpa', bannerX + bannerW / 2 + 8, bannerY + bannerH / 2 + midWave);
  ctx.restore();

  // Retro monoplane
  shape(ctx, 'M-22 2 Q-20-8 0-7 Q18-6 22 0 Q18 7 0 7 Q-20 7-22 2Z', COLOR.coral, COLOR.ink, 2);
  shape(ctx, 'M-18 2 Q-5 7 14 5 Q18 6 12 7 Q-5 8-18 2Z', COLOR.cream);
  shape(ctx, 'M-2-6 Q5-11 10-6 L10-4 L-2-4 Z', COLOR.skyLow, COLOR.ink, 1.5);

  // Pilot chick with aviator goggles
  ellipse(ctx, 3, -7, 4.5, 4.5, COLOR.yellow, COLOR.ink, 1.2);
  ellipse(ctx, 5, -8, 2, 2, COLOR.ink);
  ellipse(ctx, 6, -8, 0.8, 0.8, COLOR.skyLow);
  ellipse(ctx, 1, -8, 2, 2, COLOR.ink);
  ellipse(ctx, 2, -8, 0.8, 0.8, COLOR.skyLow);

  // Wing and tail fin
  shape(ctx, 'M-4 1 L-10 9 L1 9 L8 1 Z', COLOR.redDark, COLOR.ink, 1.5);
  shape(ctx, 'M-22 2 L-27-10 L-18-10 L-16 0 Z', COLOR.coral, COLOR.ink, 1.5);

  // Propeller
  ellipse(ctx, 22, 0, 2.5, 4, COLOR.yellow, COLOR.ink, 1.2);
  const propSpin = reducedMotion ? 5 : Math.cos(time * 35) * 8;
  line(ctx, 23, -propSpin, 23, propSpin, COLOR.cream, 2);

  ctx.restore();
}

function landingIndicator(ctx, bird, turtle, time, reducedMotion) {
  if (bird.phase !== 'flying' || bird.vy <= 0 || (bird.bounces || 0) >= 3) return;
  const feetY = bird.y + 17;
  const dy = SHELL_TOP - feetY;
  if (dy <= 0 || dy > 340) return;

  const g = bird.g || 780;
  const disc = bird.vy * bird.vy + 2 * g * dy;
  if (disc < 0) return;
  const t = (-bird.vy + Math.sqrt(disc)) / g;
  if (t > 1.6) return;

  const vx = bird.vx || 116.667;
  const projX = bird.x + vx * t;
  if (projX >= 865) return;
  const targetYPos = SHELL_TOP + 2;

  const dx = projX - turtle.x;
  const shellHalf = turtle.shellHalf || 92;
  const aligned = Math.abs(dx) <= shellHalf;
  const isSweet = Math.abs(dx) <= shellHalf * 0.38;
  // Closeness factor: 0 (far) to 1 (landing now)
  const proximity = Math.max(0, Math.min(1, 1 - t / 1.5));
  const radiusX = 34 - proximity * 16;
  const radiusY = 7 - proximity * 3.5;
  ctx.save();
  ctx.translate(projX, targetYPos);

  if (aligned) {
    ctx.globalAlpha = 0.55 + proximity * 0.45;
    ellipse(ctx, 0, 0, radiusX + 5, radiusY + 1.5, null, COLOR.foam, 1.5);
    ellipse(ctx, 0, 0, radiusX, radiusY, isSweet ? COLOR.yellowLight : COLOR.lime, COLOR.ink, 2);
    if (isSweet) {
      ellipse(ctx, 0, 0, radiusX * 0.5, radiusY * 0.5, COLOR.coral, null);
    }
  } else {
    ctx.globalAlpha = 0.4 + proximity * 0.4;
    ellipse(ctx, 0, 0, radiusX, radiusY, COLOR.waterDark, COLOR.coral, 1.5);
    if (Math.abs(dx) > 35 && proximity > 0.25) {
      const dir = dx > 0 ? 1 : -1;
      ctx.fillStyle = COLOR.coral;
      ctx.beginPath();
      ctx.moveTo(dir * (radiusX + 9), 0);
      ctx.lineTo(dir * (radiusX + 3), -3.5);
      ctx.lineTo(dir * (radiusX + 3), 3.5);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();
}

function chicken(ctx, bird, time, reducedMotion, scale = 1) {
  const flying = bird.phase === 'flying';
  const walk = reducedMotion || flying ? 0 : Math.sin((bird.age || 0) * 13);
  const flap = reducedMotion ? 0 : Math.sin(time * (flying ? 24 : 8) + (bird.age || 0) * 2);
  const type = bird.type || 'normal';
  const effectiveScale = type === 'chonky' ? scale * 1.14 : scale;

  ctx.save();
  ctx.translate(bird.x, bird.y + (flying ? 0 : Math.abs(walk) * -1.3));
  ctx.rotate(reducedMotion ? 0 : bird.rotation || 0);
  ctx.scale(effectiveScale, effectiveScale);
  if (!flying) ellipse(ctx, 0, 18, 14, 2.5, COLOR.stoneShade);

  // Feet end exactly seventeen world units below the controller's center.
  line(ctx, -5, 8, -6 + walk * 3, 17, COLOR.orange, 2.5);
  line(ctx, -6 + walk * 3, 17, -2 + walk * 3, 17, COLOR.orange, 2.5);
  line(ctx, 5, 8, 7 - walk * 3, 17, COLOR.orange, 2.5);
  line(ctx, 7 - walk * 3, 17, 11 - walk * 3, 17, COLOR.orange, 2.5);

  const bodyColor = type === 'gold' ? COLOR.gold : COLOR.yellow;
  const shadeColor = type === 'gold' ? COLOR.goldDark : COLOR.yellowShade;
  const lightColor = type === 'gold' ? COLOR.goldLight : COLOR.yellowLight;

  shape(ctx, BODY, bodyColor, COLOR.ink, 2);
  shape(ctx, 'M-13 4 Q-3 17 13 6 Q7 15-3 13 Q-10 12-13 4Z', shadeColor);
  ellipse(ctx, 6, -10, 7, 6, lightColor);
  shape(ctx, 'M5-18 Q0-25 7-22 L9-18 M10-18 Q10-24 15-23 L14-18', bodyColor, COLOR.ink, 1.5);
  shape(ctx, 'M17-11 L25-7 17-4Z', COLOR.orange, COLOR.ink, 1.5);
  ellipse(ctx, 11, -10, 2.2, 3, COLOR.ink);
  ellipse(ctx, 11.7, -11, 0.7, 0.9, COLOR.cream);
  ellipse(ctx, 12, -3, 3.2, 2, COLOR.pink);

  if (type === 'speedy') {
    shape(ctx, 'M4 -15 Q11 -18 16 -13 L15 -10 Q10 -15 3 -12 Z', COLOR.coral, COLOR.ink, 1.5);
    shape(ctx, 'M3 -13 Q-4 -18 -8 -15 Q-4 -14 2 -10 Z', COLOR.coral, COLOR.ink, 1);
  } else if (type === 'chonky') {
    shape(ctx, 'M7 -19 L12 -33 L17 -18 Z', COLOR.coral, COLOR.ink, 1.5);
    ellipse(ctx, 12, -34, 2.5, 2.5, COLOR.cream);
    line(ctx, 9, -24, 15, -24, COLOR.yellowLight, 1.5);
  } else if (type === 'gold' && !reducedMotion && Math.sin(time * 8 + (bird.age || 0)) > 0.2) {
    ellipse(ctx, 4, -15, 2.5, 2.5, COLOR.cream);
  }

  ctx.save(); ctx.translate(-4, -1); ctx.rotate(flying ? -0.55 + flap * 0.75 : flap * 0.12);
  shape(ctx, WING, shadeColor, COLOR.ink, 1.5);
  line(ctx, -9, -2, -4, 0, lightColor, 1.5);
  ctx.restore();
  ctx.restore();
}

function turtle(ctx, state, time, reducedMotion) {
  const impact = Math.max(0, Math.min(1, state.impact || 0));
  const facing = state.facing < 0 ? -1 : 1;
  const paddle = reducedMotion ? 0 : Math.sin(time * 5);
  ctx.save();
  ctx.translate(state.x, SHELL_TOP);
  // Spring squash is anchored at the collision crown, never above it.
  ctx.scale(1 + impact * 0.045, 1 - impact * 0.18);
  ellipse(ctx, 0, 58, 91, 9, COLOR.waterDark);
  ctx.globalAlpha = 0.65;
  ellipse(ctx, 0, 58, 104 + Math.sin(time * 3) * 4, 12, null, COLOR.foam, 1.5);
  ctx.globalAlpha = 1;
  ctx.save(); ctx.scale(facing, 1);
  ctx.save(); ctx.translate(-48, 44); ctx.rotate(-0.3 + paddle * 0.18);
  ellipse(ctx, 0, 9, 11, 18, COLOR.lime, COLOR.ink, 2);
  line(ctx, -3, 17, -3, 23, COLOR.leaf, 1.5);
  ctx.restore();
  ctx.save(); ctx.translate(48, 44); ctx.rotate(0.3 - paddle * 0.18);
  ellipse(ctx, 0, 9, 11, 18, COLOR.lime, COLOR.ink, 2);
  line(ctx, 3, 17, 3, 23, COLOR.leaf, 1.5);
  ctx.restore();
  shape(ctx, 'M-78 34 Q-107 36-96 42 L-79 44Z', COLOR.lime, COLOR.ink, 2);
  shape(ctx, 'M70 26 Q79 35 88 24 C100 7 120 19 115 34 Q111 48 92 40 L78 46Z', COLOR.lime, COLOR.ink, 2.5);
  ellipse(ctx, 101, 22, 8, 5, COLOR.limeLight);
  ellipse(ctx, 106, 23, 2.4, 3, COLOR.ink);
  ellipse(ctx, 107, 22, 0.8, 0.8, COLOR.cream);
  ellipse(ctx, 103, 32, 3.5, 2, COLOR.pink);
  shape(ctx, 'M108 34 Q113 36 116 32', null, COLOR.ink, 1.5);
  ctx.restore();
  shape(ctx, SHELL, COLOR.shell, COLOR.ink, 3);
  shape(ctx, 'M-84 36 Q0 54 84 36 L79 42 Q0 58-79 42Z', COLOR.lime, COLOR.ink, 2);
  for (let i = 0; i < SHELL_PATCHES.length; i++) shape(ctx, SHELL_PATCHES[i], i ? COLOR.leaf : COLOR.lime, COLOR.shellDark, 2);
  shape(ctx, 'M-21 8 Q0 3 20 8', null, COLOR.limeLight, 3);
  line(ctx, -59, 20, -47, 15, COLOR.lime, 2);
  line(ctx, 46, 14, 57, 19, COLOR.lime, 2);

  // --- CLEAR HITBOX BOUNCE PAD & TARGET ---
  // Left and Right bracket bumpers at -85 and +85 (marking exact hitbox width)
  ellipse(ctx, -85, 35, 4.5, 7, COLOR.coral, COLOR.ink, 2);
  ellipse(ctx, 85, 35, 4.5, 7, COLOR.coral, COLOR.ink, 2);
  ellipse(ctx, -85, 34, 1.8, 3.5, COLOR.cream);
  ellipse(ctx, 85, 34, 1.8, 3.5, COLOR.cream);

  // Bounce pad bed following the shell crown
  ctx.save();
  shape(ctx, 'M-82 34 C-74 12 -42 2 0 2 C42 2 74 12 82 34 L78 40 C40 16 0 14 -78 40 Z', COLOR.cream, COLOR.ink, 2);
  const padRibs = [-62, -42, -22, 22, 42, 62];
  for (const rx of padRibs) {
    const ry = Math.abs(rx) * 0.38 + 2;
    line(ctx, rx, ry, rx, ry + 6, COLOR.coral, 2);
  }

  // Sweet Spot / Bullseye (Center target: -26 to +26)
  ellipse(ctx, 0, 8, 26, 7, COLOR.yellowLight, COLOR.ink, 2);
  ellipse(ctx, 0, 8, 14, 4, COLOR.coral, COLOR.ink, 1.5);
  ellipse(ctx, 0, 8, 6, 2, COLOR.cream);

  if (impact > 0.05) {
    ellipse(ctx, 0, 8, 26 + impact * 35, 7 + impact * 12, null, COLOR.yellowLight, 2.5 * (1 - impact));
  }
  ctx.restore();

  ctx.restore();
}

function swimmingChick(ctx, lost, index, time, reducedMotion) {
  const x = Math.max(205, Math.min(830, lost.x));
  const y = 581 + index % 2 * 15 + (reducedMotion ? 0 : Math.sin(time * 2 + index * 2) * 2);
  ellipse(ctx, x, y + 7, 25, 5, null, COLOR.foam, 1.5);
  chicken(ctx, { x, y: y - 10, age: index, phase: 'flying', rotation: 0 }, reducedMotion ? 0 : time * 0.35, reducedMotion, 0.7);
  ellipse(ctx, x, y, 18, 7, COLOR.coral, COLOR.ink, 2);
  ellipse(ctx, x, y - 2, 11, 3.5, COLOR.water, COLOR.redDark, 1.5);
  line(ctx, x - 14, y - 3, x - 10, y + 4, COLOR.cream, 4);
  line(ctx, x + 12, y - 4, x + 9, y + 5, COLOR.cream, 4);
  // Body peeks over the back of the ring, rather than being swallowed by it.
  ellipse(ctx, x, y - 5, 8, 3, COLOR.yellow);
}

function effect(ctx, item, reducedMotion) {
  const duration = item.kind === 'perfect' || item.kind === 'gold' ? 1.5 : 1.2;
  const progress = Math.min(1, Math.max(0, item.age / duration));
  if (progress >= 1) return;
  const splash = item.kind === 'splash';
  const bounce = item.kind === 'bounce' || item.kind === 'perfect';
  const travel = reducedMotion ? 0.2 : progress;

  ctx.save();
  ctx.globalAlpha = (1 - progress) * (1 - progress);
  if (splash || bounce) {
    ellipse(
      ctx,
      item.x,
      splash ? WATER + 10 : SHELL_TOP + 5,
      12 + travel * 85,
      4 + travel * 9,
      null,
      splash ? COLOR.foam : item.kind === 'perfect' ? COLOR.yellowLight : COLOR.cream,
      3 - progress * 2,
    );
  }
  const count = reducedMotion ? 4 : item.kind === 'perfect' || item.kind === 'save' || item.kind === 'gold' ? 17 : 11;
  for (let i = 0; i < count; i++) {
    const angle = i * 2.399 + (item.seed || 0);
    const speed = 28 + i * 29 % 71;
    const x = item.x + Math.cos(angle) * speed * travel;
    const y = item.y - (25 + Math.sin(angle) * 38) * travel + (splash ? 75 : 35) * travel * travel;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(reducedMotion ? angle : angle + progress * 3);
    if (splash) ellipse(ctx, 0, 0, 2.5, 5, COLOR.foam);
    else if (item.kind === 'perfect') {
      ctx.fillStyle = i % 2 ? COLOR.gold : COLOR.yellowLight;
      ctx.fillRect(-3, -3, 6, 6);
    } else if (item.kind === 'save' || item.kind === 'gold' || item.kind === 'combo') {
      ctx.fillStyle = i % 3 === 0 ? COLOR.coral : i % 3 === 1 ? COLOR.lime : COLOR.yellow;
      ctx.fillRect(-2, -4, 4, 8);
    } else {
      ellipse(ctx, 0, 0, 2.5, 7, i % 2 ? COLOR.cream : COLOR.yellowLight);
      line(ctx, 0, -4, 0, 6, COLOR.yellowShade, 1);
    }
    ctx.restore();
  }
  ctx.restore();
}

/** Stateless canvas view; the controller owns time, motion and all game rules. */
export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const background = document.createElement('canvas');
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
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round((bounds.width || W) * dpr));
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
    bannerPlane(ctx, time, scene.reducedMotion);
    water(ctx, time);
    for (const bird of scene.chickens) {
      landingIndicator(ctx, bird, scene.turtle, time, scene.reducedMotion);
    }
    turtle(ctx, scene.turtle, time, scene.reducedMotion);
    if (scene.mode === 'ready' && !scene.chickens.length) {
      chicken(ctx, { x: 130, y: 183, age: 0, rotation: 0, phase: 'queued' }, time, scene.reducedMotion);
      chicken(ctx, { x: 95, y: 183, age: 1, rotation: 0, phase: 'queued' }, time, scene.reducedMotion);
      chicken(ctx, { x: 62, y: 183, age: 2, rotation: 0, phase: 'queued' }, time, scene.reducedMotion);
    }
    for (const bird of scene.chickens) {
      if (bird.phase === 'queued' && bird.x < 25) continue;
      chicken(ctx, bird, time, scene.reducedMotion);
    }
    for (let i = 0; i < scene.lost.length && i < 3; i++) swimmingChick(ctx, scene.lost[i], i, time, scene.reducedMotion);
    for (const item of scene.effects) effect(ctx, item, scene.reducedMotion);
    ctx.restore();
  }

  portrait.onload = () => {
    if (disposed) return;
    portraitReady = true;
    sceneryDirty = true;
    if (lastScene) draw(lastScene);
  };
  portrait.src = new URL('./barkan.svg', import.meta.url).href;
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  // Window resize also catches DPR changes when moving between displays.
  window.addEventListener('resize', resize);
  resize();

  return {
    draw,
    dispose() {
      disposed = true;
      observer.disconnect();
      window.removeEventListener('resize', resize);
      portrait.onload = null;
      portrait.onerror = null;
      portrait.removeAttribute('src');
      lastScene = null;
      background.width = background.height = 0;
    },
  };
}
