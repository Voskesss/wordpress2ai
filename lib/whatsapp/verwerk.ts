import { and, desc, eq, gt, inArray, isNotNull, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  changes,
  sites,
  whatsappBerichten,
  whatsappKoppelingen,
} from "@/db/schema";
import { isBeheerderId } from "@/lib/auth";
import { CF_SUBDOMEIN } from "@/lib/cloudflare";
import { readChatResponse } from "@/lib/chat-response";
import {
  haalMediaOp,
  markeerGelezen,
  stuurKeuzelijst,
  stuurKnoppen,
  stuurTekst,
} from "./api";
import {
  KEUZE,
  KNOP_PUBLICEER,
  KNOP_WEGGOOIEN,
  conceptCommando,
  koppelcodeUit,
  leesKnop,
  paginaVoorConcept,
  splitsKeuzes,
  voegSamen,
  type Binnenkomend,
} from "./berichten";

/** Hoe lang na binnenkomst we nog een chatbeurt mogen starten. De webhook-
 * functie mag 800 s draaien; de chat zelf neemt daarvan tot ~720 s plus
 * opslaan. Wie langer op een bezette website moet wachten, krijgt een eerlijk
 * "stuur het zo nog eens" in plaats van een beurt die halverwege wordt afgekapt. */
const UITERLIJK_START_MS = 45_000;
/** Zo lang wachten we op een volgend bericht voordat we aan de slag gaan:
 * vijf foto's in WhatsApp komen binnen als vijf losse berichten. */
const BUNDEL_MS = 8_000;
const MAX_FOTOS = 10;

type Rij = typeof whatsappBerichten.$inferSelect;
type Site = typeof sites.$inferSelect;

const slaap = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function zetStatus(ids: number[], status: Rij["status"], siteId?: number) {
  if (!ids.length) return;
  await db
    .update(whatsappBerichten)
    .set({ status, ...(siteId ? { siteId } : {}) })
    .where(inArray(whatsappBerichten.id, ids));
}

/** Alles wat één webhook-aanroep binnenbracht, per afzender afhandelen. */
export async function verwerkWebhook(nieuw: Rij[], gestart: number) {
  const perTelefoon = new Map<string, Rij[]>();
  for (const r of nieuw)
    perTelefoon.set(r.telefoon, [...(perTelefoon.get(r.telefoon) ?? []), r]);
  await Promise.all(
    [...perTelefoon].map(([telefoon, rijen]) =>
      verwerkAfzender(telefoon, rijen, gestart).catch((e) =>
        console.error(`WhatsApp-verwerking ${telefoon.slice(-4)}:`, e),
      ),
    ),
  );
}

