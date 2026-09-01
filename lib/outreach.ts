import { createHmac } from "node:crypto";

export type Prospect = {
  id: number;
  bedrijf: string;
  website: string;
  email: string;
  observatie: string | null;
};

/** Afmeldtoken: koppelt een afmeldlink onvervalsbaar aan één prospect. */
export function afmeldToken(prospectId: number): string {
  return createHmac("sha256", process.env.CRON_SECRET ?? "wordswap")
    .update(`afmelden-${prospectId}`)
    .digest("hex")
    .slice(0, 20);
}

function afmeldRegel(p: Prospect): string {
  const link = `https://wordswap.nl/api/afmelden?p=${p.id}&t=${afmeldToken(p.id)}`;
  return `<div style="margin-top:32px;padding-top:20px;border-top:1px solid #e7e5e4;text-align:center">
<a href="${link}" style="display:inline-block;background:#f5f5f4;color:#57534e;padding:10px 20px;border-radius:999px;text-decoration:none;font-size:13px;font-weight:600;border:1px solid #e7e5e4">Val mij niet meer lastig</a>
<p style="margin-top:10px;font-size:12px;color:#a8a29e">Eén klik en je hoort nooit meer iets van ons — geen bevestiging nodig.</p>
</div>`;
}

const stijl = `font-family:-apple-system,'Segoe UI',sans-serif;font-size:15px;line-height:1.65;color:#292524;max-width:560px`;

const ontsnap = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Zet de rauwe scan-bevindingen ("erg traag (4.2s laadtijd), verouderde
 * WordPress 6.2") om in een leesbare zin die over hún bedrijf gaat. Heeft Jos
 * zelf een observatie getypt (geen bevindingen-lijstje), dan gaat die voor. */
function menselijkeObservatie(p: Prospect): { zin: string; onderwerp?: string } {
  const o = p.observatie?.trim() ?? "";
  const lijkscan = /laadtijd|WordPress \d|jQuery|viewport|Elementor|readme|copyright|https/i.test(o);
  if (o && !lijkscan) return { zin: `<p>${ontsnap(o)}</p>` };

  const dode = o.match(/dode links? in de site \(o\.a\. ([^)]+)\)|dode link in de site \(([^)]+) geeft/i);
  if (dode) {
    const pad = (dode[1] ?? dode[2] ?? "").trim();
    return {
      onderwerp: `Er is iets kapot op je website`,
      zin: `<p>Wat me opviel: er zitten links op je site die nergens meer heen gaan${pad ? ` (bijvoorbeeld ${ontsnap(pad)})` : ""}. Bezoekers die daarop klikken krijgen een foutmelding — en die komen zelden terug om het nog eens te proberen.</p>`,
    };
  }
  if (/kapotte afbeelding/i.test(o))
    return {
      onderwerp: `Er is iets kapot op je website`,
      zin: `<p>Wat me opviel: een paar afbeeldingen op je site laden niet meer. Dat oogt klein, maar het is het eerste wat een bezoeker ziet — en het wekt de indruk dat er niet meer naar de site wordt omgekeken.</p>`,
    };
  const sec = o.match(/\((\d+[.,]\d)s laadtijd\)/)?.[1]?.replace(".", ",");
  const wpOud = /stokoude|verouderde WordPress/i.test(o);
  const jaar = o.match(/copyright[^,]*op (\d{4})/i)?.[1];
  const geenMobiel = /viewport ontbreekt/i.test(o);

  if (sec)
    return {
      onderwerp: `Je website doet er ${sec} seconden over`,
      zin: `<p>Wat me opviel: je site heeft er bij mij ${sec} seconden over gedaan om te laden. Dat klinkt als niks, maar het is precies de tijd waarin een bezoeker beslist om weg te klikken — vaak nog vóór hij je aanbod heeft gezien.</p>`,
    };
  if (geenMobiel)
    return {
      zin: `<p>Wat me opviel: op een telefoon toont je site de desktop-versie in het klein. Meer dan de helft van je bezoekers kijkt juist op zijn telefoon — die knijpen en schuiven nu om te lezen wat je doet.</p>`,
    };
  if (wpOud)
    return {
      zin: `<p>Wat me opviel: je site draait op een WordPress-versie die al een tijd geen updates meer heeft gehad. Dat is het soort ding waar niemand naar omkijkt — tot een plugin of een hack het ineens wél belangrijk maakt.</p>`,
    };
  if (jaar)
    return {
      zin: `<p>Wat me opviel: onderaan je site staat nog ${jaar}. Klein detail, maar bezoekers lezen daar onbewust "hier wordt niet meer naar omgekeken" — terwijl je bedrijf gewoon draait.</p>`,
    };
  if (o) return { zin: `<p>Ik heb even naar je site gekeken en zag een paar dingen die aandacht verdienen (techniek, snelheid) — niets dramatisch, wel dingen die je bezoekers merken.</p>` };
  return { zin: "" };
}

