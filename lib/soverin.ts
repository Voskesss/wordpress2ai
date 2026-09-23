/**
 * Alleen-lezen koppeling met Jos' Soverin-postvak, uitsluitend om leadcontact
 * bij te houden: reacties van leads in de inbox, en mails die Jos zelf vanuit
 * Soverin aan een lead stuurde (map Verzonden). Er wordt nooit iets gemarkeerd,
 * verplaatst of verwijderd, en er wordt alleen gezocht op de e-mailadressen van
 * bekende leads — de rest van het postvak blijft buiten beeld.
 *
 * Sleutels: SOVERIN_IMAP_USER (volledig e-mailadres) en SOVERIN_IMAP_PASSWORD
 * in Vercel; optioneel SOVERIN_IMAP_HOST (standaard imap.soverin.net).
 */

import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

export type PostItem = {
  email: string; // leadadres (kleine letters)
  richting: "uit" | "in";
  bron: "soverin-inbox" | "soverin-verzonden";
  onderwerp: string | null;
  fragment: string | null;
  messageId: string | null;
  datum: Date;
};

export function soverinIngesteld(): boolean {
  return Boolean(process.env.SOVERIN_IMAP_USER && process.env.SOVERIN_IMAP_PASSWORD);
}

const MAX_PER_ADRES = 20;

/**
 * De eigen tekst van een binnengekomen mail, uit de ruwe bron.
 *
 * Apart en geëxporteerd, zodat een test een échte mail door precies dit pad
 * kan halen. Mailparser haalt zelf al tekst uit een mail die alleen HTML
 * bevat; de terugval hieronder is alleen voor het geval dat dat niet lukt.
 * Het echte gat zat in fragmentVan: wie zijn antwoord tússen onze
 * aangehaalde tekst typt, heeft alleen maar regels met ">" ervoor, en die
 * werden allemaal weggegooid. Zo werd "geen interesse" een warme lead.
 */
export async function fragmentUitBron(bron: Buffer | string): Promise<string | null> {
  const geparsed = await simpleParser(bron);
  const tekst =
    geparsed.text ||
    (typeof geparsed.html === "string"
      ? geparsed.html
          .replace(/<style[\s\S]*?<\/style>/gi, " ")
          .replace(/<br\s*\/?>|<\/p>|<\/div>/gi, "\n")
          .replace(/<[^>]+>/g, " ")
          .replace(/&nbsp;/g, " ")
          .replace(/[ \t]+/g, " ")
      : "");
  return fragmentVan(tekst);
}

/** Eigen tekst uit een reply halen: aanhalingen ("> ...") en de Op...schreef-regel eraf. */
/**
 * Hoeveel van een mail we bewaren voor de tijdlijn.
 *
 * Stond op 400 en dat was te kort: je las de eerste alinea en miste net het
 * stuk waar het antwoord in stond. Het is bewust GEEN hele mail, want dan
 * sleep je de hele antwoordreeks mee en wordt de tijdlijn onleesbaar. De
 * aanhalingen worden er hierboven al afgeknipt, dus dit is alleen wat iemand
 * zelf geschreven heeft.
 */
const FRAGMENT_TEKENS = 1200;

function fragmentVan(tekst: string | undefined): string | null {
  if (!tekst) return null;
  const regels = tekst.split("\n");
  const eigen = regels
    .filter((r) => !r.trimStart().startsWith(">"))
    .join("\n")
    .split(/\nOp .{5,80} schreef .{2,80}:?\s*$/m)[0]
    .trim();
  if (eigen) return eigen.slice(0, FRAGMENT_TEKENS);
  // Niets ongequote over: dan typte de afzender zijn antwoord tussen onze
  // aangehaalde tekst (oudere Outlook en veel telefoons doen dat). Dan is de
  // aanhaling zélf zijn bericht. De ">"-tekens eraf en doorgeven; onze eigen
  // zinnen worden bij het herkennen alsnog weggeknipt (lib/afmelding).
  const ontquote = regels
    .map((r) => r.replace(/^\s*(>\s?)+/, ""))
    .join("\n")
    .trim();
  return ontquote ? ontquote.slice(0, FRAGMENT_TEKENS) : null;
}

