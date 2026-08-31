import { auth } from "@clerk/nextjs/server";
import { and, desc, eq } from "drizzle-orm";
import { readFile, mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { changes, messages, sites, usage } from "@/db/schema";
import { isBeheerder } from "@/lib/auth";
import { deployMapNaarCloudflare } from "@/lib/cloudflare";
import { maakBranch, pushBestanden } from "@/lib/github";
import { alleCssBestanden, alleHtmlBestanden, laadWerkmap, ruimWerkmapOp } from "@/lib/werkmap";

export const maxDuration = 120;

/** Pad in de site bepalen uit wat het voorbeeldvenster meldt ("/", "/contact/"). */
function bestandVoorPad(pad: string): string[] {
  const schoon = pad.replace(/^\/+/, "").replace(/[?#].*$/, "");
  if (!schoon || schoon === "/") return ["index.html"];
  if (/\.html?$/i.test(schoon)) return [schoon];
  const kaal = schoon.replace(/\/+$/, "");
  return [`${kaal}/index.html`, `${kaal}.html`];
}

/** Maakt relatieve verwijzingen (href/src/srcset) absoluut t.o.v. de oude map.
 * Nodig als een pagina naar een andere map verhuist: anders breken CSS,
 * afbeeldingen en links. */
function maakPadenAbsoluut(html: string, oudeMap: string): string {
  const basis = oudeMap ? `/${oudeMap.replace(/\/+$/, "")}/` : "/";
  const absoluut = (waarde: string) => {
    const w = waarde.trim();
    if (
      !w ||
      /^(https?:|\/\/|\/|#|mailto:|tel:|data:|javascript:)/i.test(w)
    ) {
      return waarde;
    }
    // ../ en ./ netjes oplossen
    const delen = (basis + w).split("/");
    const stapel: string[] = [];
    for (const deel of delen) {
      if (deel === "" || deel === ".") continue;
      if (deel === "..") stapel.pop();
      else stapel.push(deel);
    }
    return "/" + stapel.join("/");
  };
  return html.replace(
    /\b(href|src|poster)=(["'])([^"']*)\2/gi,
    (heel, attr, quote, waarde) => `${attr}=${quote}${absoluut(waarde)}${quote}`
  );
}

const titelUit = (html: string) => html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "";
const omschrijvingUit = (html: string) =>
  html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i)?.[1] ?? "";

/** Leest titel/omschrijving/adres van één pagina (GET) of past ze aan (POST). */
export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  const url = new URL(req.url);
  const siteId = Number(url.searchParams.get("siteId"));
  const pad = url.searchParams.get("pad") ?? "/";

  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  if (!site || (!site.isDemo && site.clerkUserId !== userId && !(await isBeheerder()))) {
    return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  }

  const [openConcept] = await db
    .select()
    .from(changes)
    .where(
      site.isDemo
        ? and(eq(changes.siteId, site.id), eq(changes.status, "concept"), eq(changes.clerkUserId, userId))
        : and(eq(changes.siteId, site.id), eq(changes.status, "concept"))
    )
    .orderBy(desc(changes.id))
    .limit(1);

  const { demoBranch } = await import("@/lib/demo");
  const branch = openConcept?.branch ?? (site.isDemo ? demoBranch(userId) : undefined);

  let werkmap: string | null = null;
  try {
    werkmap = await laadWerkmap(site.githubRepo, branch).catch(() =>
      laadWerkmap(site.githubRepo)
    );
    for (const kandidaat of bestandVoorPad(pad)) {
      const inhoud = await readFile(path.join(werkmap, kandidaat), "utf8").catch(() => null);
      if (inhoud === null) continue;
      return NextResponse.json({
        bestand: kandidaat,
        titel: titelUit(inhoud),
        omschrijving: omschrijvingUit(inhoud),
        adres: "/" + kandidaat.replace(/index\.html$/i, "").replace(/\.html$/i, ""),
      });
    }
    return NextResponse.json({ error: "Pagina niet gevonden" }, { status: 404 });
  } finally {
    if (werkmap) await ruimWerkmapOp(werkmap).catch(() => {});
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const body = (await req.json()) as {
    siteId: number;
    bestand: string;
    titel: string;
    omschrijving: string;
    adres?: string;
  };
  const [site] = await db.select().from(sites).where(eq(sites.id, body.siteId));
  if (!site || (!site.isDemo && site.clerkUserId !== userId && !(await isBeheerder()))) {
    return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  }
  if ((site.status === "gepauzeerd" || site.status === "opgezegd") && !(await isBeheerder())) {
    return NextResponse.json({ error: "Site niet actief" }, { status: 403 });
  }
  if (!body.bestand || body.bestand.includes("..")) {
    return NextResponse.json({ error: "Ongeldig" }, { status: 400 });
  }

  const [openConcept] = await db
    .select()
    .from(changes)
    .where(
      site.isDemo
        ? and(eq(changes.siteId, site.id), eq(changes.status, "concept"), eq(changes.clerkUserId, userId))
        : and(eq(changes.siteId, site.id), eq(changes.status, "concept"))
    )
    .orderBy(desc(changes.id))
    .limit(1);

  const { demoBranch, demoWorker } = await import("@/lib/demo");
  const eigenBranch = site.isDemo ? demoBranch(userId) : null;
  const wvNaam = site.isDemo
    ? demoWorker(site.githubRepo, userId)
    : site.netlifySiteId
      ? `wv-${site.netlifySiteId}`
      : null;

  let werkmap: string | null = null;
  try {
    werkmap = openConcept?.branch
      ? await laadWerkmap(site.githubRepo, openConcept.branch)
      : eigenBranch
        ? await laadWerkmap(site.githubRepo, eigenBranch).catch(() => laadWerkmap(site.githubRepo))
        : await laadWerkmap(site.githubRepo);

    const oudPad = body.bestand;
    let inhoud = await readFile(path.join(werkmap, oudPad), "utf8");
    const gewijzigd: { pad: string; inhoud: Buffer }[] = [];
    const uitleg: string[] = [];

    // Titel
    const nieuweTitel = (body.titel ?? "").trim();
    if (nieuweTitel && nieuweTitel !== titelUit(inhoud)) {
      inhoud = /<title[^>]*>[\s\S]*?<\/title>/i.test(inhoud)
        ? inhoud.replace(/<title[^>]*>[\s\S]*?<\/title>/i, `<title>${nieuweTitel}</title>`)
        : inhoud.replace(/<head[^>]*>/i, (m) => `${m}\n<title>${nieuweTitel}</title>`);
      uitleg.push("de paginatitel");
    }

    // Meta-omschrijving
    const nieuweOms = (body.omschrijving ?? "").trim();
    if (nieuweOms && nieuweOms !== omschrijvingUit(inhoud)) {
      inhoud = /<meta[^>]+name=["']description["'][^>]*>/i.test(inhoud)
        ? inhoud.replace(
            /<meta[^>]+name=["']description["'][^>]*>/i,
            `<meta name="description" content="${nieuweOms.replace(/"/g, "&quot;")}">`
          )
        : inhoud.replace(
            /<\/title>/i,
            `</title>\n<meta name="description" content="${nieuweOms.replace(/"/g, "&quot;")}">`
          );
      uitleg.push("de omschrijving voor Google");
    }

    await writeFile(path.join(werkmap, oudPad), inhoud);
    gewijzigd.push({ pad: oudPad, inhoud: Buffer.from(inhoud) });

    // Adres wijzigen: verhuizen + 301 + interne links + sitemap
    const huidigAdres = "/" + oudPad.replace(/index\.html$/i, "").replace(/\.html$/i, "");
    let nieuwPad = oudPad;
    const gevraagdAdres = (body.adres ?? "").trim().toLowerCase();
    if (
      gevraagdAdres &&
      gevraagdAdres !== huidigAdres &&
      /^\/[a-z0-9\-\/]*$/.test(gevraagdAdres) &&
      oudPad !== "index.html"
    ) {
      const kaal = gevraagdAdres.replace(/^\/+|\/+$/g, "");
      nieuwPad = `${kaal}/index.html`;
      // Relatieve verwijzingen (stijl.css, afbeeldingen, links) absoluut maken —
      // anders breekt de pagina zodra hij in een andere map staat
      const oudeMap = oudPad.includes("/") ? oudPad.slice(0, oudPad.lastIndexOf("/")) : "";
      inhoud = maakPadenAbsoluut(inhoud, oudeMap);
      await mkdir(path.join(werkmap, kaal), { recursive: true });
      await rename(path.join(werkmap, oudPad), path.join(werkmap, nieuwPad));
      await writeFile(path.join(werkmap, nieuwPad), inhoud);
      gewijzigd[0] = { pad: nieuwPad, inhoud: Buffer.from(inhoud) };

      // 301-doorverwijzing
      const redirectsPad = path.join(werkmap, "_redirects");
      const bestaand = await readFile(redirectsPad, "utf8").catch(() => "");
      const regel = `${huidigAdres.replace(/\/$/, "")}/ ${gevraagdAdres.replace(/\/$/, "")}/ 301`;
      const nieuweRedirects = bestaand.includes(regel)
        ? bestaand
        : `${bestaand.replace(/\s*$/, "")}\n${regel}\n`.replace(/^\n/, "");
      await writeFile(redirectsPad, nieuweRedirects);
      gewijzigd.push({ pad: "_redirects", inhoud: Buffer.from(nieuweRedirects) });

      // Interne links bijwerken (html + css + sitemap)
      const oudVarianten = [
        `"${huidigAdres.replace(/\/$/, "")}/"`,
        `"${huidigAdres.replace(/\/$/, "")}"`,
        `'${huidigAdres.replace(/\/$/, "")}/'`,
        `"${oudPad}"`,
        `"/${oudPad}"`,
      ];
      const doel = `${gevraagdAdres.replace(/\/$/, "")}/`;
      const teDoorzoeken = [
        ...(await alleHtmlBestanden(werkmap)),
        ...(await alleCssBestanden(werkmap)),
        "sitemap.xml",
      ];
      for (const bron of teDoorzoeken) {
        if (bron === nieuwPad) continue;
        const bronPad = path.join(werkmap, bron);
        const bronInhoud = await readFile(bronPad, "utf8").catch(() => null);
        if (bronInhoud === null) continue;
        let nieuw = bronInhoud;
        for (const variant of oudVarianten) {
          const quote = variant[0];
          nieuw = nieuw.split(variant).join(`${quote}${doel}${quote}`);
        }
        // sitemap gebruikt volledige URL's
        nieuw = nieuw.split(`${huidigAdres.replace(/\/$/, "")}/</loc>`).join(`${doel}</loc>`);
        if (nieuw !== bronInhoud) {
          await writeFile(bronPad, nieuw);
          gewijzigd.push({ pad: bron, inhoud: Buffer.from(nieuw) });
        }
      }
      uitleg.push(`het webadres (oude adres verwijst automatisch door)`);
    }

    if (gewijzigd.length === 0 || uitleg.length === 0) {
      return NextResponse.json({ error: "Geen wijziging" }, { status: 400 });
    }

    const wvDeploy = wvNaam
      ? deployMapNaarCloudflare(werkmap, wvNaam, { subdomeinAanzetten: site.isDemo }).catch((e) =>
          console.error("Werkversie-deploy mislukt:", e)
        )
      : Promise.resolve();

    const omschrijvingKort = `Vindbaarheid bijgewerkt: ${uitleg.join(", ")}`;
    const paden = gewijzigd.map((g) => g.pad);

    let changeId: number;
    let previewUrl: string;
    if (openConcept) {
      await pushBestanden(site.githubRepo, gewijzigd, omschrijvingKort, openConcept.branch);
      await db
        .update(changes)
        .set({
          bestanden: [
            ...new Set([
              ...(Array.isArray(openConcept.bestanden) ? (openConcept.bestanden as string[]) : []),
              ...paden,
            ]),
          ],
          promptTekst: `${openConcept.promptTekst} → ${omschrijvingKort}`.slice(0, 500),
        })
        .where(eq(changes.id, openConcept.id));
      changeId = openConcept.id;
      previewUrl = openConcept.previewUrl ?? `/preview/${openConcept.id}/`;
    } else {
      const branch = eigenBranch ?? `wijziging-${Date.now()}`;
      let baseSha: string | null = null;
      if (eigenBranch) {
        const { gh, GITHUB_ORG } = await import("@/lib/github");
        try {
          const ref = (await gh(
            `/repos/${GITHUB_ORG}/${site.githubRepo}/git/ref/heads/${branch}`
          )) as { object: { sha: string } };
          baseSha = ref.object.sha;
        } catch {
          await maakBranch(site.githubRepo, branch);
        }
      } else {
        await maakBranch(site.githubRepo, branch);
      }
      await pushBestanden(site.githubRepo, gewijzigd, omschrijvingKort, branch);
      const [row] = await db
        .insert(changes)
        .values({
          siteId: site.id,
          branch,
          promptTekst: omschrijvingKort,
          bestanden: paden,
          clerkUserId: userId,
          baseSha,
        })
        .returning({ id: changes.id });
      changeId = row.id;
      previewUrl = `/preview/${row.id}/`;
      await db.update(changes).set({ previewUrl }).where(eq(changes.id, row.id));

      if (!site.isDemo) {
        const maand = new Date().toISOString().slice(0, 7);
        const [verbruik] = await db
          .select()
          .from(usage)
          .where(and(eq(usage.siteId, site.id), eq(usage.maand, maand)));
        if (verbruik) {
          await db
            .update(usage)
            .set({ wijzigingen: verbruik.wijzigingen + 1 })
            .where(eq(usage.id, verbruik.id));
        } else {
          await db.insert(usage).values({ siteId: site.id, maand, wijzigingen: 1 });
        }
      }
    }

    const reply =
      `Vindbaarheid bijgewerkt: ${uitleg.join(" en ")}.` +
      (nieuwPad !== oudPad
        ? " Het oude adres blijft werken en stuurt automatisch door naar het nieuwe, dus je positie in Google blijft behouden. Ook alle links op je site (menu, footer, knoppen) wijzen nu naar het nieuwe adres."
        : "");
    await db.insert(messages).values([
      { siteId: site.id, rol: "klant" as const, tekst: `[Zelf aangepast] ${omschrijvingKort}`, clerkUserId: userId },
      { siteId: site.id, rol: "assistent" as const, tekst: reply, clerkUserId: userId },
    ]);

    await wvDeploy;
    return NextResponse.json({
      ok: true,
      reply,
      previewUrl,
      changeId,
      bestanden: paden,
      nieuwAdres: nieuwPad !== oudPad ? gevraagdAdres.replace(/\/?$/, "/") : undefined,
    });
  } finally {
    if (werkmap) await ruimWerkmapOp(werkmap).catch(() => {});
  }
}