/** De drie outreach-mails: concreet over hún site, één vraag, één antwoord genoeg. */
export function maakOutreachMail(
  nummer: 1 | 2 | 3,
  p: Prospect
): { onderwerp: string; html: string } {
  const groet = `<p>Groet,<br>Jos Klijnhout<br>WordSwap — <a href="https://wordswap.nl" style="color:#6d28d9">wordswap.nl</a></p>`;
  const obs = menselijkeObservatie(p);

  if (nummer === 1) {
    return {
      onderwerp: obs.onderwerp ?? `Even over de website van ${p.bedrijf}`,
      html: `<div style="${stijl}">
<p>Hallo,</p>
<p>Ik kwam de website van ${ontsnap(p.bedrijf)} tegen en heb er even naar gekeken.</p>
${obs.zin}
<p>Veel ondernemers met een WordPress-site herkennen dit: je betaalt elke maand hosting, stelt updates uit omdat er vorige keer iets stuk ging, en voor twee zinnen tekst wacht je op je webbouwer. De site is er wel — maar hij kost aandacht in plaats van dat hij werk oplevert.</p>
<p>Wat wij doen: we maken een exacte kopie van je huidige site die dat allemaal niet meer nodig heeft. Je ziet hem eerst werkend, gratis. Alleen als je hem wilt houden betaal je (eenmalig, vanaf €250). Aanpassen doe je daarna zelf, door gewoon te typen wat er anders moet.</p>
<p>Eén reply met "laat maar zien" is genoeg — dan staat de kopie er binnen een paar dagen.</p>
<p>En herken je dit juist níét, en zit je ergernis ergens anders (of nergens)? Dat hoor ik eerlijk gezegd net zo graag — daar leer ik van.</p>
${groet}${afmeldRegel(p)}</div>`,
    };
  }

  if (nummer === 2) {
    return {
      onderwerp: `Wat kost de site van ${p.bedrijf} per maand?`,
      html: `<div style="${stijl}">
<p>Hallo,</p>
<p>Een tijdje terug stuurde ik je een berichtje — ik snap dat zoiets erbij inschiet, dus heel kort.</p>
<p>Reken eens mee: hosting, een paar betaalde plugins, af en toe de webbouwer voor iets kleins. Voor de meeste bedrijven tikt dat op naar tientallen euro's per maand — voor een site die verder gewoon stilstaat.</p>
<p>De kopie die wij maken kost €5 tot €20 per maand, alles inbegrepen, en aanpassen doe je zelf door het te typen. De kopie zelf maken we eerst gratis, zodat je kunt vergelijken zonder iets te beloven.</p>
<p>Eén reply met "laat maar zien" is genoeg.</p>
${groet}${afmeldRegel(p)}</div>`,
    };
  }

  return {
    onderwerp: `Laatste berichtje van mij`,
    html: `<div style="${stijl}">
<p>Hallo,</p>
<p>Dit is mijn laatste berichtje — ik ga je niet blijven mailen. Speelt het nu niet bij ${ontsnap(p.bedrijf)}: helemaal prima.</p>
<p>Bewaar dit mailtje eventueel voor het moment dat een update iets sloopt, de hostingfactuur weer eens irriteert of je webbouwer niet reageert. De gratis site-check blijft staan: <a href="https://wordswap.nl" style="color:#6d28d9">wordswap.nl</a>.</p>
<p>Liever eerst rustig kijken hoe het werkt, zonder gesprek? Ik geef regelmatig een gratis webinar van een half uur: <a href="https://wordswap.nl/webinar" style="color:#6d28d9">wordswap.nl/webinar</a>.</p>
<p>Veel succes met de zaak!</p>
${groet}${afmeldRegel(p)}</div>`,
  };
}