async function verwerkAfzender(telefoon: string, rijen: Rij[], gestart: number) {
  const laatste = rijen.at(-1);
  if (laatste) void markeerGelezen(laatste.waMessageId).catch(() => {});

  // 1. Koppelen gaat vóór alles: dan is het nummer nog niet bekend
  for (const rij of rijen.filter((r) => r.soort === "tekst")) {
    const code = koppelcodeUit(rij.inhoud);
    if (!code) continue;
    await koppel(telefoon, code, rij);
    rijen = rijen.filter((r) => r.id !== rij.id);
  }
  if (!rijen.length) return;

  const [koppeling] = await db
    .select()
    .from(whatsappKoppelingen)
    .where(eq(whatsappKoppelingen.telefoon, telefoon));
  if (!koppeling) return nietGekoppeld(telefoon, rijen);
  const [site] = await db.select().from(sites).where(eq(sites.id, koppeling.siteId));
  if (!site || site.isDemo || !site.whatsappActief) {
    await zetStatus(rijen.map((r) => r.id), "genegeerd", site?.id);
    await stuurTekst(
      telefoon,
      "WhatsApp staat voor je website op dit moment niet aan. Je kunt je wijzigingen gewoon in het WordSwap-portaal doorgeven.",
    );
    return;
  }

  if (site.status === "gepauzeerd" || site.status === "opgezegd") {
    await zetStatus(rijen.map((r) => r.id), "genegeerd", site.id);
    await stuurTekst(
      telefoon,
      "Wijzigingen doorgeven kan op dit moment niet: je website staat niet actief. Neem contact op met WordSwap.",
    );
    return;
  }
  // Namens wie: de eigenaar. Een koppeling door een beheerder (Jos) werkt ook
  // namens de eigenaar, zodat de chat en het portaal hetzelfde gesprek tonen.
  const eigenaar =
    koppeling.clerkUserId === site.clerkUserId ||
    (await isBeheerderId(koppeling.clerkUserId))
      ? site.clerkUserId
      : null;
  if (!eigenaar) {
    await zetStatus(rijen.map((r) => r.id), "genegeerd", site.id);
    await stuurTekst(telefoon, "Deze koppeling hoort niet (meer) bij de eigenaar van de website. Koppel je telefoon opnieuw in het portaal.");
    return;
  }

  // 2. Knoppen en getypte "publiceer"/"weggooien" direct uitvoeren
  for (const rij of rijen) {
    const commando = rij.soort === "tekst" ? conceptCommando(rij.inhoud) : null;
    if (rij.soort !== "knop" && !commando) continue;
    const knop = commando ? { actie: commando, changeId: null } : leesKnop(rij.inhoud);
    rijen = rijen.filter((r) => r.id !== rij.id);
    if (!(await claim([rij.id])).length) continue;
    try {
      if (knop) await voerConceptActieUit(telefoon, eigenaar, site, knop);
      await zetStatus([rij.id], "klaar", site.id);
    } catch (e) {
      console.error("WhatsApp-knop:", e);
      await zetStatus([rij.id], "mislukt", site.id);
      await stuurTekst(telefoon, "Dat lukte niet. Probeer het zo nog eens, of doe het in het portaal.");
    }
  }
  if (!rijen.length) return;

  // 3. Even wachten op meer berichten; de láátste aanroep neemt alles mee
  await slaap(BUNDEL_MS);
  const nieuwer = await db
    .select({ id: whatsappBerichten.id })
    .from(whatsappBerichten)
    .where(
      and(
        eq(whatsappBerichten.telefoon, telefoon),
        eq(whatsappBerichten.status, "wacht"),
        gt(
          whatsappBerichten.ontvangen,
          sql`now() - make_interval(secs => ${(BUNDEL_MS - 1000) / 1000})`,
        ),
      ),
    )
    .limit(1);
  if (nieuwer.length) return;
  const bundel = await claimAlleWachtende(telefoon);
  if (bundel.length) await chatBeurt(telefoon, eigenaar, site, bundel, gestart);
}

/** Atomisch overnemen: bij gelijktijdige aanroepen krijgt er maar één de rij. */
function claim(ids: number[]) {
  return db
    .update(whatsappBerichten)
    .set({ status: "bezig" })
    .where(and(inArray(whatsappBerichten.id, ids), eq(whatsappBerichten.status, "wacht")))
    .returning();
}

async function claimAlleWachtende(telefoon: string) {
  const rijen = await db
    .update(whatsappBerichten)
    .set({ status: "bezig" })
    .where(
      and(
        eq(whatsappBerichten.telefoon, telefoon),
        eq(whatsappBerichten.status, "wacht"),
        ne(whatsappBerichten.soort, "knop"),
      ),
    )
    .returning();
  return rijen.sort((a, b) => a.id - b.id);
}

