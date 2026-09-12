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
function blip(frequency = 330) {
  if (!soundEnabled) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  audio ||= new AudioContext();
  if (audio.state === "suspended") audio.resume().catch(() => {});
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(frequency, audio.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(
    frequency * 0.55,
    audio.currentTime + 0.15,
  );
  gain.gain.setValueAtTime(0.055, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.18);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start();
  oscillator.stop(audio.currentTime + 0.18);
}
soundButton.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  soundButton.setAttribute("aria-pressed", String(soundEnabled));
  document.querySelector("#sound-label").textContent = soundEnabled
    ? "LJUD PÅ"
    : "LJUD AV";
  blip(440);
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
  if (event.target.closest("button:not(:disabled)")) blip(390);
});
document
  .querySelector("#game-root")
  .addEventListener("barkan-game-sound", (event) => {
    blip(
      event.detail === "saved" ? 660 : event.detail === "splash" ? 140 : 390,
    );
  });
