import { vouwUit } from "./delen";
import { ZOEKINDEX_PAD, bouwZoekindex, vulIngebouwdeDelenAan } from "./zoeken";
import { zetSrcset } from "./beeldmaten";
import { vervangPlaceholderDomein } from "./cloudflare";

/**
 * Het vertrekpakket: de website-download uit het portaal.
 *
 * De repo is de BRON, niet de site: pagina's bevatten <!--invoeg:naam-->-markers
 * die pas bij de deploy worden uitgevouwen, en het placeholder-domein VERVANG.nl.
 * Wie de rauwe repo-zip ergens anders neerzette, kreeg dus pagina's zonder menu,
 * topbalk en footer (13x per site bij RoelArt, gemeten 25-09). Daarom bouwt dit
 * bestand de download op zoals de deploy de site opbouwt, maar dan schoon: geen
 * WordSwap-injecties (meldscript, inlogroute), wel een handleiding VERTREK.md
 * zodat de eigenaar zonder ons verder kan. Geen lock-in, ook in de praktijk.
 */

export type VertrekBestand = { pad: string; data: Buffer };

const WORDSWAP_FORMULIER = /action=["']https:\/\/wordswap\.nl\/api\/formulier["']/i;

/** Domein zoals in de admin ingevuld ("roelart.nl"), of null zolang workers.dev. */
export function schoonDomein(domein: string | null | undefined): string | null {
  const d = (domein ?? "").trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase();
  if (!d || !d.includes(".") || /\.workers\.dev$/.test(d)) return null;
  return d;
}

/** Maakt van de repo-bestanden de meeneembare site: uitgevouwen, echt domein, srcset, zoekindex, VERTREK.md. */
export function verwerkVertrek(
  bestanden: VertrekBestand[],
  o: { domein: string | null; repo: string }
): VertrekBestand[] {
  const delen = new Map<string, string>();
  for (const b of bestanden) {
    const m = b.pad.match(/^delen\/([^/]+)\.html?$/i);
    if (m) delen.set(m[1].toLowerCase(), b.data.toString("utf8"));
  }
  const alleDelen = vulIngebouwdeDelenAan(delen);
  const beeldBestanden = new Set(bestanden.map((b) => b.pad).filter((p) => /^afbeeldingen\/.+\.webp$/i.test(p)));

  const uit: VertrekBestand[] = [];
  const formulierPaginas: string[] = [];
  for (const b of bestanden) {
    // De delen-map zelf gaat niet mee: de pagina's zijn al uitgevouwen, en een
    // losse map met "menu.html" zou bij een andere hoster alleen verwarren.
    if (/^delen\//i.test(b.pad)) continue;
    let data = b.data;
    if (/\.html?$/i.test(b.pad)) {
      let html = vouwUit(data.toString("utf8"), alleDelen)
        // Eerder ingebakken wp2ai-hulpscripts uit oude bouwsels horen niet in het pakket
        .replace(/<script>[^<]*wp2ai[^<]*<\/script>/g, "");
      html = zetSrcset(html, beeldBestanden);
      html = vervangPlaceholderDomein(html, o.domein);
      if (WORDSWAP_FORMULIER.test(html)) formulierPaginas.push(b.pad);
      data = Buffer.from(html);
    } else if (/\.(xml|txt)$/i.test(b.pad)) {
      data = Buffer.from(vervangPlaceholderDomein(data.toString("utf8"), o.domein));
    }
    uit.push({ pad: b.pad, data });
  }

  // Zoekindex meegeven: het zoekvak op de site leest /zoekindex.json, en die
  // bestaat alleen op onze servers. Mislukt het op een rare pagina, dan gaat
  // het pakket gewoon zonder verse index de deur uit.
  try {
    const zoek = bouwZoekindex(uit);
    const bestaat = uit.findIndex((b) => b.pad === ZOEKINDEX_PAD);
    const zoekBestand = { pad: ZOEKINDEX_PAD, data: Buffer.from(zoek.json, "utf8") };
    if (bestaat >= 0) uit[bestaat] = zoekBestand;
    else uit.push(zoekBestand);
  } catch (e) {
    console.error(`[vertrek] ${o.repo}: zoekindex maken mislukt, pakket gaat zonder verder:`, e instanceof Error ? e.message : e);
  }

  const heeftActueel = bestanden.some((b) => b.pad === "sjablonen/actueel.json");
  uit.unshift({
    pad: "VERTREK.md",
    data: Buffer.from(maakVertrekMd({ domein: o.domein, formulierPaginas, heeftActueel })),
  });
  return uit;
}

/** De handleiding in het pakket. Klanttaal: geen jargon, en nooit lange streepjes. */
export function maakVertrekMd(o: {
  domein: string | null;
  formulierPaginas: string[];
  heeftActueel: boolean;
}): string {
  const domein = o.domein ?? "jouw domein";
  const formulieren = o.formulierPaginas
    .map((p) => `- /${p.replace(/index\.html$/i, "").replace(/\.html$/i, "")}`)
    .join("\n");
  return `# Jouw website, om mee te nemen

Dit is je complete website, precies zoals bezoekers hem zien: alle pagina's,
foto's en opmaak, met menu en voettekst er al in. Dit zijn gewone webbestanden.
Ze werken bij elke hostingpartij, en een website als deze heeft geen onderhoud
nodig: over drie jaar werkt hij nog precies zo.

Je hoeft niet weg om dit bestand te mogen hebben. Het staat altijd voor je
klaar in je portaal, ook als je gewoon klant blijft.

## De makkelijkste weg: laat een AI je helpen

Open ChatGPT of Claude en plak dit bericht:

> Ik heb een map met een complete statische website: gewone HTML, CSS en
> afbeeldingen, uitgepakt uit een zip. Er zit een bestand VERTREK.md bij met
> uitleg. Help me deze website stap voor stap online te zetten op Cloudflare
> Pages (gratis) op mijn eigen domein ${domein}. Ik ben geen techneut: doe het
> in kleine stappen, stel me steeds maar één vraag tegelijk en wacht op mijn
> antwoord voordat je verdergaat. Begin bij het aanmaken van het account.
> Help me daarna ook de formulieren werkend te krijgen zoals in VERTREK.md
> beschreven staat.

De AI loopt dan alles met je door: account aanmaken, de map uploaden (dat is
slepen en loslaten), en je domein koppelen. Reken op een half uur tot een uur.

## Liever zelf, zonder AI?

1. Maak een gratis account op pages.cloudflare.com (of Netlify, of een andere
   hostingpartij; het maakt voor deze bestanden niet uit).
2. Kies "Upload assets" of "Deploy manually" en sleep de uitgepakte map erin.
   Je site staat dan meteen online op een tijdelijk adres.
3. Koppel je eigen domein via de instellingen van die dienst; zij tonen precies
   welke regel je bij je domein moet aanpassen.

## Wat gewoon blijft werken

Alles wat je bezoekers zien en gebruiken: alle pagina's, foto's (ook de snelle
kleine versies voor telefoons), de zoekfunctie en fotogalerijen.

## Wat je even moet regelen: de formulieren

${o.formulierPaginas.length > 0 ? `De formulieren op je site sturen hun berichten nu naar WordSwap, en wij sturen
ze door naar jouw mail. Zodra je site ergens anders staat, moet dat anders,
want anders lijkt een formulier te werken terwijl er niets meer aankomt.
Het gaat om deze pagina's:

${formulieren}

De oplossing is één regel per formulier. Maak een gratis account bij een
formulierdienst (bijvoorbeeld formspree.io) en vervang in het formulier:

    action="https://wordswap.nl/api/formulier"

door het adres dat die dienst je geeft. De AI uit de prompt hierboven kan dit
voor je doen; wijs hem op deze paragraaf.` : `Deze site heeft geen formulieren die via WordSwap lopen; hier hoef je niets
voor te regelen.`}

## Wat stopt bij WordSwap

De chat waarmee je je site aanpast, de bevestigingsmails van formulieren en het
portaal horen bij ons abonnement. Je site zelf verandert daar niets van; teksten
aanpassen kan daarna met elke webbouwer, of met een AI die je deze bestanden geeft.
${o.heeftActueel ? `
Let op: de nieuwsberichten op je site werden automatisch bijgewerkt vanuit je
nieuwsdienst. Dat bijwerken stopt; de berichten die er staan blijven staan.
` : ""}
## Je domein en je e-mail

Je domeinnaam is en blijft van jou, waar hij ook geregistreerd staat. Om de
site te verhuizen wijzig je alleen de verwijzing van het domein naar je nieuwe
hostingpartij; zij tonen welke. Je e-mail staat daar los van: laat de
e-mailinstellingen (MX-records) van je domein met rust, dan blijft je mail
gewoon doorlopen.

## Hulp nodig?

Mail gerust naar jos@wordswap.nl, ook als je al weg bent. We helpen je op weg,
juist ook bij een vertrek.
`;
}
