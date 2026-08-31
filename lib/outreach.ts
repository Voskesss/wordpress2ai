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
  return `<p style="margin-top:28px;font-size:12px;color:#a8a29e">Je ontvangt dit bericht eenmalig omdat ik je website bekeek. Liever geen mail meer van ons? <a href="${link}" style="color:#a8a29e">Eén klik en je hoort nooit meer iets</a>.</p>`;
}

const stijl = `font-family:-apple-system,'Segoe UI',sans-serif;font-size:15px;line-height:1.65;color:#292524;max-width:560px`;

const ontsnap = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** De drie outreach-mails: persoonlijk, kort en niet opdringerig. */
export function maakOutreachMail(
  nummer: 1 | 2 | 3,
  p: Prospect
): { onderwerp: string; html: string } {
  const observatie = p.observatie
    ? `<p>${ontsnap(p.observatie)}</p>`
    : "";
  const groet = `<p>Groet,<br>Jos Klijnhout<br>WordSwap — <a href="https://wordswap.nl" style="color:#6d28d9">wordswap.nl</a></p>`;

  if (nummer === 1) {
    return {
      onderwerp: `Even over de website van ${p.bedrijf}`,
      html: `<div style="${stijl}">
<p>Hallo,</p>
<p>Ik kwam de website van ${ontsnap(p.bedrijf)} tegen (${ontsnap(p.website)}) en heb er even naar gekeken.</p>
${observatie}
<p>Wij doen iets vrij nieuws: we zetten WordPress-sites om naar een razendsnelle website zonder onderhoud — geen updates, plugins of hostinggedoe meer. Aanpassen doe je daarna door het gewoon te typen ("zet de openingstijden op zaterdag tot 17:00") en onze AI voert het uit.</p>
<p>Het mooie: je ziet eerst de complete kopie van je site, en alleen als je tevreden bent betaal je (eenmalig €250–€750). Niet goed = niets betalen.</p>
<p>Als je nieuwsgierig bent: op <a href="https://wordswap.nl/demo" style="color:#6d28d9">wordswap.nl/demo</a> kun je het gratis zelf proberen op een oefensite. En reageren op deze mail mag natuurlijk ook gewoon.</p>
${groet}${afmeldRegel(p)}</div>`,
    };
  }

  if (nummer === 2) {
    return {
      onderwerp: `Korte vraag over ${p.website}`,
      html: `<div style="${stijl}">
<p>Hallo,</p>
<p>Een tijdje terug stuurde ik je een berichtje over de website van ${ontsnap(p.bedrijf)} — ik snap dat zoiets er makkelijk bij inschiet.</p>
<p>Daarom één simpele vraag: zou je willen zien hoe jouw site eruitziet als snelle, onderhoudsvrije versie? Die kopie maken we gratis en vrijblijvend — je betaalt alleen als je hem wilt houden.</p>
<p>Eén reply met "ja, laat maar zien" is genoeg.</p>
${groet}${afmeldRegel(p)}</div>`,
    };
  }

  return {
    onderwerp: `Laatste berichtje van mij`,
    html: `<div style="${stijl}">
<p>Hallo,</p>
<p>Dit is mijn laatste berichtje — ik wil niet blijven mailen. Als een snellere website zonder onderhoud nu niet speelt bij ${ontsnap(p.bedrijf)}: helemaal prima, dan laat ik je met rust.</p>
<p>Mocht het later ooit relevant worden (bijvoorbeeld als de hostingfactuur of een plugin-probleem weer eens irriteert): je vindt ons op <a href="https://wordswap.nl" style="color:#6d28d9">wordswap.nl</a>. De gratis site-check blijft staan.</p>
<p>Veel succes met de zaak!</p>
${groet}${afmeldRegel(p)}</div>`,
  };
}
