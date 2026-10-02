import { db } from "@/db";
import { sql, and, eq, isNotNull, ne } from "drizzle-orm";
import { sites } from "@/db/schema";
import { leesObject, schrijfObject } from "./r2";

/**
 * Gezondheidscontrole: raakt elke stille afhankelijkheid van WordSwap één
 * keer per dag echt aan, zodat een verlopen sleutel of stille storing nooit
 * pas opvalt als een klant belt. Uitslag in R2 (geen databasewijziging
 * nodig), dashboard op /admin/gezondheid, en wordt iets rood dat gisteren
 * groen was, dan gaat er één mailtje naar Jos. Geen dagelijkse
 * "alles-is-oké"-post.
 */

export type CheckStatus = "ok" | "waarschuwing" | "fout";
export type CheckUitslag = { sleutel: string; naam: string; status: CheckStatus; detail: string };
export type VersieRij = { pakket: string; huidig: string; laatste: string; status: CheckStatus };
export type GezondheidsRapport = {
  gemetenOp: string;
  checks: CheckUitslag[];
  versies: VersieRij[];
};

export const RAPPORT_SLEUTEL = "intern/gezondheid.json";

/** Pakketten waarvan achterlopen ons echt raakt. */
const PAKKETTEN = ["@anthropic-ai/sdk", "next", "drizzle-orm", "resend", "playwright", "sharp", "zod", "jszip"];

const TIJD_MS = 8000;

async function meet(
  sleutel: string,
  naam: string,
  werk: () => Promise<{ status: CheckStatus; detail: string } | string>,
): Promise<CheckUitslag> {
  try {
    const uit = await Promise.race([
      werk(),
      new Promise<never>((_, weiger) => setTimeout(() => weiger(new Error("tijd op (8 s)")), TIJD_MS)),
    ]);
    return typeof uit === "string"
      ? { sleutel, naam, status: "ok", detail: uit }
      : { sleutel, naam, ...uit };
  } catch (e) {
    return { sleutel, naam, status: "fout", detail: e instanceof Error ? e.message : String(e) };
  }
}

/** Versies vergelijken: gelijk = ok, ander hoofdnummer = fout, anders waarschuwing. */
export function versieStatus(huidig: string, laatste: string): CheckStatus {
  const schoon = (v: string) => v.replace(/^[^0-9]*/, "");
  if (schoon(huidig) === schoon(laatste)) return "ok";
  const hoofd = (v: string) => schoon(v).split(".")[0];
  return hoofd(huidig) !== hoofd(laatste) ? "fout" : "waarschuwing";
}

/** Welke sleutels nu op fout staan terwijl ze dat in het vorige rapport niet deden. */
export function nieuwRood(vorig: GezondheidsRapport | null, huidig: GezondheidsRapport): string[] {
  const was = new Map((vorig?.checks ?? []).map((c) => [c.sleutel, c.status]));
  return huidig.checks
    .filter((c) => c.status === "fout" && was.get(c.sleutel) !== "fout")
    .map((c) => `${c.naam}: ${c.detail}`);
}

