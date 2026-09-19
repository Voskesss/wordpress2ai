import { and, desc, eq, gt, inArray, isNotNull, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  changes,
  chatFeedback,
  messages,
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
  KNOP_DUIM,
  KNOP_PUBLICEER,
  KNOP_SITE,
  KNOP_WEGGOOIEN,
  conceptCommando,
  vraagtOmMakeover,
  wisselCommando,
  leesKnop,
  paginaVoorConcept,
  splitsKeuzes,
  toonNummer,
  voegSamen,
  haalAan,
  werkMelding,
  type Binnenkomend,
} from "./berichten";

/** Hoe lang na binnenkomst we nog een chatbeurt mogen starten. De webhook-
 * functie mag 800 s draaien; de chat zelf neemt daarvan tot ~720 s plus
 * opslaan. Wie langer op een bezette website moet wachten, krijgt een eerlijk
 * "stuur het zo nog eens" in plaats van een beurt die halverwege wordt afgekapt. */
const UITERLIJK_START_MS = 45_000;
/** Moet gelijk zijn aan maxDuration van app/api/whatsapp/webhook/route.ts.
 * De chatbeurt krijgt hiervan een kortere grens mee, zodat hij zelf op tijd
 * stopt en oplevert wat af is in plaats van door Vercel te worden afgekapt. */
const WEBHOOK_MAX_DUUR_S = 800;
/** Wat we voor de chatbeurt reserveren voor het opleveren: het concept
 * vastleggen, naar GitHub duwen en de werkversie uitrollen. Bij een grote
 * klus (kleuren over de hele site) duurt dat minuten — te krap reserveren
 * betekende dat Vercel de functie alsnog afkapte en de eigenaar niets hoorde
 * (les 19-09: beurt van 08:27 werd op de seconde bij 800 s gestopt). */
const OPLEVEREN_S = 270;
/** Vlak voor de harde grens van Vercel hoe dan ook iets terugsturen: liever
 * een eerlijk "niet op tijd af" dan doodse stilte in WhatsApp. */
const LAATSTE_KANS_S = 60;
/** Zo lang wachten we op een volgend bericht voordat we aan de slag gaan:
 * vijf foto's in WhatsApp komen binnen als vijf losse berichten. */
const BUNDEL_MS = 8_000;
/** Hangt een nummer aan meerdere websites, dan blijft de gekozen website zo
 * lang "de huidige"; daarna vragen we het opnieuw. */
const WISSEL_NA_MS = 2 * 60 * 60 * 1000;
const MAX_FOTOS = 10;

type Rij = typeof whatsappBerichten.$inferSelect;
type Site = typeof sites.$inferSelect;

