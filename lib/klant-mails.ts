/**
 * De mails die vanaf de admin-klantpagina naar de klant gaan, als losse
 * bouwfuncties. De acties versturen ze en de ⓘ-voorbeelden tonen ze, zelfde
 * functie, dus het voorbeeld is gegarandeerd exact de echte mail.
 */
import { duurInWoorden, momentInWoorden } from "@/lib/afspraken";
import { REVIEW_LINK, TELEFOON } from "@/lib/persoonlijk";
import { inWordSwapHuisstijl, ontsnap } from "@/lib/wordswap-mail";

const voornaam = (naam?: string | null) => (naam ?? "").trim().split(/\s+/)[0] || "klant";

/** Eigen berichtje van Jos, als gewone alinea's. */
function alineas(tekst?: string | null): string {
  const schoon = (tekst ?? "").trim();
  if (!schoon) return "";
  return schoon
    .split(/\n{2,}/)
    .map((stuk) => `<p>${ontsnap(stuk).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function knop(url: string, label: string): string {
  return `<p><a href="${url}" style="display:inline-block;background:#31956B;color:#fff !important;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:600"><span style="color:#fff !important;text-decoration:none">${label}</span></a></p>`;
}

/**
 * Uitnodiging: de klaargezette dagen plus de planlink en, voor een klant, de
 * portaalroute. Bij een potentiële klant (soort "lead") gaat het over
 * kennismaken in plaats van over "je website", vervalt de portaalalinea (die
 * heeft nog geen account) en beloven we geen telefoontje: bellen of
 * videobellen mag hij zelf zeggen.
 */
export function bouwAfspraakUitnodiging(o: {
  siteNaam: string;
  naam?: string | null;
  link: string;
  duurMinuten: number;
  dagen: { datum: string; van: string; tot: string }[];
  eigenTekst?: string | null;
  zonderStandaard?: boolean;
  soort?: "klant" | "lead";
  /** Eigen onderwerpregel; leeg = het standaardonderwerp hieronder */
  onderwerp?: string | null;
}): { onderwerp: string; html: string } {
  const isLead = o.soort === "lead";
  const duur = duurInWoorden(o.duurMinuten);
  const dagen = o.dagen
    .map(
      (b) =>
        `<li>${ontsnap(
          new Date(`${b.datum}T12:00:00`).toLocaleDateString("nl-NL", {
            weekday: "long",
            day: "numeric",
            month: "long",
          }),
        )} tussen ${ontsnap(b.van)} en ${ontsnap(b.tot)}</li>`,
    )
    .join("");
  const standaardZin = isLead
    ? `<p>Ik heb een paar momenten vrijgehouden om kennis te maken. Het gesprek duurt ${duur}, bellen of videobellen, wat jij prettig vindt.</p>`
    : `<p>Ik heb een paar momenten vrijgehouden om samen naar je website te kijken. Het gesprek duurt ${duur}; ik bel je.</p>`;
  // Laat je de standaardzin weg, dan gaat de mail ergens anders over dan
  // kennismaken of "even samen kijken", dus dan past dat onderwerp ook niet.
  const standaardOnderwerp = o.zonderStandaard
    ? "Wanneer schikt het jou?"
    : isLead
      ? "Even kennismaken?"
      : `Even samen kijken naar ${o.siteNaam}?`;
  return {
    onderwerp: o.onderwerp?.trim() || standaardOnderwerp,
    html: inWordSwapHuisstijl(`<p>Beste ${ontsnap(voornaam(o.naam))},</p>
${alineas(o.eigenTekst)}
${o.zonderStandaard ? `<p>Je kunt kiezen uit deze momenten (${duur}):</p>` : standaardZin}
<ul>${dagen}</ul>
${knop(o.link, "Kies een moment")}
${
      isLead
        ? ""
        : `<p style="color:#57534e;font-size:14px">Je kunt ook <a href="https://www.wordswap.nl/portal#afspraak" style="color:#6d28d9">inloggen op je eigen omgeving</a> en daar bij <em>Even samen kijken</em> een moment kiezen. Ben je ingelogd, dan hoef je niets in te vullen: je naam en e-mailadres neem ik over uit je account.</p>`
    }
<p>Komt geen van deze dagen uit? Laat het gerust weten, met een dag en tijd die jou wél schikt, dan plan ik dat in.</p>
<p>Groet,<br>Jos</p>`),
  };
}

/** Bevestiging van een gekozen moment (het agendabestand gaat als bijlage mee). */
/** De zin over hoe Jos contact opneemt: een los nummer wordt "Ik bel je op …",
 * en alles anders (bv. "Ik stuur je een Teams-uitnodiging.") wordt letterlijk
 * gebruikt, zodat Jos bij het bevestigen kan afwijken van bellen. */
export function contactZin(contact?: string | null): string {
  const schoon = (contact ?? "").trim();
  if (!schoon) return "Ik bel je op het nummer dat ik van je heb.";
  if (/^[\d+()\-\s]{6,}$/.test(schoon)) return `Ik bel je op ${schoon}.`;
  return schoon.endsWith(".") || schoon.endsWith("!") || schoon.endsWith("?") ? schoon : `${schoon}.`;
}

export function bouwAfspraakBevestiging(o: {
  naam?: string | null;
  telefoon?: string | null;
  opmerking?: string | null;
  start: Date;
  duurMinuten: number;
  /** Afwijkende contactzin; leeg = bellen op o.telefoon */
  contact?: string | null;
  /** Eigen berichtje van Jos, onder de afspraakregels */
  eigenTekst?: string | null;
  /** Eigen onderwerpregel; leeg = "Afspraak bevestigd: <moment>". Bewust NIET
   * "onderwerp" genoemd: de afspraakrij heeft zelf een veld onderwerp (waar het
   * gesprek over gaat) en die zou hier via {...afspraak} in sluipen. */
  eigenOnderwerp?: string | null;
}): { onderwerp: string; html: string } {
  const wanneer = momentInWoorden(o.start, o.duurMinuten);
  return {
    onderwerp: o.eigenOnderwerp?.trim() || `Afspraak bevestigd: ${wanneer}`,
    html: inWordSwapHuisstijl(`<p>Beste ${ontsnap(voornaam(o.naam))},</p>
<p>De afspraak staat: <strong>${ontsnap(wanneer)}</strong> (${duurInWoorden(o.duurMinuten)}).</p>
<p>${ontsnap(contactZin(o.contact ?? o.telefoon))} In de bijlage zit een agendabestand; met één klik zet je de afspraak in je eigen agenda.</p>
${o.opmerking ? `<p>Je berichtje: ${ontsnap(o.opmerking)}</p>` : ""}
${alineas(o.eigenTekst)}
<p>Komt het toch niet uit? Mail of bel me gerust, dan zoeken we een ander moment.</p>
<p>Groet,<br>Jos</p>`),
  };
}

/** Afzegging door Jos, met eventueel de reden. */
export function bouwAfspraakAfzegging(o: {
  naam?: string | null;
  start: Date;
  duurMinuten: number;
  reden?: string | null;
}): { onderwerp: string; html: string } {
  return {
    onderwerp: "Afspraak gaat niet door",
    html: inWordSwapHuisstijl(`<p>Beste ${ontsnap(voornaam(o.naam))},</p>
<p>Het moment van <strong>${ontsnap(momentInWoorden(o.start, o.duurMinuten))}</strong> gaat helaas niet door.${
      o.reden?.trim() ? ` ${ontsnap(o.reden.trim())}` : ""
    }</p>
<p>Ik neem contact met je op voor een nieuw moment.</p>
<p>Groet,<br>Jos</p>`),
  };
}

/** Aankondiging dat het nieuwe ontwerp klaarstaat om te bekijken. */
export function bouwOntwerpKlaar(o: {
  siteNaam: string;
  naam?: string | null;
  ontwerpUrl: string;
  eigenTekst?: string | null;
}): { onderwerp: string; html: string } {
  return {
    onderwerp: "Je nieuwe ontwerp staat klaar om te bekijken",
    html: inWordSwapHuisstijl(`<p>Hoi ${ontsnap(voornaam(o.naam))},</p>
${alineas(o.eigenTekst)}
<p>Het nieuwe ontwerp voor <strong>${ontsnap(o.siteNaam)}</strong> staat voor je klaar. Je kunt het rustig bekijken via de knop hieronder; de kaart staat ook in je eigen portaal.</p>
${knop(o.ontwerpUrl, "Bekijk het nieuwe ontwerp")}
<p>Belangrijk om te weten: dit is alleen kijken. Er staat niets live en je huidige website blijft precies zoals hij is, totdat jij zegt dat je over wilt.</p>
<p>Goed om te weten: zolang het ontwerp in deze fase zit, pas je het nog niet zelf via de chat aan. Wil je iets anders zien, groot of klein? Antwoord gewoon op deze mail met wat je opvalt, dan pas ik het aan. Bellen mag ook: ${TELEFOON}.</p>
<p>Groet,<br>Jos</p>`),
  };
}

/** Bericht dat het ontwerp tijdelijk is teruggetrokken (adres is dan dood). */
export function bouwOntwerpTeruggetrokken(o: {
  siteNaam: string;
  naam?: string | null;
  eigenTekst?: string | null;
}): { onderwerp: string; html: string } {
  return {
    onderwerp: "Ik heb het nieuwe ontwerp even teruggetrokken",
    html: inWordSwapHuisstijl(`<p>Hoi ${ontsnap(voornaam(o.naam))},</p>
${alineas(o.eigenTekst)}
<p>Ik heb het nieuwe ontwerp voor <strong>${ontsnap(o.siteNaam)}</strong> even offline gehaald om eraan te werken. De bekijk-link uit mijn eerdere mail doet het daardoor tijdelijk niet; dat hoort zo.</p>
<p>Je huidige website draait gewoon door en verandert niet. Zodra de nieuwe versie klaarstaat, krijg je vanzelf weer een berichtje met een verse link.</p>
<p>Vragen? Antwoord gewoon op deze mail of bel me op ${TELEFOON}.</p>
<p>Groet,<br>Jos</p>`),
  };
}

/** Review- en referentieverzoek. */
export function bouwReviewVerzoek(o: {
  siteNaam: string;
  naam?: string | null;
  eigenTekst?: string | null;
}): { onderwerp: string; html: string } {
  return {
    onderwerp: "Mag ik je twee kleine dingen vragen?",
    html: inWordSwapHuisstijl(`<p>Hoi ${ontsnap(voornaam(o.naam))},</p>
${alineas(o.eigenTekst)}
<p>Fijn dat je website van <strong>${ontsnap(o.siteNaam)}</strong> bij ons draait. Mag ik je twee kleine dingen vragen? Het kost je hooguit twee minuten en het helpt mijn bedrijf enorm.</p>
<p><strong>1. Een Google-review.</strong> Een paar eerlijke zinnen over hoe je de overstap en het beheren via de chat hebt ervaren. Daar hebben andere ondernemers echt iets aan.</p>
${knop(REVIEW_LINK, "Laat een review achter")}
<p>En ben je ergens juist niet tevreden over? Zeg het me dan alsjeblieft ook, gewoon in een antwoord op deze mail. Dan los ik het op; daar heb ik meer aan dan aan een mooi cijfer.</p>
<p><strong>2. Mogen we je website als voorbeeld laten zien?</strong> Dat doen we op drie plekken, en jij bepaalt welke:</p>
<ul>
<li><strong>Op wordswap.nl</strong>, als referentieproject: een plaatje van je homepage met een link naar je site.</li>
<li><strong>Op Facebook</strong>, in een berichtje dat je bent aangesloten, ook met plaatje en link.</li>
<li><strong>Op LinkedIn</strong>, hetzelfde berichtje voor het zakelijke publiek.</li>
</ul>
<p>Leuk om te weten: dit levert jou ook wat op. Elke vermelding is een extra link naar jouw website en dat helpt je vindbaarheid, plus dat er weer eens mensen langskomen die je werk nog niet kenden.</p>
<p>Antwoord gewoon op deze mail met wat je goed vindt, bijvoorbeeld "alle drie prima" of "alleen de website". En zeg je liever helemaal nee, dan is dat natuurlijk ook prima.</p>
<p>Dank je wel alvast! Vragen of wensen? Antwoord op deze mail of bel me op ${TELEFOON}.</p>
<p>Groet,<br>Jos</p>`),
  };
}