export async function versieWaakhond(): Promise<VersieRij[]> {
  const { readFile } = await import("node:fs/promises");
  const pkg = JSON.parse(await readFile(process.cwd() + "/package.json", "utf8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const alle = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  const uit: VersieRij[] = [];
  for (const pakket of PAKKETTEN) {
    const huidig = (alle[pakket] ?? "").replace(/^[\^~]/, "");
    if (!huidig) continue;
    try {
      const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(pakket)}/latest`, {
        signal: AbortSignal.timeout(TIJD_MS),
      });
      const laatste = ((await res.json()) as { version?: string }).version ?? "?";
      uit.push({ pakket, huidig, laatste, status: versieStatus(huidig, laatste) });
    } catch {
      uit.push({ pakket, huidig, laatste: "onbekend (npm onbereikbaar)", status: "waarschuwing" });
    }
  }
  return uit;
}

export async function alleChecks(alleen?: ReadonlySet<string>): Promise<CheckUitslag[]> {
  const checks: (CheckUitslag | null)[] = [];
  // De kwartierpols (draaiPols) draait alleen de vitale subset; zonder
  // filter draait alles, precies zoals de dagelijkse controle altijd deed.
  const meetAls = (
    sleutel: string,
    naam: string,
    werk: () => Promise<{ status: CheckStatus; detail: string } | string>,
  ) => (!alleen || alleen.has(sleutel) ? meet(sleutel, naam, werk) : Promise.resolve(null));

  checks.push(
    await meetAls("database", "Database (Neon)", async () => {
      await db.execute(sql`SELECT 1`);
      return "Bereikbaar.";
    }),
  );

  checks.push(
    await meetAls("resend", "Mail versturen (Resend)", async () => {
      const key = process.env.RESEND_API_KEY;
      if (!key) return { status: "fout", detail: "RESEND_API_KEY ontbreekt." };
      const res = await fetch("https://api.resend.com/domains", {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(TIJD_MS),
      });
      return res.ok ? "Sleutel geldig." : { status: "fout", detail: `Resend antwoordt ${res.status}.` };
    }),
  );

  checks.push(
    await meetAls("proef-ontzorgd", "Proefmaanden Optimaal ontzorgd: herinneren en afsluiten", async () => {
      const { onderhoudProeven } = await import("./proef-ontzorgd");
      const u = await onderhoudProeven("https://www.wordswap.nl");
      if (u.fouten.length) return { status: "fout", detail: u.fouten.join("; ") };
      const delen = [u.herinnerd.length ? `herinnerd: ${u.herinnerd.join(", ")}` : "", u.verlopen.length ? `afgesloten zonder ja (WhatsApp uit): ${u.verlopen.join(", ")}` : ""].filter(Boolean);
      return delen.length ? delen.join(" · ") : "Niets te doen.";
    }),
  );

  checks.push(
    await meetAls("wp-kopieen", "WordPress-kopieën: herinneren en opruimen", async () => {
      const { onderhoudKopieen, BEWAAR_DAGEN } = await import("./backups");
      const u = await onderhoudKopieen();
      const delen = [
        u.herinnerd.length ? `herinnerd: ${u.herinnerd.join(", ")}` : "",
        u.verwijderd.length ? `opgeruimd na ${BEWAAR_DAGEN} dagen: ${u.verwijderd.join(", ")}` : "",
      ].filter(Boolean);
      if (u.fouten.length) return { status: "fout", detail: u.fouten.join("; ") };
      return delen.length ? delen.join(" · ") : "Niets te doen.";
    }),
  );

  checks.push(
    await meetAls("route-b", "Domeinen bij de hoster (route B)", async () => {
      const { leesDomeinkaart, statusVan } = await import("./route-b");
      const domeinen = Object.keys(await leesDomeinkaart());
      if (domeinen.length === 0) return "Geen domeinen aangemeld.";
      const mis: string[] = [];
      for (const d of domeinen) {
        for (const s of await statusVan(d)) {
          if (s.adresStatus !== "active") mis.push(`${s.adres}: verwijzing ${s.adresStatus} (heeft de hoster een regel weggehaald?)`);
          else if (s.certificaatStatus !== "active") mis.push(`${s.adres}: certificaat ${s.certificaatStatus}`);
        }
      }
      return mis.length ? { status: "fout", detail: mis.join("; ") } : `${domeinen.length} domein(en), verwijzing en certificaat actief.`;
    }),
  );

  checks.push(
    await meetAls("eigen-dns", "Eigen adressen van wordswap.nl buiten de verdeler", async () => {
      // De verdeler staat op de zone wordswap.nl. Zolang onze eigen adressen op
      // "alleen DNS" staan komen ze niet langs Cloudflare en kan er niets gekaapt worden.
      const { eigenAdressenViaCloudflare } = await import("./route-b");
      const oranje = await eigenAdressenViaCloudflare();
      if (oranje === null) return { status: "waarschuwing", detail: "Kon de DNS van wordswap.nl niet lezen (sleutel mist het recht DNS lezen)." };
      return oranje.length
        ? { status: "fout", detail: `Deze adressen lopen via Cloudflare en horen op alleen DNS te staan: ${oranje.join(", ")}.` }
        : "Alle eigen adressen staan op alleen DNS.";
    }),
  );

  checks.push(
    await meetAls("soverin", "Mailbox lezen (Soverin)", async () => {
      const { haalLeadPost } = await import("./soverin");
      await haalLeadPost(["jos@wordswap.nl"], new Date(Date.now() - 60 * 60_000));
      return "Inloggen en zoeken lukt.";
    }),
  );

  checks.push(
    await meetAls("cloudflare", "Cloudflare (sites uitrollen)", async () => {
      const token = process.env.CLOUDFLARE_API_TOKEN;
      if (!token) return { status: "fout", detail: "CLOUDFLARE_API_TOKEN ontbreekt." };
      // Zelfde soort aanroep als de echte deploys, dus dit bewijst wat telt
      const { ACCOUNT } = await import("./cloudflare");
      const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/workers/scripts?per_page=1`,
        { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(TIJD_MS) },
      );
      const data = (await res.json()) as { success?: boolean };
      return data.success ? "Sleutel geldig." : { status: "fout", detail: "Sleutel wordt geweigerd." };
    }),
  );

  checks.push(
    await meetAls("github", "GitHub (klantrepo's)", async () => {
      const { installationToken } = await import("./github");
      await installationToken();
      return "App-toegang werkt.";
    }),
  );

  // Vastgelopen werk: dingen die in een tussenstand blijven hangen zonder
  // dat iemand het merkt. De chat zelf kan niet hangen (tijdbewaker en
  // bewerkingsslot), maar deze drie wel.
  checks.push(
    await meetAls("vast-bouw", "Vastgelopen bouwopdrachten", async () => {
      const r = await db.execute(sql`SELECT count(*)::int AS n FROM bouw_jobs
        WHERE (status = 'bezig' AND bijgewerkt < now() - interval '2 hours')
           OR (status = 'wachtend' AND bijgewerkt < now() - interval '45 minutes')`);
      const n = Number((r.rows[0] as { n?: number })?.n ?? 0);
      return n === 0
        ? "Geen bouwopdrachten blijven hangen."
        : { status: "fout", detail: `${n} bouwopdracht(en) staan te lang op bezig of wachtend. Kijk bij de bouw-jobs in de admin.` };
    }),
  );

  checks.push(
    await meetAls("vast-whatsapp", "Vastgelopen WhatsApp-berichten", async () => {
      const r = await db.execute(sql`SELECT count(*)::int AS n FROM whatsapp_berichten
        WHERE status IN ('wacht', 'bezig') AND ontvangen < now() - interval '15 minutes'`);
      const n = Number((r.rows[0] as { n?: number })?.n ?? 0);
      return n === 0
        ? "Geen berichten blijven hangen."
        : { status: "fout", detail: `${n} WhatsApp-bericht(en) wachten al langer dan een kwartier op verwerking.` };
    }),
  );

  checks.push(
    await meetAls("vast-publicatie", "Mislukte publicaties die blijven staan", async () => {
      const r = await db.execute(sql`SELECT count(*)::int AS n FROM changes
        WHERE status IN ('publicatie_mislukt', 'herstel_mislukt') AND aangemaakt < now() - interval '24 hours'`);
      const n = Number((r.rows[0] as { n?: number })?.n ?? 0);
      return n === 0
        ? "Geen mislukte publicaties blijven staan."
        : { status: "fout", detail: `${n} concept(en) staan al meer dan een dag op publicatie mislukt. De klant ziet zijn wijziging niet live.` };
    }),
  );

  checks.push(
    await meetAls("mollie", "Mollie (betalingen)", async () => {
      const { mollie } = await import("./mollie");
      await mollie("/methods");
      return "Sleutel geldig.";
    }),
  );

  checks.push(
    await meetAls("meta", "Meta-leadkoppeling", async () => {
      const token = process.env.META_LEADS_TOKEN;
      if (!token) return { status: "waarschuwing", detail: "Niet ingesteld (META_LEADS_TOKEN)." };
      const res = await fetch(`https://graph.facebook.com/v21.0/me?access_token=${encodeURIComponent(token)}`, {
        signal: AbortSignal.timeout(TIJD_MS),
      });
      if (!res.ok) return { status: "fout", detail: `Token geweigerd (${res.status}); leads komen niet meer binnen.` };
      return "Token geldig.";
    }),
  );

  checks.push(
    await meetAls("anthropic", "AI (Anthropic)", async () => {
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      await new Anthropic().models.list({ limit: 1 });
      return "API bereikbaar; sleutel geldig.";
    }),
  );

  // Live klantsites: antwoordt het domein met onze deploy-stempel, en staat er
  // een UptimeRobot-monitor op? (De diepe mail/DNS-controle blijft op de
  // klantpagina; hier alleen wat elke dag stil kapot kan gaan.)
  const live = alleen
    ? []
    : await db
        .select({ id: sites.id, naam: sites.naam, domein: sites.domein })
        .from(sites)
        // Onze eigen wordswap.nl is de app zelf, geen uitgerolde klantsite
        .where(and(eq(sites.status, "actief"), isNotNull(sites.domein), ne(sites.githubRepo, "wordswap")))
        .catch(() => []);
  let monitors: string[] | null = null;
  const urKey = process.env.UPTIMEROBOT_API_KEY;
  if (urKey && !alleen) {
    try {
      const res = await fetch("https://api.uptimerobot.com/v2/getMonitors", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ api_key: urKey, format: "json" }),
        signal: AbortSignal.timeout(TIJD_MS),
      });
      const data = (await res.json()) as { stat?: string; monitors?: { url: string }[] };
      monitors = data.stat === "ok" ? (data.monitors ?? []).map((m) => m.url.toLowerCase()) : null;
    } catch {
      monitors = null;
    }
  }
  checks.push(
    await meetAls("uptimerobot", "Bewaking (UptimeRobot)", async () => {
      if (!urKey) return { status: "waarschuwing", detail: "Geen sleutel ingesteld." };
      if (monitors === null) return { status: "fout", detail: "UptimeRobot antwoordt niet of weigert de sleutel." };
      return `${monitors.length} monitor(s) actief.`;
    }),
  );
  for (const site of live) {
    const domein = String(site.domein).replace(/^www\./, "").toLowerCase();
    checks.push(
      await meet(`site-${site.id}`, `Klantsite ${site.naam}`, async () => {
        const res = await fetch(`https://${site.domein}/`, { redirect: "follow", signal: AbortSignal.timeout(TIJD_MS) });
        if (!res.ok) return { status: "fout", detail: `Site antwoordt ${res.status}.` };
        const html = await res.text();
        if (!html.includes("wp2ai-pagina"))
          return { status: "fout", detail: "Site antwoordt, maar toont niet onze uitrol (stempel ontbreekt)." };
        if (monitors !== null && !monitors.some((u) => u.includes(domein)))
          return { status: "waarschuwing", detail: "Site draait, maar er staat geen UptimeRobot-monitor op." };
        return "Draait en wordt bewaakt.";
      }),
    );
  }

  return checks.filter((c): c is CheckUitslag => c !== null);
}

