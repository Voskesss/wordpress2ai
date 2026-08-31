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
<p>Ben je eigenlijk wel toe aan iets nieuws? Dan ontwerpen we ook een compleet nieuwe website (vanaf €250), met dezelfde AI-koppeling erachter — <a href="https://wordswap.nl/nieuwe-website" style="color:#6d28d9">meer daarover</a>.</p>
<p>Als je nieuwsgierig bent kun je op <a href="https://wordswap.nl/demo" style="color:#6d28d9">wordswap.nl/demo</a> gratis zelf proberen hoe het werkt. Wil je liever eerst rustig horen wat dit voor jou betekent? Dan geef ik regelmatig een gratis online webinar van een half uur — aanmelden kan op <a href="https://wordswap.nl/webinar" style="color:#6d28d9">wordswap.nl/webinar</a>. Reageren op deze mail mag natuurlijk ook gewoon.</p>
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
<p>En mocht je liever een frisse, compleet nieuwe website willen: dat kan net zo goed (vanaf €250, inclusief ontwerp).</p>
<p>Eén reply met "ja, laat maar zien" is genoeg.</p>
<p>Liever eerst vrijblijvend meekijken? In een gratis webinar van een half uur laat ik precies zien hoe het werkt — data en aanmelden op <a href="https://wordswap.nl/webinar" style="color:#6d28d9">wordswap.nl/webinar</a>.</p>
${groet}${afmeldRegel(p)}</div>`,
    };
  }

  return {
    onderwerp: `Laatste berichtje van mij`,
    html: `<div style="${stijl}">
<p>Hallo,</p>
<p>Dit is mijn laatste berichtje — ik wil niet blijven mailen. Als een snellere website zonder onderhoud nu niet speelt bij ${ontsnap(p.bedrijf)}: helemaal prima, dan laat ik je met rust.</p>
<p>Mocht het later ooit relevant worden (bijvoorbeeld als de hostingfactuur of een plugin-probleem weer eens irriteert): je vindt ons op <a href="https://wordswap.nl" style="color:#6d28d9">wordswap.nl</a>. De gratis site-check blijft staan, en vrijblijvend meekijken kan altijd via een van onze gratis webinars: <a href="https://wordswap.nl/webinar" style="color:#6d28d9">wordswap.nl/webinar</a>.</p>
<p>Veel succes met de zaak!</p>
${groet}${afmeldRegel(p)}</div>`,
  };
}