async function koppel(telefoon: string, code: string, rij: Rij) {
  // Raden afremmen: na vijf MISLUKTE koppelpogingen binnen een uur even niet.
  // Gelukte pogingen en dit bericht zelf tellen niet mee.
  const pogingen = await db
    .select({ id: whatsappBerichten.id })
    .from(whatsappBerichten)
    .where(
      and(
        eq(whatsappBerichten.telefoon, telefoon),
        eq(whatsappBerichten.status, "genegeerd"),
        ne(whatsappBerichten.id, rij.id),
        sql`${whatsappBerichten.inhoud} ~* '^\\s*koppel'`,
        gt(whatsappBerichten.ontvangen, sql`now() - interval '1 hour'`),
      ),
    );
  const [koppeling] =
    pogingen.length >= 5
      ? []
      : await db
          .select()
          .from(whatsappKoppelingen)
          .where(
            and(
              eq(whatsappKoppelingen.koppelcode, code),
              gt(whatsappKoppelingen.codeVerloopt, sql`now()`),
            ),
          );
  if (!koppeling) {
    await zetStatus([rij.id], "genegeerd");
    await stuurTekst(
      telefoon,
      pogingen.length >= 5
        ? "Te veel koppelpogingen. Probeer het over een uur opnieuw."
        : "Die code klopt niet of is verlopen. Maak in het WordSwap-portaal een nieuwe code aan en stuur die opnieuw.",
    );
    return;
  }
  // Een nummer hoort bij één website: een oude koppeling vervalt
  await db
    .delete(whatsappKoppelingen)
    .where(and(eq(whatsappKoppelingen.telefoon, telefoon), ne(whatsappKoppelingen.id, koppeling.id)));
  await db
    .update(whatsappKoppelingen)
    .set({ telefoon, koppelcode: null, codeVerloopt: null, gekoppeldOp: new Date() })
    .where(eq(whatsappKoppelingen.id, koppeling.id));
  await zetStatus([rij.id], "klaar", koppeling.siteId);
  const [site] = await db.select().from(sites).where(eq(sites.id, koppeling.siteId));
  await stuurTekst(
    telefoon,
    `Gelukt! Dit nummer is gekoppeld aan ${site?.naam ?? "je website"}.\n\nStuur me voortaan gewoon een appje: een tekst, foto's, een pdf of een spraakbericht. Ik maak er een concept van, en jij beslist met één tik of het live gaat.`,
  );
}

async function nietGekoppeld(telefoon: string, rijen: Rij[]) {
  // Eén keer uitleggen is genoeg; niet op elk bericht opnieuw antwoorden
  const [eerder] = await db
    .select({ id: whatsappBerichten.id })
    .from(whatsappBerichten)
    .where(
      and(
        eq(whatsappBerichten.telefoon, telefoon),
        eq(whatsappBerichten.status, "genegeerd"),
        gt(whatsappBerichten.ontvangen, sql`now() - interval '6 hours'`),
      ),
    )
    .limit(1);
  await zetStatus(rijen.map((r) => r.id), "genegeerd");
  if (!eerder)
    await stuurTekst(
      telefoon,
      "Hoi! Dit nummer is nog niet gekoppeld aan een website. Log in op het WordSwap-portaal, kies bij je website voor WhatsApp koppelen en stuur de code die je daar krijgt.",
    );
}

/** Een route van het portaal aanroepen namens de eigenaar, binnen deze
 * server: dezelfde code, hetzelfde slot, dezelfde controles als de browser. */
async function roepRouteAan(
  route: "chat" | "publiceer" | "verwerp",
  eigenaar: string,
  body: FormData | object,
) {
  const { INTERN_KOP, maakInternLabel } = await import("@/lib/intern-verzoek");
  const headers: Record<string, string> = { [INTERN_KOP]: maakInternLabel(eigenaar) };
  if (!(body instanceof FormData)) headers["Content-Type"] = "application/json";
  const req = new Request(`https://whatsapp.intern/api/${route}`, {
    method: "POST",
    headers,
    body: body instanceof FormData ? body : JSON.stringify(body),
  });
  const mod =
    route === "chat"
      ? await import("@/app/api/chat/route")
      : route === "publiceer"
        ? await import("@/app/api/publiceer/route")
        : await import("@/app/api/verwerp/route");
  return mod.POST(req);
}

