import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { formulierInzendingen, sites } from "@/db/schema";
import { verstuurSiteMail } from "@/lib/mail";

const ontsnap = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function POST(req: Request) {
  const velden: Record<string, string> = {};
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("form")) {
    const form = await req.formData();
    for (const [k, v] of form.entries()) velden[k] = String(v).slice(0, 2000);
  } else {
    return NextResponse.json({ error: "Ongeldig verzoek" }, { status: 400 });
  }

  const siteRepo = (velden._site ?? "").slice(0, 100);
  const honeypot = velden._extra ?? "";
  const formulier =
    (velden._formulier ?? "contact")
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "contact";
  // Eigen bedankt-pagina: alleen een pad op de eigen site (nooit een andere host)
  const bedanktPad = /^\/[a-z0-9\-\/]{0,100}$/i.test(velden._bedankt ?? "")
    ? (velden._bedankt as string)
    : null;
  delete velden._site;
  delete velden._extra;
  delete velden._formulier;
  delete velden._bedankt;

  const [site] = siteRepo
    ? await db.select().from(sites).where(eq(sites.githubRepo, siteRepo))
    : [];

  // Rem tegen spam/mail-bombing: max 30 inzendingen per site per uur.
  // Daarboven doen we alsof alles goed ging (bots niets wijzer maken),
  // maar slaan we niets op en mailen we niet.
  let binnenLimiet = true;
  if (siteRepo) {
    const { and, gte, sql } = await import("drizzle-orm");
    const uurGeleden = new Date(Date.now() - 60 * 60 * 1000);
    const [telling] = await db
      .select({ n: sql<number>`count(*)` })
      .from(formulierInzendingen)
      .where(
        and(
          eq(formulierInzendingen.siteRepo, siteRepo),
          gte(formulierInzendingen.aangemaakt, uurGeleden)
        )
      );
    binnenLimiet = Number(telling?.n ?? 0) < 30;
  }

  // Honeypot gevuld = bot: stilletjes accepteren zonder opslaan of mailen
  const echt = siteRepo && !honeypot && binnenLimiet && Object.keys(velden).length > 0;
  if (echt) {
    await db
      .insert(formulierInzendingen)
      .values({ siteRepo, formulier, velden })
      .catch(() => {});

    const siteNaam = site?.naam ?? "de website";
    const veldenHtml = Object.entries(velden)
      .map(([k, v]) => `<p><strong>${ontsnap(k)}:</strong> ${ontsnap(v)}</p>`)
      .join("");

    // Bevestiging naar de invuller (als er een e-mailveld is ingevuld)
    const invullerEmail = Object.entries(velden).find(
      ([k, v]) => /mail/i.test(k) && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)
    )?.[1];
    // Webinar-inschrijving? Zoek de sessie op voor datum/link + agenda-bestand.
    let webinarInfo = "";
    if (formulier === "webinar" && velden.webinar) {
      const { webinars } = await import("@/db/schema");
      const [w] = await db.select().from(webinars).where(eq(webinars.titel, velden.webinar));
      if (w) {
        const wanneer = w.wanneer.toLocaleString("nl-NL", {
          weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
        });
        webinarInfo = `<p><strong>Wanneer:</strong> ${ontsnap(wanneer)}</p>${
          w.meetLink ? `<p><strong>Deelnamelink:</strong> <a href="${ontsnap(w.meetLink)}">${ontsnap(w.meetLink)}</a></p>` : "<p>De deelnamelink sturen we je kort van tevoren toe.</p>"
        }`;
      }
    }

    if (invullerEmail) {
      if (formulier === "webinar") {
        await verstuurSiteMail({
          site: site ?? null,
          naar: invullerEmail,
          onderwerp: `Je bent aangemeld voor het webinar van ${siteNaam}`,
          html: `<p>Beste ${ontsnap(velden.naam ?? "")},</p><p>Leuk dat je erbij bent! Je plek voor het webinar <strong>${ontsnap(velden.webinar ?? "")}</strong> is gereserveerd.</p>${webinarInfo}<p>Tot dan! Zet het vast in je agenda — een reply op deze mail komt gewoon bij ons aan als je vragen hebt.</p>`,
          antwoordNaar: site?.notificatieEmail ?? undefined,
        });
      } else {
        // Uit naam van het bedrijf; antwoorden gaan rechtstreeks naar het bedrijf
        await verstuurSiteMail({
          site: site ?? null,
          naar: invullerEmail,
          onderwerp: `Bedankt voor uw bericht aan ${siteNaam}`,
          html: `<p>Beste ${ontsnap(velden.naam ?? "")},</p><p>Bedankt voor uw bericht aan ${ontsnap(siteNaam)}. We hebben het goed ontvangen en nemen zo snel mogelijk contact met u op.</p><hr>${veldenHtml}`,
          antwoordNaar: site?.notificatieEmail ?? undefined,
        });
      }
    }

    // Melding naar de site-eigenaar; antwoorden gaat rechtstreeks naar de invuller
    if (site?.notificatieEmail) {
      await verstuurSiteMail({
        site,
        naar: site.notificatieEmail,
        onderwerp: `Nieuwe ${formulier}-inzending via ${siteNaam}`,
        html: `<p>Er is een nieuw bericht binnengekomen via het formulier "${ontsnap(formulier)}" op ${ontsnap(siteNaam)}:</p>${veldenHtml}<p>Alle inzendingen staan ook in je WordSwap-portaal.</p>`,
        antwoordNaar: invullerEmail,
      });
    }
  }

  // Eigen bedankt-pagina van de site? Daarheen doorsturen.
  if (bedanktPad && site?.domein) {
    return NextResponse.redirect(`https://${site.domein}${bedanktPad}`, 303);
  }

  return new Response(
    `<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Bedankt voor uw bericht</title><style>body{font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#fafaf9;color:#292524}main{text-align:center;padding:2rem}h1{font-size:1.6rem}a{color:#6d28d9}</style></head><body><main><h1>Bedankt voor uw bericht!</h1><p>We hebben uw bericht goed ontvangen en nemen zo snel mogelijk contact met u op.</p><p><a href="javascript:history.back()">← Terug naar de website</a></p></main></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}