const slaap = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Wanneer we dit nummer voor het laatst "ik ga ermee aan de slag" stuurden:
 * twee opdrachten die vrijwel tegelijk binnenkomen (foto's plus tekst) hoeven
 * die melding niet allebei. Bij een volgende vraag komt hij weer, anders weet
 * de eigenaar niet dat er gewerkt wordt. */
const laatsteAanDeSlag = new Map<string, number>();

/** Hooguit één keer per uur vragen of een antwoord klopte: vaker is zeuren. */
const laatsteVraag = new Map<string, number>();
function magVragen(telefoon: string) {
  if (Date.now() - (laatsteVraag.get(telefoon) ?? 0) < 3_600_000) return false;
  laatsteVraag.set(telefoon, Date.now());
  return true;
}

async function zetStatus(ids: number[], status: Rij["status"], siteId?: number) {
  if (!ids.length) return;
  await db
    .update(whatsappBerichten)
    .set({ status, ...(siteId ? { siteId } : {}) })
    .where(inArray(whatsappBerichten.id, ids));
}

/** Berichten die "bezig" bleven staan doordat Vercel de functie halverwege
 * afkapte: die komen nooit meer terug. Ze blokkeren niets (we pakken alleen
 * "wacht" op), maar zo klopt de lijst en zien we in de admin wat er misging. */
async function sluitVastgelopenAf() {
  await db
    .update(whatsappBerichten)
    .set({ status: "mislukt" })
    .where(
      and(
        eq(whatsappBerichten.status, "bezig"),
        sql`${whatsappBerichten.ontvangen} < now() - make_interval(secs => ${WEBHOOK_MAX_DUUR_S + 120})`,
      ),
    )
    .catch((e) => console.error("Vastgelopen WhatsApp-berichten opruimen:", e));
}

/** Alles wat één webhook-aanroep binnenbracht, per afzender afhandelen. */
export async function verwerkWebhook(nieuw: Rij[], gestart: number) {
  await sluitVastgelopenAf();
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

  // Alle websites waar dit nummer aan hangt (iemand kan er twee hebben)
  const koppelingen = await db
    .select({ koppeling: whatsappKoppelingen, site: sites })
    .from(whatsappKoppelingen)
    .innerJoin(sites, eq(sites.id, whatsappKoppelingen.siteId))
    .where(eq(whatsappKoppelingen.telefoon, telefoon));
  if (!koppelingen.length) return onbekendNummer(telefoon, rijen);

  const bruikbaar = koppelingen.filter((r) => r.site.whatsappActief && !r.site.isDemo);
  if (!bruikbaar.length) {
    await zetStatus(rijen.map((r) => r.id), "genegeerd", koppelingen[0].site.id);
    await stuurTekst(
      telefoon,
      "WhatsApp staat voor je website op dit moment niet aan. Je kunt je wijzigingen gewoon in het WordSwap-portaal doorgeven.",
    );
    return;
  }

  // Keuze voor een website (knop uit de lijst hieronder) meteen vastleggen
  let netGekozen = false;
  for (const rij of rijen.filter((r) => r.soort === "knop" || r.soort === "keuze")) {
    const id = Number(rij.inhoud?.startsWith(KNOP_SITE) ? rij.inhoud.slice(KNOP_SITE.length) : NaN);
    const keus = bruikbaar.find((r) => r.koppeling.id === id);
    if (!keus) continue;
    rijen = rijen.filter((r) => r.id !== rij.id);
    await db
      .update(whatsappKoppelingen)
      .set({ laatstGebruikt: new Date() })
      .where(eq(whatsappKoppelingen.id, keus.koppeling.id));
    await db
      .update(whatsappKoppelingen)
      .set({ laatstGebruikt: null })
      .where(and(eq(whatsappKoppelingen.telefoon, telefoon), ne(whatsappKoppelingen.id, keus.koppeling.id)));
    keus.koppeling.laatstGebruikt = new Date();
    await zetStatus([rij.id], "klaar", keus.site.id);
    await stuurTekst(telefoon, `Goed — we werken nu aan ${siteRegel(keus.site)}`);
    netGekozen = true;
  }

  // "andere website": de lijst opnieuw
  const wisselRij = rijen.find((r) => r.soort === "tekst" && wisselCommando(r.inhoud));
  if (wisselRij && bruikbaar.length > 1) {
    rijen = rijen.filter((r) => r.id !== wisselRij.id);
    await db
      .update(whatsappKoppelingen)
      .set({ laatstGebruikt: null })
      .where(eq(whatsappKoppelingen.telefoon, telefoon));
    await zetStatus([wisselRij.id], "klaar");
    await vraagWelkeSite(telefoon, bruikbaar);
    return;
  }

  // Welke website is het? Eén gekoppeld: die. Meerdere: de laatst gekozene,
  // en anders vragen we het en laten we de berichten wachten tot de keuze er is.
  const actief = bruikbaar
    .filter((r) => r.koppeling.laatstGebruikt && Date.now() - r.koppeling.laatstGebruikt.getTime() < WISSEL_NA_MS)
    .sort((a, b) => (b.koppeling.laatstGebruikt!.getTime() - a.koppeling.laatstGebruikt!.getTime()))[0];
  const gekozen = bruikbaar.length === 1 ? bruikbaar[0] : actief;
  if (!gekozen) {
    if (rijen.length) await vraagWelkeSite(telefoon, bruikbaar, voegSamen(rijen));
    return;
  }
  const site = gekozen.site;
  const koppeling = gekozen.koppeling;
  const meerdere = bruikbaar.length > 1;

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
    await stuurTekst(telefoon, "Dit nummer hoort niet (meer) bij de eigenaar van de website. Neem contact op met WordSwap.");
    return;
  }

  // "Ja, laat WordSwap contact opnemen": interesse in een make-over doorgeven
  for (const rij of rijen.filter((r) => vraagtOmMakeover(r.inhoud))) {
    rijen = rijen.filter((r) => r.id !== rij.id);
    if (!(await claim([rij.id])).length) continue;
    await geefMakeoverDoor(telefoon, site);
    await zetStatus([rij.id], "klaar", site.id);
  }

  // Knoppen en getypte "publiceer"/"weggooien" direct uitvoeren
  for (const rij of rijen) {
    const commando = rij.soort === "tekst" ? conceptCommando(rij.inhoud) : null;
    if (rij.soort !== "knop" && !commando) continue;
    const knop = commando ? { actie: commando, changeId: null } : leesKnop(rij.inhoud);
    rijen = rijen.filter((r) => r.id !== rij.id);
    if (!(await claim([rij.id])).length) continue;
    try {
      if (knop?.actie === "duim-goed" || knop?.actie === "duim-slecht")
        await slaOordeelOp(telefoon, eigenaar, site, knop.actie === "duim-goed" ? "goed" : "slecht");
      else if (knop) await voerConceptActieUit(telefoon, eigenaar, site, knop);
      await zetStatus([rij.id], "klaar", site.id);
    } catch (e) {
      console.error("WhatsApp-knop:", e);
      await zetStatus([rij.id], "mislukt", site.id);
      await stuurTekst(telefoon, "Dat lukte niet. Probeer het zo nog eens, of doe het in het portaal.");
    }
  }

  // Berichten die op de sitekeuze wachtten: meteen oppakken, die hebben al gewacht
  if (netGekozen) {
    const wachtend = await claimAlleWachtende(telefoon);
    if (wachtend.length) await chatBeurt(telefoon, eigenaar, site, wachtend, gestart, meerdere);
    return;
  }
  if (!rijen.length) return;

  // Even wachten op meer berichten; de láátste aanroep neemt alles mee
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
  if (bundel.length) await chatBeurt(telefoon, eigenaar, site, bundel, gestart, meerdere);
}

