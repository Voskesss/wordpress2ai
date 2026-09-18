/**
 * Pure hulpfuncties voor het WhatsApp-kanaal (geen database of netwerk),
 * zodat ze los te testen zijn: tests/whatsapp.mts.
 */

export type Soort =
  | "tekst"
  | "foto"
  | "document"
  | "spraak"
  | "knop"
  | "keuze"
  | "anders";

export type Binnenkomend = {
  waMessageId: string;
  telefoon: string;
  soort: Soort;
  inhoud: string | null;
  mediaId: string | null;
  mimeType: string | null;
  bestandsnaam: string | null;
};

type WaBericht = {
  id?: string;
  from?: string;
  type?: string;
  text?: { body?: string };
  image?: { id?: string; mime_type?: string; caption?: string };
  document?: { id?: string; mime_type?: string; caption?: string; filename?: string };
  audio?: { id?: string; mime_type?: string };
  interactive?: {
    type?: string;
    button_reply?: { id?: string; title?: string };
    list_reply?: { id?: string; title?: string };
  };
};

/** Haalt alle klantberichten uit een webhook van Meta. Afleverstatussen
 * (verzonden/gelezen) en onbekende vormen vallen weg. */
export function leesWebhook(body: unknown): Binnenkomend[] {
  const uit: Binnenkomend[] = [];
  const entries = (body as { entry?: unknown[] })?.entry;
  if (!Array.isArray(entries)) return uit;
  for (const entry of entries) {
    const changes = (entry as { changes?: unknown[] })?.changes;
    if (!Array.isArray(changes)) continue;
    for (const change of changes) {
      const berichten = (change as { value?: { messages?: WaBericht[] } })?.value
        ?.messages;
      if (!Array.isArray(berichten)) continue;
      for (const b of berichten) {
        if (!b?.id || !b.from) continue;
        const basis = {
          waMessageId: b.id,
          telefoon: b.from.replace(/\D/g, ""),
          inhoud: null,
          mediaId: null,
          mimeType: null,
          bestandsnaam: null,
        };
        switch (b.type) {
          case "text":
            uit.push({ ...basis, soort: "tekst", inhoud: b.text?.body ?? "" });
            break;
          case "image":
            uit.push({
              ...basis,
              soort: "foto",
              inhoud: b.image?.caption ?? null,
              mediaId: b.image?.id ?? null,
              mimeType: b.image?.mime_type ?? null,
            });
            break;
          case "document":
            uit.push({
              ...basis,
              soort: "document",
              inhoud: b.document?.caption ?? null,
              mediaId: b.document?.id ?? null,
              mimeType: b.document?.mime_type ?? null,
              bestandsnaam: b.document?.filename ?? null,
            });
            break;
          case "audio":
            uit.push({
              ...basis,
              soort: "spraak",
              mediaId: b.audio?.id ?? null,
              mimeType: b.audio?.mime_type ?? null,
            });
            break;
          case "interactive": {
            const knop = b.interactive?.button_reply;
            const lijst = b.interactive?.list_reply;
            if (knop?.id) uit.push({ ...basis, soort: "knop", inhoud: knop.id });
            else if (lijst?.id)
              uit.push({ ...basis, soort: "keuze", inhoud: lijst.id });
            else uit.push({ ...basis, soort: "anders" });
            break;
          }
          default:
            uit.push({ ...basis, soort: "anders", inhoud: b.type ?? null });
        }
      }
    }
  }
  return uit;
}

/** Telefoonnummer uit de admin omzetten naar de vorm die WhatsApp gebruikt:
 * alleen cijfers, met landcode, zonder plus (31612345678). De landcode is
 * verplicht — "06..." levert null op, want dat nummer bestaat in tientallen
 * landen en een verkeerde gok koppelt een vreemde telefoon aan een site. */
export function normaliseerNummer(invoer: string | null | undefined) {
  const ruw = (invoer ?? "").trim();
  if (!ruw) return null;
  // "+31 (0)6 12 34 56 78" en "0031612345678" mogen allebei
  const metPlus = /^\+/.test(ruw) || /^00\d/.test(ruw);
  if (!metPlus) return null;
  const cijfers = ruw.replace(/^\+/, "").replace(/^00/, "").replace(/\(0\)/g, "").replace(/\D/g, "");
  // Landcode (1-3) plus abonneenummer; internationaal maximaal 15 cijfers
  if (cijfers.length < 8 || cijfers.length > 15) return null;
  return cijfers;
}

