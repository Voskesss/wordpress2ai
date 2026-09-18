/**
 * De mails die vanaf de admin-klantpagina naar de klant gaan, als losse
 * bouwfuncties. De acties versturen ze en de ⓘ-voorbeelden tonen ze — zelfde
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

/** Uitnodiging: de klaargezette dagen plus de planlink en de portaalroute. */
export function bouwAfspraakUitnodiging(o: {
  siteNaam: string;
  naam?: string | null;
  link: string;
  duurMinuten: number;
  dagen: { datum: string; van: string; tot: string }[];
  eigenTekst?: string | null;
  zonderStandaard?: boolean;
}): { onderwerp: string; html: string } {
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
  return {
    onderwerp: `Even samen kijken naar ${o.siteNaam}?`,
    html: inWordSwapHuisstijl(`<p>Beste ${ontsnap(voornaam(o.naam))},</p>
${alineas(o.eigenTekst)}
${
      o.zonderStandaard
        ? `<p>Je kunt kiezen uit deze momenten (${duur}):</p>`
        : `<p>Ik heb een paar momenten vrijgehouden om samen naar je website te kijken. Het gesprek duurt ${duur}; ik bel je.</p>`
    }
<ul>${dagen}</ul>
${knop(o.link, "Kies een moment")}
<p style="color:#57534e;font-size:14px">Je kunt ook <a href="https://www.wordswap.nl/portal#afspraak" style="color:#6d28d9">inloggen op je eigen omgeving</a> en daar bij <em>Even samen kijken</em> een moment kiezen. Ben je ingelogd, dan hoef je niets in te vullen: je naam en e-mailadres neem ik over uit je account.</p>
<p>Komt geen van deze dagen uit? Laat het gerust weten, met een dag en tijd die jou wél schikt, dan plan ik dat in.</p>
<p>Groet,<br>Jos</p>`),
  };
}

/** Bevestiging van een gekozen moment (het agendabestand gaat als bijlage mee). */
export function bouwAfspraakBevestiging(o: {
  naam?: string | null;
  telefoon?: string | null;
  opmerking?: string | null;
  start: Date;
  duurMinuten: number;
}): { onderwerp: string; html: string } {
  const wanneer = momentInWoorden(o.start, o.duurMinuten);
  return {
    onderwerp: `Afspraak bevestigd: ${wanneer}`,
    html: inWordSwapHuisstijl(`<p>Beste ${ontsnap(voornaam(o.naam))},</p>
<p>De afspraak staat: <strong>${ontsnap(wanneer)}</strong> (${duurInWoorden(o.duurMinuten)}).</p>
<p>Ik bel je op ${ontsnap(o.telefoon ?? "het nummer dat ik van je heb")}. In de bijlage zit een agendabestand; met één klik zet je de afspraak in je eigen agenda.</p>
${o.opmerking ? `<p>Je berichtje: ${ontsnap(o.opmerking)}</p>` : ""}
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
<p>Fijn dat je website van <strong>${ontsnap(o.siteNaam)}</strong> bij ons draait. Mag ik je twee kleine dingen vragen? Het kost je hooguit twee minuten en het helpt mijn kleine bedrijf enorm.</p>
<p><strong>1. Een Google-review.</strong> Een paar eerlijke zinnen over hoe je de overstap en het beheren via de chat hebt ervaren — daar hebben andere ondernemers echt iets aan.</p>
${knop(REVIEW_LINK, "Laat een review achter")}
<p><strong>2. Mogen we je website als voorbeeld noemen?</strong> Bijvoorbeeld op wordswap.nl, als referentieproject voor nieuwe klanten. Antwoord gewoon "ja" op deze mail, dan weet ik genoeg — en zeg je liever nee, dan is dat natuurlijk ook helemaal prima.</p>
<p>Dank je wel alvast! Vragen of wensen? Antwoord op deze mail of bel me op ${TELEFOON}.</p>
<p>Groet,<br>Jos</p>`),
  };
}