async function voerConceptActieUit(
  telefoon: string,
  eigenaar: string,
  site: Site,
  knop: { actie: "publiceer" | "weggooien"; changeId: number | null },
) {
  // Getypt commando: het openstaande concept van deze site
  const [concept] = await db
    .select()
    .from(changes)
    .where(
      knop.changeId
        ? eq(changes.id, knop.changeId)
        : and(
            eq(changes.siteId, site.id),
            inArray(changes.status, ["concept", "publicatie_mislukt"]),
          ),
    )
    .orderBy(desc(changes.id))
    .limit(1);
  if (!concept || concept.siteId !== site.id) {
    await stuurTekst(telefoon, "Er staat op dit moment geen concept klaar.");
    return;
  }
  if (knop.actie === "publiceer") {
    if (concept.status === "gepubliceerd") {
      await stuurTekst(telefoon, "Dit concept staat al live.");
      return;
    }
    await stuurTekst(telefoon, "Ik zet het live, momentje...");
    const res = await roepRouteAan("publiceer", eigenaar, { changeId: concept.id });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (res.ok && data.ok) {
      const adres = site.domein ? `https://${site.domein.replace(/^https?:\/\//, "")}` : "";
      await stuurTekst(telefoon, `Staat live! 🎉${adres ? `\n${adres}` : ""}`);
    } else {
      await stuurTekst(telefoon, foutTekst(res.status, data));
    }
    return;
  }
  if (concept.status !== "concept") {
    await stuurTekst(telefoon, "Dit concept is al gepubliceerd of weggegooid.");
    return;
  }
  const res = await roepRouteAan("verwerp", eigenaar, { changeId: concept.id });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  await stuurTekst(
    telefoon,
    res.ok && data.ok ? "Concept weggegooid. Je website is niet veranderd." : foutTekst(res.status, data),
  );
}

function foutTekst(status: number, data: Record<string, unknown>) {
  if (typeof data.melding === "string") return data.melding;
  if (status === 409) return "Dit concept is al gepubliceerd of weggegooid.";
  if (status === 403) return "Je website staat op dit moment niet actief. Neem contact op met WordSwap.";
  if (status === 404 || status === 410) return "Dit concept bestaat niet meer.";
  return "Dat lukte niet. Probeer het zo nog eens, of doe het in het portaal.";
}