/** De eigenaar wil een nieuwe uitstraling of een make-over: dat doet WordSwap,
 * niet de chat. Hier komt de aanvraag binnen (mail + lijst in de admin). */
async function geefMakeoverDoor(telefoon: string, site: Site) {
  const { formulierInzendingen } = await import("@/db/schema");
  await db
    .insert(formulierInzendingen)
    .values({
      siteRepo: "wordswap",
      formulier: "make-over",
      velden: {
        naam: site.naam,
        site: site.naam,
        siteId: String(site.id),
        website: site.domein ?? site.githubRepo,
        telefoon: toonNummer(telefoon),
        bericht: "Wil een frissere uitstraling of een complete make-over (gevraagd via WhatsApp).",
      },
    })
    .catch((e) => console.error("Make-over-aanvraag opslaan:", e));
  const sleutel = process.env.RESEND_API_KEY;
  if (sleutel) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${sleutel}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "WordSwap portaal <info@wordswap.nl>",
        to: ["info@wordswap.nl"],
        subject: `Make-over gevraagd: ${site.naam}`,
        html: `<p><strong>${site.naam}</strong> (${site.domein ?? site.githubRepo}) vroeg via WhatsApp om een frissere uitstraling of een complete make-over.</p><p>Telefoon: ${toonNummer(telefoon)}</p><p>Even bellen of mailen dus.</p>`,
      }),
    }).catch((e) => console.error("Make-over-seintje mailen mislukt:", e));
  }
  await stuurTekst(
    telefoon,
    "Top — ik geef het door aan WordSwap. Je hoort snel van ze over een frissere uitstraling. Ondertussen kun je hier gewoon kleine dingen blijven aanpassen.",
  );
}

