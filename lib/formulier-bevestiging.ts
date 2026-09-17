import { readFile } from "node:fs/promises";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { formulierBevestigingen } from "@/db/schema";

/**
 * Bevestigingsmail per formulier: de mail die iemand krijgt na het invullen van een formulier
 * op een klantsite. Formulieren worden herkend uit de HTML (bij publicatie), de AI doet één keer
 * een voorstel, en daarna passen de klant (portaal) of WordSwap (admin) de tekst aan.
 *
 * De tekst is platte tekst met de complete mail (inclusief aanhef); {naam} wordt vervangen door
 * de naam van de invuller. Een aangepaste tekst wordt nooit automatisch overschreven.
 */

export type Bron = "standaard" | "site" | "ai" | "klant" | "wordswap";
export const BRON_LABEL: Record<Bron, string> = {
  standaard: "Standaardtekst",
  site: "Uit de website",
  ai: "Voorstel van de AI",
  klant: "Aangepast door de klant",
  wordswap: "Aangepast door WordSwap",
};

export type HerkendFormulier = {
  formulier: string;
  paginas: string[];
  velden: string[];
  bevestiging: string | null;
};

/** Zelfde naamnormalisatie als de formulierroute, zodat herkenning en inzending overeenkomen. */
export function normaliseerFormulier(naam: string | null | undefined): string {
  return (
    (naam ?? "contact")
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "contact"
  );
}

const ontsnapTerug = (t: string) =>
  t
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

function paginaVanBestand(rel: string): string {
  if (rel.startsWith("delen/")) return "op elke pagina (menu/footer)";
  const p = "/" + rel.replace(/index\.html?$/i, "").replace(/\.html?$/i, "/");
  return p.replace(/\/+$/, "/") || "/";
}

/** Alle formulieren die naar /api/formulier posten, samengevoegd per formuliernaam. */
export async function herkenFormulieren(werkmap: string): Promise<HerkendFormulier[]> {
  const { alleHtmlBestanden } = await import("@/lib/werkmap");
  const perNaam = new Map<string, HerkendFormulier>();
  for (const rel of await alleHtmlBestanden(werkmap)) {
    if (rel === "404.html" || rel.includes("bedankt")) continue;
    const html = await readFile(path.join(werkmap, rel), "utf8").catch(() => "");
    for (const m of html.matchAll(/<form\b[^>]*action=["'][^"']*\/api\/formulier[^"']*["'][^>]*>([\s\S]*?)<\/form>/gi)) {
      const binnen = m[1];
      const waarde = (veld: string) =>
        binnen.match(new RegExp(`name=["']${veld}["'][^>]*value=["']([^"']*)["']`, "i"))?.[1] ??
        binnen.match(new RegExp(`value=["']([^"']*)["'][^>]*name=["']${veld}["']`, "i"))?.[1] ??
        null;
      const naam = normaliseerFormulier(waarde("_formulier"));
      const velden = [
        ...new Set(
          [...binnen.matchAll(/<(?:input|select|textarea)\b[^>]*\bname=["']([^"']+)["'][^>]*>/gi)]
            .filter((v) => !/type=["'](hidden|submit|button)["']/i.test(v[0]))
            .map((v) => v[1])
            .filter((n) => !n.startsWith("_")),
        ),
      ];
      const bevestiging = waarde("_bevestiging");
      const bestaand = perNaam.get(naam) ?? { formulier: naam, paginas: [], velden: [], bevestiging: null };
      const pagina = paginaVanBestand(rel);
      if (!bestaand.paginas.includes(pagina)) bestaand.paginas.push(pagina);
      bestaand.velden = [...new Set([...bestaand.velden, ...velden])];
      bestaand.bevestiging ??= bevestiging ? ontsnapTerug(bevestiging) : null;
      perNaam.set(naam, bestaand);
    }
  }
  return [...perNaam.values()];
}

/** Zegt de site "je" of "u"? Telt de vormen in de zichtbare tekst van de homepage. */
export async function aanspreekvormVan(werkmap: string | null): Promise<"je" | "u"> {
  if (!werkmap) return "u";
  const html = await readFile(path.join(werkmap, "index.html"), "utf8").catch(() => "");
  const tekst = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").toLowerCase();
  const tel = (re: RegExp) => (tekst.match(re) ?? []).length;
  const je = tel(/\b(je|jij|jouw|jou)\b/g);
  const u = tel(/\b(u|uw)\b/g);
  return je > u ? "je" : "u";
}

export function standaardOnderwerp(siteNaam: string, vorm: "je" | "u"): string {
  return vorm === "je" ? `Bedankt voor je bericht aan ${siteNaam}` : `Bedankt voor uw bericht aan ${siteNaam}`;
}

export function standaardTekst(siteNaam: string, vorm: "je" | "u"): string {
  return vorm === "je"
    ? `Hoi {naam},\n\nBedankt voor je bericht aan ${siteNaam}. We hebben het goed ontvangen en nemen zo snel mogelijk contact met je op.`
    : `Beste {naam},\n\nBedankt voor uw bericht aan ${siteNaam}. We hebben het goed ontvangen en nemen zo snel mogelijk contact met u op.`;
}

/** Eén voorstel van de AI voor onderwerp en tekst, passend bij het doel van het formulier. */
export async function maakVoorstel(o: {
  siteNaam: string;
  formulier: string;
  paginas: string[];
  velden: string[];
  vorm: "je" | "u";
}): Promise<{ onderwerp: string; tekst: string } | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic();
    const resp = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system: `Je schrijft de automatische bevestigingsmail die iemand krijgt na het invullen van een formulier op de website van een Nederlands bedrijf. Schrijf in de ${o.vorm === "je" ? "je/jij" : "u"}-vorm, kort (2 tot 4 zinnen), warm en zakelijk, passend bij het doel van het formulier: een sollicitatie, nieuwsbriefaanmelding, offerteaanvraag, terugbelverzoek of inschrijving vraagt elk om een eigen tekst. Beloof geen termijnen, prijzen of afspraken die niet vaststaan; zeg hooguit "zo snel mogelijk". Begin met een aanhef met {naam} (bijvoorbeeld "${o.vorm === "je" ? "Hoi {naam}," : "Beste {naam},"}"), gevolgd door een lege regel. Geen afsluitende groet of handtekening: die wordt automatisch toegevoegd. Antwoord uitsluitend met JSON: {"onderwerp": "...", "tekst": "..."}.`,
      messages: [
        {
          role: "user",
          content: `Bedrijf: ${o.siteNaam}\nNaam van het formulier: ${o.formulier}\nStaat op: ${o.paginas.join(", ") || "onbekend"}\nVelden: ${o.velden.join(", ") || "onbekend"}`,
        },
      ],
    });
    const tekst = resp.content.map((c) => (c.type === "text" ? c.text : "")).join("");
    const json = JSON.parse(tekst.slice(tekst.indexOf("{"), tekst.lastIndexOf("}") + 1)) as { onderwerp?: string; tekst?: string };
    if (!json.onderwerp?.trim() || !json.tekst?.trim()) return null;
    return { onderwerp: json.onderwerp.trim().slice(0, 150), tekst: json.tekst.trim().slice(0, 2000) };
  } catch (e) {
    console.error("Voorstel bevestigingsmail mislukt:", e);
    return null;
  }
}

