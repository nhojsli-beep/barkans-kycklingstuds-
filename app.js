import { initGame } from "./game.js";
import { initStory } from "./story.js";

initGame();
initStory();

const quotes = [
  ["Jag ska bara<br>säga en sak till.", "— 45 MINUTER SEDAN"],
  ["Vet du vad det<br>sjuka är, då?", "— INGEN HANN SVARA"],
  ["Jag är inte sen.<br>Jag är en sidostory.", "— BÄRKANS TIDSZON"],
  ["Snart 40. Men jag<br>sparar kvittot.", "— ÖPPET KÖP PÅ VUXENLIVET"],
  ["Lyssnar du? Bra.<br>Vi börjar från början.", "— DET FANNS INGEN PAUS"],
  ["Jag kan vara tyst.<br>Vill du höra hur?", "— ETT TEORETISKT KONCEPT"],
  ["Behöver du hjälp?<br>Jag kommer direkt.", "— STORT HJÄRTA, STOR MUN"],
  ["En snabb fråga.<br>I sju delar.", "— MED TRE BILAGOR"],
];
const character = document.querySelector("#character");
const bubble = document.querySelector("#hero-quote");
const soundButton = document.querySelector("#sound");
let quoteIndex = 0;
let soundEnabled = false;
let audio;
let masterGain;
let splashBuffer;
function enableAudio() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  audio ||= new AudioContext();
  if (!masterGain) {
    masterGain = audio.createGain();
    masterGain.gain.value = 0.55;
    masterGain.connect(audio.destination);
  }
  if (audio.state === "suspended") audio.resume().catch(() => {});
}
function tone(frequency, endFrequency, duration, delay = 0, volume = 0.05, type = "triangle", peak) {
  if (!soundEnabled || !audio || audio.state !== "running") return;
  const start = audio.currentTime + delay;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  if (peak) {
    oscillator.frequency.exponentialRampToValueAtTime(peak, start + duration * 0.18);
  }
  oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  gain.gain.linearRampToValueAtTime(0, start + duration + 0.015);
  oscillator.connect(gain).connect(masterGain);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
  oscillator.onended = () => {
    oscillator.disconnect();
    gain.disconnect();
  };
}
function blip(frequency = 330) {
  tone(frequency, frequency * 0.65, 0.12, 0, 0.035);
}
function splash() {
  if (!soundEnabled || !audio || audio.state !== "running") return;
  if (!splashBuffer) {
    splashBuffer = audio.createBuffer(1, Math.ceil(audio.sampleRate * 0.3), audio.sampleRate);
    const samples = splashBuffer.getChannelData(0);
    for (let index = 0; index < samples.length; index++) {
      samples[index] = Math.random() * 2 - 1;
    }
  }
  const start = audio.currentTime;
  const noise = audio.createBufferSource();
  const filter = audio.createBiquadFilter();
  const gain = audio.createGain();
  noise.buffer = splashBuffer;
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1800, start);
  filter.frequency.exponentialRampToValueAtTime(180, start + 0.28);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(0.11, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.001, start + 0.28);
  noise.connect(filter).connect(gain).connect(masterGain);
  noise.start(start);
  noise.stop(start + 0.3);
  noise.onended = () => {
    noise.disconnect();
    filter.disconnect();
    gain.disconnect();
  };
  tone(150, 55, 0.24, 0, 0.055, "sine");
}
function gameSound(kind) {
  switch (kind) {
    case "bounce":
      tone(240, 190, 0.22, 0, 0.07, "triangle", 620);
      break;
    case "bounce-perfect":
      tone(587, 880, 0.14, 0, 0.07, "sine", 1174);
      tone(880, 1320, 0.2, 0.05, 0.07, "sine", 1760);
      break;
    case "gold-save":
      tone(523, 659, 0.1, 0, 0.05, "sine");
      tone(659, 784, 0.1, 0.07, 0.05, "sine");
      tone(784, 1046, 0.12, 0.14, 0.05, "sine");
      tone(1046, 1318, 0.22, 0.22, 0.06, "sine");
      break;
    case "combo":
      tone(440, 660, 0.11, 0, 0.05, "triangle");
      tone(660, 880, 0.16, 0.07, 0.05, "triangle");
      break;
    case "rush":
      tone(330, 392, 0.12, 0, 0.06, "sawtooth");
      tone(440, 523, 0.2, 0.1, 0.06, "sawtooth");
      break;
    case "saved":
      tone(660, 990, 0.1, 0, 0.045, "sine");
      tone(990, 1320, 0.16, 0.09, 0.045, "sine");
      break;
    case "splash":
      splash();
      break;
    case "milestone":
      tone(523, 523, 0.14, 0, 0.05);
      tone(659, 659, 0.14, 0.12, 0.05);
      tone(784, 784, 0.16, 0.24, 0.05);
      tone(1047, 1047, 0.3, 0.38, 0.05);
      break;
    case "start":
      tone(330, 440, 0.12, 0, 0.05);
      tone(660, 880, 0.2, 0.13, 0.05);
      break;
    case "over":
      tone(392, 330, 0.18, 0, 0.05);
      tone(294, 247, 0.18, 0.18, 0.05);
      tone(196, 98, 0.38, 0.36, 0.045);
      break;
  }
}
function resumeAudio() {
  if (soundEnabled && audio?.state === "suspended") {
    audio.resume().catch(() => {});
  }
}
document.addEventListener("pointerdown", resumeAudio, { passive: true });
document.addEventListener("keydown", resumeAudio);
soundButton.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  if (soundEnabled) enableAudio();
  if (masterGain) {
    masterGain.gain.cancelScheduledValues(audio.currentTime);
    masterGain.gain.setTargetAtTime(soundEnabled ? 0.55 : 0, audio.currentTime, 0.01);
  }
  soundButton.setAttribute("aria-pressed", String(soundEnabled));
  document.querySelector("#sound-label").textContent = soundEnabled
    ? "LJUD PÅ"
    : "LJUD AV";
  if (soundEnabled && audio) {
    audio.resume().then(() => blip(440)).catch(() => {});
  }
});
character.addEventListener("click", () => {
  quoteIndex = (quoteIndex + 1) % quotes.length;
  const [quote, attribution] = quotes[quoteIndex];
  bubble.innerHTML = `”${quote}”<span>${attribution}</span>`;
  character.classList.remove("talking");
  requestAnimationFrame(() => character.classList.add("talking"));
  blip(260 + quoteIndex * 40);
});
document.querySelector("#game-root").addEventListener("click", (event) => {
  if (event.target.closest(".pause-game:not(:disabled), .expand-game:not(:disabled)")) {
    blip(390);
  }
});
document
  .querySelector("#game-root")
  .addEventListener("barkan-game-sound", (event) => {
    gameSound(event.detail);
  });
