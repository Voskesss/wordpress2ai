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

/** Eigen tekst uit een reply halen: aanhalingen ("> ...") en de Op...schreef-regel eraf. */
function fragmentVan(tekst: string | undefined): string | null {
  if (!tekst) return null;
  const eigen = tekst
    .split("\n")
    .filter((r) => !r.trimStart().startsWith(">"))
    .join("\n")
    .split(/\nOp .{5,80} schreef .{2,80}:?\s*$/m)[0]
    .trim();
  return eigen ? eigen.slice(0, 400) : null;
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
          if (bericht.source) fragment = fragmentVan((await simpleParser(bericht.source)).text);
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

/** De map Verzonden opzoeken (via de special-use-vlag, met nette terugval). */
async function verzondenMap(client: ImapFlow): Promise<string | null> {
  try {
    const mappen = await client.list();
    const special = mappen.find((m) => m.specialUse === "\\Sent");
    if (special) return special.path;
    const kandidaten = ["Sent", "Sent Messages", "INBOX.Sent", "Verzonden", "INBOX.Verzonden"];
    const opNaam = mappen.find((m) => kandidaten.includes(m.path));
    return opNaam?.path ?? null;
  } catch {
    return null;
  }
}

/**
 * Haalt voor de opgegeven leadadressen de post op: reacties (inbox) en eigen
 * verzonden mails. sinds = null doorzoekt de hele geschiedenis (backfill).
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
    const items = await zoekInMap(client, "INBOX", "in", schoon, sinds);
    const verzonden = await verzondenMap(client);
    if (verzonden) items.push(...(await zoekInMap(client, verzonden, "uit", schoon, sinds)));
    return items;
  } finally {
    await client.logout().catch(() => client.close());
  }
}