export async function leesRapport(): Promise<GezondheidsRapport | null> {
  try {
    const buf = await leesObject(RAPPORT_SLEUTEL);
    return buf ? (JSON.parse(buf.toString("utf8")) as GezondheidsRapport) : null;
  } catch {
    return null;
  }
}

/** Draait alle checks, bewaart het rapport en mailt Jos bij nieuw rood. */
export async function draaiGezondheid(): Promise<GezondheidsRapport> {
  const vorig = await leesRapport();
  const [checks, versies] = await Promise.all([alleChecks(), versieWaakhond()]);
  const rapport: GezondheidsRapport = { gemetenOp: new Date().toISOString(), checks, versies };
  const rood = nieuwRood(vorig, rapport);
  if (rood.length > 0) {
    try {
      const { mailVanJos, ontsnap } = await import("./wordswap-mail");
      await mailVanJos({
        naar: "jos@wordswap.nl",
        onderwerp: `⚠️ Gezondheid: ${rood.length} onderdeel${rood.length === 1 ? "" : "en"} nieuw rood`,
        html: `<p>Bij de dagelijkse controle ging${rood.length === 1 ? "" : "en"} dit voor het eerst mis:</p><ul>${rood
          .map((r) => `<li>${ontsnap(r)}</li>`)
          .join("")}</ul><p>Zie <a href="https://www.wordswap.nl/admin/gezondheid">het gezondheidsdashboard</a>.</p>`,
      });
    } catch (e) {
      console.error("Gezondheid: rood-melding mailen mislukt:", e);
    }
  }
  await schrijfObject(RAPPORT_SLEUTEL, JSON.stringify(rapport), "application/json").catch((e) =>
    console.error("Gezondheid: rapport bewaren mislukt:", e),
  );
  return rapport;
}

