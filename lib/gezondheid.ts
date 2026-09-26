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

export async function alleChecks(): Promise<CheckUitslag[]> {
  const checks: CheckUitslag[] = [];

  checks.push(
    await meet("database", "Database (Neon)", async () => {
      await db.execute(sql`SELECT 1`);
      return "Bereikbaar.";
    }),
  );

  checks.push(
    await meet("resend", "Mail versturen (Resend)", async () => {
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
    await meet("soverin", "Mailbox lezen (Soverin)", async () => {
      const { haalLeadPost } = await import("./soverin");
      await haalLeadPost(["jos@wordswap.nl"], new Date(Date.now() - 60 * 60_000));
      return "Inloggen en zoeken lukt.";
    }),
  );

  checks.push(
    await meet("cloudflare", "Cloudflare (sites uitrollen)", async () => {
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
    await meet("github", "GitHub (klantrepo's)", async () => {
      const { installationToken } = await import("./github");
      await installationToken();
      return "App-toegang werkt.";
    }),
  );

  checks.push(
    await meet("mollie", "Mollie (betalingen)", async () => {
      const { mollie } = await import("./mollie");
      await mollie("/methods");
      return "Sleutel geldig.";
    }),
  );

  checks.push(
    await meet("meta", "Meta-leadkoppeling", async () => {
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
    await meet("anthropic", "AI (Anthropic)", async () => {
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      await new Anthropic().models.list({ limit: 1 });
      return "API bereikbaar; sleutel geldig.";
    }),
  );

  // Live klantsites: antwoordt het domein met onze deploy-stempel, en staat er
  // een UptimeRobot-monitor op? (De diepe mail/DNS-controle blijft op de
  // klantpagina; hier alleen wat elke dag stil kapot kan gaan.)
  const live = await db
    .select({ id: sites.id, naam: sites.naam, domein: sites.domein })
    .from(sites)
    // Onze eigen wordswap.nl is de app zelf, geen uitgerolde klantsite
    .where(and(eq(sites.status, "actief"), isNotNull(sites.domein), ne(sites.githubRepo, "wordswap")))
    .catch(() => []);
  let monitors: string[] | null = null;
  const urKey = process.env.UPTIMEROBOT_API_KEY;
  if (urKey) {
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
    await meet("uptimerobot", "Bewaking (UptimeRobot)", async () => {
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

  return checks;
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