async function chatBeurt(
  telefoon: string,
  eigenaar: string,
  site: Site,
  rijen: Rij[],
  gestart: number,
) {
  const ids = rijen.map((r) => r.id);
  try {
    const opmerkingen: string[] = [];

    // Spraak eerst omzetten, zodat het als gewone tekst meegaat
    for (const rij of rijen.filter((r) => r.soort === "spraak" && r.mediaId)) {
      if (!process.env.OPENAI_API_KEY) {
        opmerkingen.push("Spraakberichten kan ik nog niet verwerken. Wil je het even typen?");
        continue;
      }
      const { spraakNaarTekst } = await import("./spraak");
      const audio = await haalMediaOp(rij.mediaId!);
      const { tekst, seconden } = await spraakNaarTekst(audio.data, rij.mimeType ?? audio.mimeType);
      rij.inhoud = tekst;
      await db.update(whatsappBerichten).set({ inhoud: tekst }).where(eq(whatsappBerichten.id, rij.id));
      const { registreerAiKosten } = await import("@/lib/kosten");
      await registreerAiKosten(site.id, "chat", { kostenUsd: (seconden / 60) * 0.006 }).catch(() => {});
      if (tekst) await stuurTekst(telefoon, `🎙️ Ik verstond: “${tekst}”`);
    }

    const fotoRijen = rijen.filter((r) => r.soort === "foto" && r.mediaId);
    if (fotoRijen.length > MAX_FOTOS)
      opmerkingen.push(`Ik neem de eerste ${MAX_FOTOS} foto's mee. Stuur de rest daarna in een volgend bericht.`);
    const fotos: File[] = [];
    for (const [i, rij] of fotoRijen.slice(0, MAX_FOTOS).entries()) {
      const { data, mimeType } = await haalMediaOp(rij.mediaId!);
      const ext = /png/.test(mimeType) ? "png" : /webp/.test(mimeType) ? "webp" : "jpg";
      fotos.push(new File([new Uint8Array(data)], `whatsapp-foto-${i + 1}.${ext}`, { type: mimeType }));
    }

    // Pdf's worden door de chat nog niet verwerkt (ook in het portaal niet);
    // dat komt als aparte wijziging. Tot die tijd eerlijk zeggen.
    if (rijen.some((r) => r.soort === "document"))
      opmerkingen.push("Pdf's en andere documenten kan ik via WhatsApp nog niet op je site zetten. Dat komt binnenkort.");
    if (rijen.some((r) => r.soort === "anders"))
      opmerkingen.push("Video's, stickers en locaties kan ik via WhatsApp nog niet verwerken. Een video kun je in het portaal meesturen.");

    const bericht = voegSamen(
      rijen.filter((r) => r.soort !== "anders" && r.soort !== "document"),
    );
    if (opmerkingen.length) await stuurTekst(telefoon, opmerkingen.join("\n\n"));
    if (!bericht.trim()) {
      await zetStatus(ids, "klaar", site.id);
      return;
    }

    const form = new FormData();
    form.set("siteId", String(site.id));
    form.set("bericht", bericht);
    for (const f of fotos) form.append("afbeelding", f);

    let res = await roepRouteAan("chat", eigenaar, form);
    // Loopt er al een bewerking (bijvoorbeeld in het portaal)? Even wachten,
    // maar niet zo lang dat de chatbeurt daarna geen tijd meer heeft.
    while (res.status === 409) {
      const data = (await res.clone().json().catch(() => ({}))) as { slot?: boolean };
      if (!data.slot) break;
      if (Date.now() - gestart > UITERLIJK_START_MS) {
        await zetStatus(ids, "genegeerd", site.id);
        await stuurTekst(telefoon, "Er wordt nog aan je website gewerkt. Stuur je bericht over een paar minuten nog eens, dan pak ik het op.");
        return;
      }
      await slaap(10_000);
      res = await roepRouteAan("chat", eigenaar, form);
    }
    const uitkomst = await readChatResponse(res, () => {});
    await stuurAntwoord(telefoon, site, uitkomst);
    await zetStatus(ids, "klaar", site.id);
  } catch (e) {
    console.error("WhatsApp-chatbeurt:", e);
    await zetStatus(ids, "mislukt", site.id);
    const melding = e instanceof Error && e.message && !/^(WhatsApp|Media|Whisper)/.test(e.message)
      ? e.message
      : "Er ging iets mis; je bericht is niet verwerkt. Probeer het zo nog eens.";
    await stuurTekst(telefoon, melding).catch(() => {});
  }
}

async function stuurAntwoord(
  telefoon: string,
  site: Site,
  uitkomst: { reply: string; changeId?: number | null; bestanden?: string[] },
) {
  const { schoon, keuzes } = splitsKeuzes(uitkomst.reply);
  if (keuzes.length) {
    await stuurKeuzelijst(
      telefoon,
      schoon || "Wat wil je?",
      "Kies een antwoord",
      keuzes.map((k) => ({
        id: `${KEUZE}${k}`,
        titel: k,
        omschrijving: k.length > 24 ? k : undefined,
      })),
    );
  } else if (schoon.trim()) {
    await stuurTekst(telefoon, schoon);
  }
  if (uitkomst.changeId && site.siteSlug) {
    const url = `https://wv-${site.siteSlug}.${CF_SUBDOMEIN}.workers.dev${paginaVoorConcept(uitkomst.bestanden)}`;
    await stuurKnoppen(telefoon, `Bekijk het concept:\n${url}\n\nNog niet goed? App me gewoon wat er anders moet.`, [
      { id: `${KNOP_PUBLICEER}${uitkomst.changeId}`, titel: "Publiceren" },
      { id: `${KNOP_WEGGOOIEN}${uitkomst.changeId}`, titel: "Weggooien" },
    ]);
  }
}

/** Voor het portaal: gekoppelde nummers van een site. */
export function koppelingenVanSite(siteId: number) {
  return db
    .select()
    .from(whatsappKoppelingen)
    .where(and(eq(whatsappKoppelingen.siteId, siteId), isNotNull(whatsappKoppelingen.telefoon)));
}
