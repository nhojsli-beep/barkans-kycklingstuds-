const STORY = {
  start: {
    chapter: 1,
    title: "En helt vanlig tisdag",
    copy: "Klockan är 08:07 i Tranås och Bärkan, snart 40, har redan hunnit berätta hela sin dröm för en krukväxt. Den ser imponerad ut. Du hittar honom vid torget med en termos, tre idéer och ett samtal som vägrar ta slut.",
    choices: [
      { label: "Ge Bärkan en mikrofon", next: "mic" },
      { label: "Ge Bärkan en kanelbulle", next: "bulle" },
    ],
  },
  mic: {
    chapter: 2,
    title: "Kapitel två: Torgets stora scen",
    copy: "Bärkan tar mikrofonen och viskar: ‘Jag ska bara säga en snabb sak.’ Tjugotvå minuter senare har han förklarat väder, vänskap och varför måsar borde ha små reflexvästar. Alla lyssnar. Till och med statyn.",
    choices: [
      { label: "Be honom avsluta med en fanfar", next: "mic-fanfare" },
      { label: "Fråga vem som behöver hjälp", next: "mic-help" },
    ],
  },
  bulle: {
    chapter: 2,
    title: "Kapitel två: Fika med följdfrågor",
    copy: "Bärkan delar bullen i exakt två lika stora delar, trots att den ena plötsligt blivit en smula. ‘Det viktiga är rättvisa’, säger han och börjar sedan prata om kanelens personlighet. En äldre dam nickar högtidligt.",
    choices: [
      { label: "Föreslå en bulle-paus", next: "bulle-paus" },
      { label: "Be honom bjuda hela torget", next: "bulle-torg" },
    ],
  },
  "mic-fanfare": {
    chapter: 3,
    title: "Kapitel tre: Den nästan korta finalen",
    copy: "Du håller upp en papptrumpet. Bärkan blåser, trumpeten säger ‘prutt’, och torget jublar som om Nobelpriset delats ut i fikafrågor. Han bugar så djupt att termoslocket applåderar.",
    ending:
      "Bärkan blir dagens ofrivilliga konferencier. Han lovar att prata kortare nästa tisdag. Ingen tror honom, men alla hoppas lite.",
  },
  "mic-help": {
    chapter: 3,
    title: "Kapitel tre: Hjältemod med parenteser",
    copy: "En borttappad vante behöver hjälp. Bärkan hittar den direkt, men förklarar först vantar, vinter och sin teori om fickors hemliga liv. Sedan lämnar han tillbaka den med ett varmt: ‘Varsågod, kompis!’",
    ending:
      "Vanten får komma hem, torget får ett leende och Bärkan får ett tack som han återberättar i tre versioner. Alla versioner är fina.",
  },
  "bulle-paus": {
    chapter: 3,
    title: "Kapitel tre: Tystnadens mästare",
    copy: "Du föreslår fem minuters fikapaus. Bärkan nickar, tar en tugga och lyckas vara tyst i fyra hela sekunder. Sedan viskar han: ‘Vet du vad bullen påminner mig om?’",
    ending:
      "Det blir ingen tystnad, men det blir en väldigt trevlig tisdag. Bärkan delar sista smulan och kallar det lagarbete.",
  },
  "bulle-torg": {
    chapter: 3,
    title: "Kapitel tre: Bärkan bjuder laget runt",
    copy: "Bärkan öppnar termosens hemliga reservfika: sju små kakor och en servett med ett peppigt ‘KÖR!’. Han bjuder alla, pratar med alla och frågar varje person hur dagen egentligen känns.",
    ending:
      "Torget förvandlas till en spontan fikaklubb. Bärkan får smulor på tröjan och hela Tranås får en anledning att stanna en stund.",
  },
};

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  element.className = className;
  if (text) element.textContent = text;
  return element;
}

export function initStory() {
  const mount = document.querySelector("#story-root");
  if (!mount) return;

  let current = "start";
  let started = false;

  const render = () => {
    const scene = STORY[current];
    mount.replaceChildren();

    const article = makeElement("article", "story-scene", "");
    article.setAttribute("aria-live", "polite");
    article.setAttribute("aria-atomic", "true");

    const kicker = makeElement(
      "p",
      "story-kicker eyebrow",
      `Kapitel ${scene.chapter} · En helt vanlig tisdag`,
    );
    const title = makeElement("h2", "story-title", scene.title);
    const copy = makeElement("p", "story-copy", scene.copy);
    article.append(kicker, title, copy);

    if (scene.ending) {
      const ending = makeElement("p", "story-ending", scene.ending);
      const restart = makeElement(
        "button",
        "button primary story-restart",
        "Börja om tisdagsturen",
      );
      restart.type = "button";
      restart.addEventListener("click", () => {
        current = "start";
        started = false;
        render();
      });
      article.append(ending, restart);
    } else {
      const choices = makeElement("div", "story-choices", "");
      choices.setAttribute("role", "group");
      choices.setAttribute("aria-label", "Välj vad som händer sedan");
      scene.choices.forEach((choice) => {
        const button = makeElement(
          "button",
          "button story-choice",
          choice.label,
        );
        button.type = "button";
        button.addEventListener("click", () => {
          current = choice.next;
          started = true;
          render();
        });
        choices.append(button);
      });
      article.append(choices);
    }

    mount.append(article);
    if (started) title.setAttribute("tabindex", "-1");
    if (started) title.focus({ preventScroll: true });
  };

  render();
}
