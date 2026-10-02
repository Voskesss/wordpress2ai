/**
 * Filmpjes in mails (outreach en losse Mailer). Een video speelt in vrijwel
 * geen mailprogramma af, dus de mail krijgt een stilstaand beeld met een
 * afspeelknop dat doorlinkt naar /video/<naam> op wordswap.nl, waar het
 * filmpje direct speelt. Daaronder altijd een tekstlink: Outlook laat beelden
 * vaak pas na een klik zien. Je typt [video:whatsapp] in de tekst (Jos, 02-10-2026).
 */

export const MAIL_VIDEOS = {
  whatsapp: {
    titel: "Je website aanpassen via WhatsApp",
    uitleg: "App je website, net als een collega. Je ziet het eerst als concept, en met \"ja\" staat het live.",
    bestand: "/video/wordswap-whatsapp.mp4",
    beeld: "/video/wordswap-whatsapp-voorbeeld.jpg",
    seconden: 17,
  },
  "website-typen": {
    titel: "Je website aanpassen door te typen",
    uitleg: "Foto vervangen, pagina erbij, nieuwsbericht plaatsen: je typt wat er anders moet, en het staat klaar.",
    bestand: "/video/wordswap-website-typen.mp4",
    beeld: "/video/wordswap-website-typen-voorbeeld.jpg",
    seconden: 20,
  },
} as const;

export type MailVideoNaam = keyof typeof MAIL_VIDEOS;

const SITE = "https://www.wordswap.nl";

/** Een alinea die alleen uit [video:naam] bestaat. */
export const VIDEO_PATROON = /^\[video:\s*([a-z-]+)\s*\]$/i;

export const isMailVideo = (naam: string): naam is MailVideoNaam => Object.hasOwn(MAIL_VIDEOS, naam);

/** Het blok in de mail, of null als de naam niet bestaat (dan blijft de tekst staan). */
export function videoBlokHtml(naam: string): string | null {
  const n = naam.toLowerCase();
  if (!isMailVideo(n)) return null;
  const v = MAIL_VIDEOS[n];
  const link = `${SITE}/video/${n}`;
  return `<a href="${link}" style="display:block;margin:20px 0 6px;text-decoration:none"><img src="${SITE}${v.beeld}" alt="▶ Bekijk de video: ${v.titel} (${v.seconden} sec)" width="560" style="display:block;width:100%;max-width:560px;height:auto;border-radius:8px;border:0"></a>
<p style="margin:0 0 20px"><a href="${link}" style="color:#245747;font-weight:600">▶ Bekijk de video (${v.seconden} sec)</a></p>`;
}