/** Nummer tonen zonder het helemaal prijs te geven: +31 •••• 1365. */
export function toonNummer(telefoon: string | null | undefined) {
  if (!telefoon) return "";
  const land = telefoon.slice(0, 2);
  return `+${land} •••• ${telefoon.slice(-4)}`;
}

/** KEUZES-regel van de AI losmaken van het antwoord (zelfde regel als de
 * portaalchat). Keuzes met ✏️ openen daar alleen het typveld; die hebben in
 * WhatsApp geen zin — typen kan altijd. */
export function splitsKeuzes(tekst: string) {
  const m = tekst.match(/\n?\s*KEUZES:\s*(.+)\s*$/);
  if (!m) return { schoon: tekst, keuzes: [] as string[] };
  const keuzes = m[1]
    .split("|")
    .map((k) => k.trim())
    .filter((k) => k && !k.startsWith("✏️"))
    .slice(0, 4);
  return { schoon: tekst.slice(0, m.index).trimEnd(), keuzes };
}

export const KNOP_PUBLICEER = "pub:";
export const KNOP_WEGGOOIEN = "weg:";
export const KEUZE = "k:";
/** Duimpje bij een antwoord — belandt in dezelfde feedbacklijst als in het portaal. */
export const KNOP_DUIM = "duim:";

/** Knop-id → actie. Onbekend of verknoeid → null. */
export function leesKnop(id: string | null) {
  if (!id) return null;
  if (id === `${KNOP_DUIM}goed`) return { actie: "duim-goed" as const, changeId: null };
  if (id === `${KNOP_DUIM}slecht`) return { actie: "duim-slecht" as const, changeId: null };
  for (const [voorvoegsel, actie] of [
    [KNOP_PUBLICEER, "publiceer"],
    [KNOP_WEGGOOIEN, "weggooien"],
  ] as const) {
    if (id.startsWith(voorvoegsel)) {
      const changeId = Number(id.slice(voorvoegsel.length));
      return Number.isSafeInteger(changeId) && changeId > 0
        ? { actie, changeId }
        : null;
    }
  }
  return null;
}

/** Getypt commando voor het openstaande concept, als alternatief voor de knop. */
export function conceptCommando(tekst: string | null) {
  const t = tekst?.trim().toLowerCase().replace(/[.!]+$/, "") ?? "";
  if (/^(publiceer|publiceren|zet (het )?live|live zetten)$/.test(t))
    return "publiceer" as const;
  if (/^(weggooien|gooi (het )?weg|concept weggooien)$/.test(t))
    return "weggooien" as const;
  return null;
}

/** Op welke pagina het concept het best te bekijken is: de eerste gewijzigde
 * pagina (geen gedeeld onderdeel), anders de homepage. */
export function paginaVoorConcept(bestanden?: string[] | null) {
  const html = (bestanden ?? []).find(
    (p) => /\.html?$/i.test(p) && !p.startsWith("delen/"),
  );
  if (!html || html === "index.html") return "/";
  return "/" + html.replace(/index\.html$/, "").replace(/\.html?$/i, "/");
}

/** Losse berichten die kort na elkaar binnenkwamen samenvoegen tot één
 * opdracht voor de chat: teksten en bijschriften onder elkaar, media apart. */
export function voegSamen(
  rijen: { soort: Soort; inhoud: string | null }[],
) {
  const teksten = rijen
    .map((r) =>
      r.soort === "keuze" && r.inhoud?.startsWith(KEUZE)
        ? r.inhoud.slice(KEUZE.length)
        : r.inhoud,
    )
    .filter((t): t is string => Boolean(t?.trim()))
    .map((t) => t.trim());
  const fotos = rijen.filter((r) => r.soort === "foto").length;
  const documenten = rijen.filter((r) => r.soort === "document").length;
  let bericht = teksten.join("\n");
  if (!bericht) {
    // Alleen media zonder uitleg: de AI vraagt dan zelf waar het heen moet
    bericht =
      fotos && documenten
        ? "Hierbij foto's en een document."
        : fotos > 1
          ? `Hierbij ${fotos} foto's.`
          : fotos === 1
            ? "Hierbij een foto."
            : documenten
              ? "Hierbij een document."
              : "";
  }
  return bericht;
}