async function zoekInMap(
  client: ImapFlow,
  map: string,
  richting: "uit" | "in",
  adressen: string[],
  sinds: Date | null,
): Promise<PostItem[]> {
  const items: PostItem[] = [];
  const lock = await client.getMailboxLock(map, { readOnly: true });
  try {
    for (const adres of adressen) {
      const zoekOp = richting === "in" ? { from: adres } : { to: adres };
      const uids = await client.search({ ...zoekOp, ...(sinds ? { since: sinds } : {}) }, { uid: true });
      if (!uids || uids.length === 0) continue;
      for (const uid of uids.slice(-MAX_PER_ADRES)) {
        const bericht = await client.fetchOne(String(uid), { envelope: true, source: true }, { uid: true });
        if (!bericht || !bericht.envelope) continue;
        let fragment: string | null = null;
        try {
          if (bericht.source) fragment = await fragmentUitBron(bericht.source);
        } catch {
          // Zonder fragment is de tijdlijnregel nog steeds bruikbaar
        }
        items.push({
          email: adres,
          richting,
          bron: richting === "in" ? "soverin-inbox" : "soverin-verzonden",
          onderwerp: bericht.envelope.subject ?? null,
          fragment,
          messageId: bericht.envelope.messageId ?? null,
          datum: bericht.envelope.date ? new Date(bericht.envelope.date) : new Date(),
        });
      }
    }
  } finally {
    lock.release();
  }
  return items;
}

/**
 * Mappen indelen: reacties kunnen overal staan (Jos ruimt zijn inbox op naar
 * submappen en het archief), dus we doorzoeken alles behalve Verzonden,
 * Concepten, Spam en Prullenbak. Verzonden is apart de bron voor eigen mails.
 */
async function mappenIndeling(client: ImapFlow): Promise<{ inMappen: string[]; uitMap: string | null }> {
  try {
    const mappen = await client.list();
    const uitMap =
      mappen.find((m) => m.specialUse === "\\Sent")?.path ??
      mappen.find((m) => ["Sent", "Sent Messages", "INBOX.Sent", "Verzonden", "INBOX.Verzonden"].includes(m.path))?.path ??
      null;
    const overslaan = new Set(["\\Sent", "\\Drafts", "\\Junk", "\\Trash"]);
    const inMappen = mappen
      .filter((m) => !overslaan.has(m.specialUse ?? "") && m.path !== uitMap && m.path !== "Notes")
      .map((m) => m.path);
    return { inMappen, uitMap };
  } catch {
    return { inMappen: ["INBOX"], uitMap: null };
  }
}

/**
 * Haalt voor de opgegeven leadadressen de post op: reacties (alle mappen) en
 * eigen verzonden mails. sinds = null doorzoekt de hele geschiedenis (backfill).
 */
export async function haalLeadPost(adressen: string[], sinds: Date | null): Promise<PostItem[]> {
  if (!soverinIngesteld() || adressen.length === 0) return [];
  const schoon = [...new Set(adressen.map((a) => a.trim().toLowerCase()).filter((a) => a.includes("@")))];
  if (schoon.length === 0) return [];

  const client = new ImapFlow({
    host: process.env.SOVERIN_IMAP_HOST ?? "imap.soverin.net",
    port: 993,
    secure: true,
    auth: { user: process.env.SOVERIN_IMAP_USER!, pass: process.env.SOVERIN_IMAP_PASSWORD! },
    logger: false,
  });

  await client.connect();
  try {
    const { inMappen, uitMap } = await mappenIndeling(client);
    const items: PostItem[] = [];
    for (const map of inMappen) {
      try {
        items.push(...(await zoekInMap(client, map, "in", schoon, sinds)));
      } catch {
        // Een map die niet te openen is (bijv. alleen een houder) slaan we over
      }
    }
    if (uitMap) items.push(...(await zoekInMap(client, uitMap, "uit", schoon, sinds)));
    return items;
  } finally {
    await client.logout().catch(() => client.close());
  }
}