/**
 * Formulieren van een site bijwerken na publicatie: nieuwe formulieren krijgen een rij met een
 * tekst uit de website (_bevestiging) of één AI-voorstel; bestaande teksten blijven onaangeroerd.
 * Formulieren die niet meer op de site staan houden hun tekst, maar krijgen een lege paginalijst.
 */
export async function synchroniseerFormulieren(site: { id: number; naam: string }, werkmap: string): Promise<number> {
  const herkend = await herkenFormulieren(werkmap);
  const bestaand = await db.select().from(formulierBevestigingen).where(eq(formulierBevestigingen.siteId, site.id));
  const vorm = await aanspreekvormVan(werkmap);
  let nieuw = 0;
  for (const f of herkend) {
    const rij = bestaand.find((b) => b.formulier === f.formulier);
    if (rij) {
      await db
        .update(formulierBevestigingen)
        .set({ paginas: f.paginas, velden: f.velden })
        .where(eq(formulierBevestigingen.id, rij.id));
      continue;
    }
    const inhoud = f.bevestiging
      ? { onderwerp: standaardOnderwerp(site.naam, vorm), tekst: `${vorm === "je" ? "Hoi" : "Beste"} {naam},\n\n${f.bevestiging}`, bron: "site" as Bron }
      : await maakVoorstel({ siteNaam: site.naam, formulier: f.formulier, paginas: f.paginas, velden: f.velden, vorm }).then((v) =>
          v ? { ...v, bron: "ai" as Bron } : { onderwerp: standaardOnderwerp(site.naam, vorm), tekst: standaardTekst(site.naam, vorm), bron: "standaard" as Bron },
        );
    await db
      .insert(formulierBevestigingen)
      .values({ siteId: site.id, formulier: f.formulier, paginas: f.paginas, velden: f.velden, ...inhoud })
      .onConflictDoNothing();
    nieuw++;
  }
  for (const b of bestaand) {
    if (!herkend.some((f) => f.formulier === b.formulier) && (b.paginas as string[]).length > 0) {
      await db.update(formulierBevestigingen).set({ paginas: [] }).where(eq(formulierBevestigingen.id, b.id));
    }
  }
  return nieuw;
}

/** Formulier dat een inzending krijgt maar nog niet bekend is (bijv. van vóór deze functie): rij aanmaken met een voorstel. */
export async function registreerOnbekendFormulier(site: { id: number; naam: string }, formulier: string, velden: string[]) {
  const [rij] = await db
    .select({ id: formulierBevestigingen.id })
    .from(formulierBevestigingen)
    .where(and(eq(formulierBevestigingen.siteId, site.id), eq(formulierBevestigingen.formulier, formulier)));
  if (rij) return;
  const vorm = "u";
  const v = await maakVoorstel({ siteNaam: site.naam, formulier, paginas: [], velden, vorm });
  await db
    .insert(formulierBevestigingen)
    .values({
      siteId: site.id,
      formulier,
      velden,
      onderwerp: v?.onderwerp ?? standaardOnderwerp(site.naam, vorm),
      tekst: v?.tekst ?? standaardTekst(site.naam, vorm),
      bron: v ? "ai" : "standaard",
    })
    .onConflictDoNothing();
}

/** Tekst invullen voor één invuller: {naam} vervangen, en een lege naam netjes weglaten. */
export function vulIn(tekst: string, naam: string): string {
  const n = naam.trim();
  return tekst.replace(/[ \t]*\{naam\}/g, n ? ` ${n}` : "").replace(/^(Hoi|Beste|Hallo) ,/m, "$1,");
}

/** HTML van de bevestigingsmail (zonder klantopmaak; die voegt verstuurSiteMail toe). */
export function bevestigingsHtml(o: { tekst: string; naam: string; veldenHtml?: string }): string {
  const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const alineas = vulIn(o.tekst, o.naam)
    .split(/\n{2,}/)
    .map((a) => `<p>${esc(a).replace(/\n/g, "<br>")}</p>`)
    .join("");
  return `${alineas}${o.veldenHtml ? `<hr>${o.veldenHtml}` : ""}`;
}