/* ------------------------------------------------------------------ */
/* De kwartierpols: dezelfde meetcode, maar dan elk kwartier en alleen */
/* de vitale onderdelen. De dagelijkse controle blijft het volledige   */
/* overzicht; de pols is er zodat een storing binnen een kwartier een  */
/* mailtje én een appje oplevert in plaats van pas de volgende ochtend.*/
/* ------------------------------------------------------------------ */

export const POLS_SLEUTEL = "intern/gezondheid-pols.json";

/** Wat de pols elk kwartier aanraakt: de vijf vitale diensten plus het
 * vastgelopen werk. Alles erbuiten (klantsites, Mollie, Meta, versies)
 * blijft bij de dagelijkse ronde. */
export const POLS_SET: ReadonlySet<string> = new Set([
  "database",
  "anthropic",
  "resend",
  "cloudflare",
  "github",
  "vast-bouw",
  "vast-whatsapp",
  "vast-publicatie",
]);

export type PolsStand = {
  gemetenOp: string;
  /** sleutel -> "naam: detail" van alles wat bij de vorige pols fout was. */
  fouten: Record<string, string>;
};

/** Welke checks nét kapot gingen en welke nét herstelden, vergeleken met de
 * vorige pols. Alleen overgangen leveren een melding op: een storing die al
 * gemeld is, blijft stil tot hij herstelt. */