/** Site met adres, zodat in WhatsApp altijd duidelijk is waar je mee bezig bent. */
function siteRegel(site: Site) {
  const adres = site.domein
    ? site.domein.replace(/^https?:\/\//, "").replace(/\/$/, "")
    : site.siteSlug
      ? `${site.siteSlug}.${CF_SUBDOMEIN}.workers.dev`
      : "";
  return adres ? `*${site.naam}* (${adres})` : `*${site.naam}*`;
}

/** Hangt het nummer aan meerdere websites, dan eerst vragen welke het is. */
async function vraagWelkeSite(
  telefoon: string,
  bruikbaar: { koppeling: typeof whatsappKoppelingen.$inferSelect; site: Site }[],
  /** Het bericht dat op de keuze wacht: dat voeren we daarna uit, dus we
   * laten zien wélk bericht, zodat niemand verrast wordt. */
  wachtend?: string,
) {
  await stuurKeuzelijst(
    telefoon,
    wachtend?.trim()
      ? `Voor welke website is dit?\n\n“${haalAan(wachtend)}”\n\nNa je keuze ga ik daarmee aan de slag. Wisselen kan later altijd door "andere website" te appen.`
      : "Voor welke website is dit? Je kunt later altijd wisselen door \"andere website\" te appen.",
    "Kies een website",
    bruikbaar.slice(0, 10).map((r) => ({
      id: `${KNOP_SITE}${r.koppeling.id}`,
      titel: r.site.naam,
      omschrijving: r.site.domein ?? r.site.siteSlug ?? undefined,
    })),
  );
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

/** Bericht van een nummer dat bij geen enkele site hoort: niets doen, niets
 * terugsturen (we praten niet met vreemden), en Jos één keer per uur een
 * seintje geven — zo zie je of iemand zich vergist of aanklopt. */
async function onbekendNummer(telefoon: string, rijen: Rij[]) {
  await zetStatus(rijen.map((r) => r.id), "genegeerd");
  const [eerder] = await db
    .select({ id: whatsappBerichten.id })
    .from(whatsappBerichten)
    .where(
      and(
        eq(whatsappBerichten.telefoon, telefoon),
        eq(whatsappBerichten.status, "genegeerd"),
        sql`${whatsappBerichten.id} NOT IN (${sql.join(rijen.map((r) => sql`${r.id}`), sql`, `)})`,
        gt(whatsappBerichten.ontvangen, sql`now() - interval '1 hour'`),
      ),
    )
    .limit(1);
  if (eerder) return;
  const sleutel = process.env.RESEND_API_KEY;
  if (!sleutel) return;
  const eerste = rijen[0]?.inhoud?.slice(0, 200) ?? "(geen tekst)";
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${sleutel}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "WordSwap portaal <info@wordswap.nl>",
      to: ["info@wordswap.nl"],
      subject: `WhatsApp: onbekend nummer ${toonNummer(telefoon)}`,
      html: `<p>Er kwam een WhatsApp-bericht binnen van <strong>${toonNummer(telefoon)}</strong>, maar dat nummer staat bij geen enkele klant.</p><p>Bericht: ${eerste.replace(/</g, "&lt;")}</p><p>Hoort dit bij een klant? Zet het nummer dan in de admin bij die site (met landcode). Anders hoef je niets te doen; er is niets verwerkt en niets teruggestuurd.</p>`,
    }),
  }).catch((e) => console.error("Seintje onbekend WhatsApp-nummer:", e));
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