export function polsOvergangen(
  vorig: PolsStand | null,
  checks: CheckUitslag[],
): { kapot: CheckUitslag[]; hersteld: string[]; stand: PolsStand } {
  const was = vorig?.fouten ?? {};
  const fouten: Record<string, string> = {};
  for (const c of checks) {
    if (c.status === "fout") fouten[c.sleutel] = `${c.naam}: ${c.detail}`;
  }
  const kapot = checks.filter((c) => c.status === "fout" && !(c.sleutel in was));
  const hersteld = Object.keys(was)
    .filter((sleutel) => !(sleutel in fouten))
    .map((sleutel) => was[sleutel]);
  return { kapot, hersteld, stand: { gemetenOp: new Date().toISOString(), fouten } };
}

/** Storing of herstel melden: altijd per mail, en als er een nummer is
 * ingesteld ook met een appje. WhatsApp kan weigeren buiten het
 * 24-uursvenster; dan blijft de mail het vangnet. */
async function meldStoring(onderwerp: string, regels: string[]): Promise<void> {
  const merk = process.env.VERCEL_ENV === "production" ? "" : "[dev] ";
  try {
    const { mailVanJos, ontsnap } = await import("./wordswap-mail");
    await mailVanJos({
      naar: "jos@wordswap.nl",
      onderwerp: `${merk}${onderwerp}`,
      html: `<ul>${regels.map((r) => `<li>${ontsnap(r)}</li>`).join("")}</ul><p>Zie <a href="https://www.wordswap.nl/admin/gezondheid">het gezondheidsdashboard</a>.</p>`,
    });
  } catch (e) {
    console.error("Pols: melding mailen mislukt:", e);
  }
  const nummer = process.env.WHATSAPP_STORING_NUMMER;
  if (nummer) {
    try {
      const { stuurTekst } = await import("./whatsapp/api");
      await stuurTekst(nummer, `${merk}${onderwerp}\n${regels.map((r) => `• ${r}`).join("\n")}`);
    } catch (e) {
      console.error("Pols: appje mislukt (mail is het vangnet):", e);
    }
  }
}

export async function draaiPols(): Promise<{
  checks: number;
  fouten: number;
  gemeld: number;
}> {
  const checks = await alleChecks(POLS_SET);

  // De pols bewaakt ook de dagelijkse controle zelf: is het laatste rapport
  // ouder dan 26 uur, dan is die cron stilletjes gestopt.
  const rapport = await leesRapport().catch(() => null);
  const uurOud = rapport
    ? (Date.now() - new Date(rapport.gemetenOp).getTime()) / 3_600_000
    : Infinity;
  checks.push(
    uurOud <= 26
      ? { sleutel: "dagcontrole", naam: "Dagelijkse controle", status: "ok", detail: `Laatste rapport ${Math.round(uurOud)} uur oud.` }
      : {
          sleutel: "dagcontrole",
          naam: "Dagelijkse controle",
          status: "fout",
          detail: rapport
            ? `Laatste rapport is ${Math.round(uurOud)} uur oud; de dagelijkse cron draait niet meer.`
            : "Er is nog nooit een dagrapport geschreven.",
        },
  );

  const vorig: PolsStand | null = await leesObject(POLS_SLEUTEL)
    .then((t) => (t ? (JSON.parse(t.toString()) as PolsStand) : null))
    .catch(() => null);
  const { kapot, hersteld, stand } = polsOvergangen(vorig, checks);

  if (kapot.length > 0) {
    await meldStoring(
      `🔴 Storing: ${kapot.map((c) => c.naam).join(", ")}`,
      kapot.map((c) => `${c.naam}: ${c.detail}`),
    );
  }
  if (hersteld.length > 0) {
    await meldStoring(`✅ Opgelost: ${hersteld.length} onderdeel${hersteld.length === 1 ? "" : "en"} weer goed`, hersteld);
  }

  await schrijfObject(POLS_SLEUTEL, JSON.stringify(stand), "application/json").catch((e) =>
    console.error("Pols: stand bewaren mislukt:", e),
  );
  return { checks: checks.length, fouten: Object.keys(stand.fouten).length, gemeld: kapot.length + hersteld.length };
}