/** Duimpje uit WhatsApp: komt in dezelfde feedbacklijst als het portaal (admin). */
async function slaOordeelOp(
  telefoon: string,
  eigenaar: string,
  site: Site,
  oordeel: "goed" | "slecht",
) {
  const [laatste] = await db
    .select({ tekst: messages.tekst })
    .from(messages)
    .where(and(eq(messages.siteId, site.id), eq(messages.rol, "assistent")))
    .orderBy(desc(messages.id))
    .limit(1);
  await db.insert(chatFeedback).values({
    siteId: site.id,
    clerkUserId: eigenaar,
    oordeel,
    antwoord: laatste?.tekst?.slice(0, 2000) ?? null,
    reden: "via WhatsApp",
  });
  await stuurTekst(
    telefoon,
    oordeel === "goed"
      ? "Fijn om te horen, dank je!"
      : "Dank je — dat noteer ik. App gerust wat er niet klopte, dan pas ik het meteen aan.",
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
  /** Hangt dit nummer aan meerdere websites? Dan noemen we bij elk antwoord
   * om welke site het gaat, zodat je nooit in de verkeerde zit te werken. */
  meerdere = false,
) {
  const ids = rijen.map((r) => r.id);
  // Buiten de try, zodat we ze ook bij een fout kunnen stoppen
  let bezigMelder: ReturnType<typeof setTimeout> | undefined;
  // Vlak voordat Vercel de functie hard afkapt: hoe dan ook iets terugsturen.
  // Zonder dit bleef het doodstil als een klus te groot was (les 19-09).
  const laatsteKans = setTimeout(
    () => {
      void zetStatus(ids, "mislukt", site.id).catch(() => {});
      void stuurTekst(
        telefoon,
        "Dit bleek een te grote klus voor één keer — ik kreeg hem niet op tijd af, dus er is niets aan je website veranderd. App het in kleinere stappen (bijvoorbeeld één pagina of één kleur tegelijk), dan lukt het wel. Wil je het toch in één keer? Dan pakt WordSwap het voor je op.",
      ).catch(() => {});
    },
    Math.max(
      5_000,
      gestart + (WEBHOOK_MAX_DUUR_S - LAATSTE_KANS_S) * 1000 - Date.now(),
    ),
  );
  const stopKlokken = () => {
    clearTimeout(bezigMelder);
    clearTimeout(laatsteKans);
  };
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
    // Onbekende soorten: alleen iets zeggen over wat er écht tussen zat.
    // Stickers, emoji-reacties en leesbevestigingen negeren we stilletjes.
    {
      const soorten = new Set(
        rijen.filter((r) => r.soort === "anders").map((r) => r.inhoud ?? ""),
      );
      const uitleg: string[] = [];
      if (soorten.has("video"))
        uitleg.push("Video's kan ik via WhatsApp nog niet verwerken; stuur een video mee in het portaal.");
      if (soorten.has("location") || soorten.has("contacts"))
        uitleg.push("Een locatie of contactkaart kan ik niet verwerken. Typ gerust wat er op de site moet komen.");
      const rest = [...soorten].filter(
        (t) => !["video", "location", "contacts", "sticker", "reaction", "unsupported", ""].includes(t),
      );
      if (rest.length) uitleg.push(`Dit soort bericht kan ik nog niet verwerken: ${rest.join(", ")}.`);
      if (uitleg.length) opmerkingen.push(uitleg.join("\n"));
    }

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
    form.set("kanaal", "whatsapp");
    // De chat moet ruim vóór onze eigen functiegrens stoppen: zo krijg je altijd
    // een antwoord en blijft een half werk niet verloren (les 19-09: een hele
    // make-over liep 800 s door en werd door Vercel afgekapt).
    form.set(
      "maxDuurS",
      String(Math.round((gestart + (WEBHOOK_MAX_DUUR_S - OPLEVEREN_S) * 1000 - Date.now()) / 1000)),
    );
    for (const f of fotos) form.append("afbeelding", f);

    // Even een teken van leven: een beurt duurt al gauw een halve tot een paar
    // minuten, en zolang blijft het in WhatsApp anders doodstil. Loopt er net
    // al een beurt voor dit nummer, dan is die melding er al geweest.
    // Alleen melden dat hij aan het werk gaat als hij ook écht iets gaat
    // wijzigen: dat horen we aan de werkstappen die de chat onderweg stuurt.
    // Gaat het om een vraag of gewoon overleg, dan komt het antwoord vanzelf
    // en is een tussenmelding alleen maar ruis.
    let werkGemeld = false;
    const meldWerk = (status: string | null = null) => {
      if (werkGemeld) return;
      werkGemeld = true;
      laatsteAanDeSlag.set(telefoon, Date.now());
      void stuurTekst(
        telefoon,
        werkMelding(status, bericht, meerdere ? siteRegel(site) : undefined),
      ).catch(() => {});
    };
    // Vangnet: duurt het lang zonder dat er al iets gewijzigd is (veel lezen,
    // foto's bekijken), dan toch even laten weten dat hij bezig is.
    bezigMelder = setTimeout(() => meldWerk(), 40_000);

    let res = await roepRouteAan("chat", eigenaar, form);
    // Loopt er al een bewerking (bijvoorbeeld in het portaal)? Even wachten,
    // maar niet zo lang dat de chatbeurt daarna geen tijd meer heeft.
    while (res.status === 409) {
      const data = (await res.clone().json().catch(() => ({}))) as { slot?: boolean };
      if (!data.slot) break;
      if (Date.now() - gestart > UITERLIJK_START_MS) {
        stopKlokken();
        await zetStatus(ids, "genegeerd", site.id);
        const { leaseRestMinuten, operationScope } = await import("@/lib/operation-guards");
        const minuten = await leaseRestMinuten(operationScope(site, eigenaar)).catch(() => 2);
        await stuurTekst(
          telefoon,
          `Er wordt nu aan je website gewerkt; dat kan nog ${minuten} ${minuten === 1 ? "minuut" : "minuten"} duren. Stuur je bericht daarna nog eens, dan pak ik het op.`,
        );
        return;
      }
      await slaap(10_000);
      res = await roepRouteAan("chat", eigenaar, form);
    }
    const uitkomst = await readChatResponse(res, (gebeurtenis) => {
      const soort = gebeurtenis.type;
      const tekst = typeof gebeurtenis.tekst === "string" ? gebeurtenis.tekst : "";
      // "bewerkt" komt zodra er een pagina wordt aangepast; de statusregels
      // met "aanpassen/schrijven/bijwerken" zijn hetzelfde moment in woorden.
      if (soort === "status" && /aanpass|schrijf|werk ik|bij\.\.\.|wissel/i.test(tekst)) meldWerk(tekst);
      else if (soort === "bewerkt") meldWerk();
    });
    stopKlokken();
    await stuurAntwoord(telefoon, site, uitkomst, meerdere);
    await zetStatus(ids, "klaar", site.id);
  } catch (e) {
    console.error("WhatsApp-chatbeurt:", e);
    stopKlokken();
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
  meerdere = false,
) {
  const gesplitst = splitsKeuzes(uitkomst.reply);
  const keuzes = gesplitst.keuzes;
  // Bij meerdere websites altijd bovenaan welke site het is
  const schoon = meerdere && gesplitst.schoon.trim()
    ? `${siteRegel(site)}\n\n${gesplitst.schoon}`
    : gesplitst.schoon;
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
  } else if (schoon.trim() && !uitkomst.changeId && magVragen(telefoon)) {
    // Gewoon antwoord: af en toe vragen of het klopte, zodat we in de beta leren
    // wat er misgaat. De vraag staat in hetzelfde bericht, vlak boven de knoppen.
    await stuurKnoppen(telefoon, `${schoon}\n\nKlopte dit antwoord?`, [
      { id: `${KNOP_DUIM}goed`, titel: "Ja, klopt" },
      { id: `${KNOP_DUIM}slecht`, titel: "Nee, klopt niet" },
    ]);
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
