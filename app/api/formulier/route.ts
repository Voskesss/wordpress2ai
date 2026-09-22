import { eq, type SQL } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { formulierInzendingen, sites } from "@/db/schema";
import {
  beoordeel,
  ipAfdruk,
  ipUitKoppen,
  veldenVoorMail,
  type RemOordeel,
} from "@/lib/formulier-rem";
import { verstuurSiteMail } from "@/lib/mail";
import { magBewaren } from "@/lib/formulier-privacy";

const ontsnap = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Bijlagen (bv. cv bij een sollicitatie): alleen veilige documenttypen,
// max 5 MB per bestand en max 2 bestanden per inzending.
const BIJLAGE_EXTENSIES = /\.(pdf|docx?|odt|rtf|txt|jpe?g|png)$/i;
const BIJLAGE_MAX_BYTES = 5 * 1024 * 1024;
const BIJLAGE_MAX_AANTAL = 2;

/** Tekst afkappen zonder een emoji of ander meerdelig teken doormidden te
 * knippen (een halve emoji is ongeldige tekst en laat de opslag stuklopen). */
function kort(s: string, max: number): string {
  return [...s].slice(0, max).join("");
}

export async function POST(req: Request) {
  const velden: Record<string, string> = {};
  const bijlagen: { bestandsnaam: string; inhoud: Buffer }[] = [];
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("form")) {
    const form = await req.formData();
    for (const [k, v] of form.entries()) {
      if (typeof v === "object" && v && "arrayBuffer" in v) {
        const bestand = v as File;
        if (!bestand.size) continue; // leeg uploadveld
        const naam = (bestand.name || "bijlage")
          .replace(/[^\w. -]+/g, "_")
          .slice(0, 120);
        if (
          bijlagen.length < BIJLAGE_MAX_AANTAL &&
          bestand.size <= BIJLAGE_MAX_BYTES &&
          BIJLAGE_EXTENSIES.test(naam)
        ) {
          bijlagen.push({
            bestandsnaam: naam,
            inhoud: Buffer.from(await bestand.arrayBuffer()),
          });
          velden[k] =
            `${naam} (${Math.round(bestand.size / 1024)} kB, meegestuurd als bijlage)`;
        } else {
          velden[k] =
            `${naam} — geweigerd (te groot of geen toegestaan bestandstype)`;
        }
      } else {
        velden[k] = kort(String(v), 2000);
      }
    }
  } else {
    return NextResponse.json({ error: "Ongeldig verzoek" }, { status: 400 });
  }

  const siteRepo = (velden._site ?? "").slice(0, 100);
  const honeypot = velden._extra ?? "";
  // The first-party websitecheck requests JSON so it can show errors without losing input.
  const websitecheckJson =
    siteRepo === "wordswap" &&
    velden._formulier === "kennismaken" &&
    (req.headers.get("accept") ?? "").includes("application/json");
  if (
    websitecheckJson &&
    (!velden.naam?.trim() ||
      !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(velden.email ?? "") ||
      !velden.website?.trim())
  ) {
    return NextResponse.json(
      { error: "Vul je naam, e-mailadres en website in." },
      { status: 400 },
    );
  }
  if (
    websitecheckJson &&
    (velden.contactvoorkeur ?? "").includes("bellen") &&
    (velden.telefoon ?? "").replace(/\D/g, "").length < 8
  ) {
    return NextResponse.json(
      { error: "Je koos voor bellen: vul een geldig telefoonnummer in." },
      { status: 400 },
    );
  }

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
  // Eigen bevestigingstekst voor de mail aan de invuller (per formulier
  // instelbaar via een verborgen veld; de AI vult hem passend in bij het
  // bouwen en de eigenaar kan hem via de chat wijzigen). Platte tekst.
  const eigenBevestiging = kort((velden._bevestiging ?? "").trim(), 600) || null;
  delete velden._site;
  delete velden._extra;
  delete velden._formulier;
  delete velden._bedankt;
  delete velden._bevestiging;
  // Invalshoek van de advertentie (/webinar?hoek=...): leesbaar meesturen, zodat
  // in de melding en de leadlijst te zien is welke snaar iemand raakte
  const hoek =
    siteRepo === "wordswap"
      ? (await import("@/lib/hoeken")).vindHoek(velden._hoek)
      : null;
  const hoekNaam = hoek?.naam ?? null;
  delete velden._hoek;
  if (hoekNaam) velden.invalshoek = hoekNaam;

  const [site] = siteRepo
    ? await db.select().from(sites).where(eq(sites.githubRepo, siteRepo))
    : [];

  // Rem tegen spam en mail-misbruik: per site, per afzender en over alles
  // samen (zie lib/formulier-rem). Boven een grens doen we alsof alles goed
  // ging — bots niets wijzer maken — maar slaan we niets op en mailen we niet.
  // Een onbekende sitecode bewaren we wél, maar mailen we niet over: anders
  // kan iemand met een verzonnen code mail vanaf ons adres laten versturen.
  const afdruk = ipAfdruk(ipUitKoppen(req.headers));
  let oordeel: RemOordeel = { opslaan: false, mailen: false, reden: "ok" };
  let eersteVanDitUur = false;
  if (siteRepo) {
    const { and, gte, sql } = await import("drizzle-orm");
    const uurGeleden = new Date(Date.now() - 60 * 60 * 1000);
    const sinds = gte(formulierInzendingen.aangemaakt, uurGeleden);
    const tel = async (extra?: SQL) => {
      const [rij] = await db
        .select({ n: sql<number>`count(*)` })
        .from(formulierInzendingen)
        .where(extra ? and(extra, sinds) : sinds);
      return Number(rij?.n ?? 0);
    };
    const perSite = await tel(eq(formulierInzendingen.siteRepo, siteRepo));
    eersteVanDitUur = perSite === 0;
    oordeel = beoordeel({
      siteBestaat: Boolean(site),
      perSite,
      perIp: afdruk
        ? await tel(eq(formulierInzendingen.ipAfdruk, afdruk))
        : null,
      totaal: await tel(),
    });
  }

  // Honeypot gevuld = bot: stilletjes accepteren zonder opslaan of mailen
  const echt =
    siteRepo && !honeypot && oordeel.opslaan && Object.keys(velden).length > 0;
  if (websitecheckJson && !oordeel.opslaan)
    return NextResponse.json(
      { error: "Probeer het later opnieuw." },
      { status: 429 },
    );
  // Webinar-inschrijving: de gekozen sessie opzoeken (op id; oude formulieren
  // sturen nog de titel) en een leesbare naam bewaren, zodat admin en mails
  // altijd weten om welke datum het gaat — ook als er meerdere webinars
  // dezelfde titel hebben.
  let webinarSessie: { id: number; titel: string; wanneer: Date; meetLink: string | null } | null = null;
  if (formulier === "webinar" && (velden.webinar_id || velden.webinar)) {
    const { webinars } = await import("@/db/schema");
    const idNum = Number(velden.webinar_id);
    const [w] = Number.isInteger(idNum) && idNum > 0
      ? await db.select().from(webinars).where(eq(webinars.id, idNum))
      : await db.select().from(webinars).where(eq(webinars.titel, String(velden.webinar)));
    if (w) {
      webinarSessie = w;
      const { webinarLabel } = await import("@/lib/webinar");
      velden.webinar_id = String(w.id);
      velden.webinar = webinarLabel(w);
    }
  }

  if (echt) {
    let opgeslagen = true;
    // Meegestuurde bestanden bewaren, zodat de eigenaar ze later nog kan
    // downloaden. Ze gaan naar onze eigen opslag; het adres blijft in de
    // database en wordt nooit in een pagina getoond — downloaden loopt via een
    // route die eerst controleert of je bij deze site hoort.
    const bewaardeBijlagen: { naam: string; url: string; bytes: number }[] = [];
    // Staat deze site op "niets bewaren", dan gaat de inhoud nergens heen
    // behalve in de mail naar de eigenaar. We bewaren wel dát er een bericht
    // was: zonder die regel telt de spamrem niets meer en is het formulier een
    // open doorgeefluik. Zie lib/formulier-privacy.ts.
    const bewaren = magBewaren(site?.formulierPrivacy);
    const blobToken =
      process.env.BLOBEU_READ_WRITE_TOKEN ?? process.env.BLOB_READ_WRITE_TOKEN;
    if (bewaren && bijlagen.length && blobToken) {
      try {
        const { put } = await import("@vercel/blob");
        for (const b of bijlagen) {
          const res = await put(
            `inzendingen/${siteRepo}/${Date.now()}-${b.bestandsnaam}`,
            b.inhoud,
            { access: "public", token: blobToken, addRandomSuffix: true },
          );
          bewaardeBijlagen.push({
            naam: b.bestandsnaam,
            url: res.url,
            bytes: b.inhoud.length,
          });
        }
      } catch (e) {
        console.error("Bijlage bewaren mislukt:", e);
      }
    }

    await db
      .insert(formulierInzendingen)
      .values({
        siteRepo,
        formulier,
        velden: bewaren ? velden : {},
        bijlagen: bewaardeBijlagen,
        ipAfdruk: afdruk,
        inhoudBewaard: bewaren,
      })
      .catch(() => {
        opgeslagen = false;
      });
    if (websitecheckJson && !opgeslagen)
      return NextResponse.json(
        { error: "Opslaan is niet gelukt." },
        { status: 503 },
      );

    // Onbekende sitecode: bewaard, maar niemand krijgt er bericht van. Dat wil
    // je weten — het is óf een hernoemde repo (dan mist een klant zijn mail),
    // óf iemand die ons als postkantoor probeert te gebruiken. Eén seintje per
    // uur per code: de teller hierboven stond dan nog op nul.
    if (oordeel.reden === "site-onbekend" && eersteVanDitUur) {
      const { after } = await import("next/server");
      const code = siteRepo;
      after(async () => {
        const { mailVanJos } = await import("@/lib/wordswap-mail");
        const merk = process.env.VERCEL_ENV === "production" ? "" : "[dev] ";
        await mailVanJos({
          naar: "jos@wordswap.nl",
          onderwerp: `${merk}⚠️ Inzending op onbekende sitecode "${code}"`,
          html: `<p>Er kwam een inzending binnen met sitecode <strong>${ontsnap(code)}</strong> (formulier "${ontsnap(formulier)}"), maar die code staat niet in de sites-tabel.</p><p>De inzending is bewaard, maar er ging géén bevestiging naar de invuller en géén melding naar een eigenaar. Is de repo hernoemd? Zet de code dan gelijk, anders mist deze klant zijn berichten.</p>`,
          bcc: false,
        }).catch((e) => console.error("Seintje onbekende sitecode:", e));
      });
    }

    const siteNaam = site?.naam ?? "de website";
    // In de mail een beknopte weergave (zie lib/formulier-rem); het volledige
    // bericht staat altijd in het portaal.
    const voorMail = veldenVoorMail(velden);
    const veldenHtml =
      voorMail.velden
        .map(([k, v]) => `<p><strong>${ontsnap(k)}:</strong> ${ontsnap(v)}</p>`)
        .join("") +
      (voorMail.afgekapt
        ? `<p style="color:#78716c">(Ingekort — het volledige bericht staat in het portaal.)</p>`
        : "");

    // Bevestiging naar de invuller (als er een e-mailveld is ingevuld)
    const invullerEmail = Object.entries(velden).find(
      ([k, v]) => /mail/i.test(k) && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v),
    )?.[1];
    // Webinar-inschrijving? Zoek de sessie op voor datum/link + agenda-bestand.
    let webinarInfo = "";
    if (formulier === "webinar" && webinarSessie) {
      const w = webinarSessie;
      {
        const { formatWanneer } = await import("@/lib/webinar");
        const wanneer = formatWanneer(w.wanneer);
        webinarInfo = `<p><strong>Wanneer:</strong> ${ontsnap(wanneer)}</p>${
          w.meetLink
            ? `<p><strong>Deelnamelink:</strong> <a href="${ontsnap(w.meetLink)}">${ontsnap(w.meetLink)}</a></p>`
            : "<p>De deelnamelink sturen we je kort van tevoren toe.</p>"
        }`;
      }
    }

    // Webinar: agenda-uitnodiging als bijlage plus klik-links voor Google en Outlook
    let agendaHtml = "";
    let webinarBijlagen: { bestandsnaam: string; inhoud: Buffer }[] | undefined;
    if (formulier === "webinar" && webinarSessie) {
      const { webinarIcs, googleAgendaLink, outlookAgendaLink, outlookWerkAgendaLink } = await import("@/lib/agenda");
      webinarBijlagen = [{ bestandsnaam: "webinar-wordswap.ics", inhoud: Buffer.from(webinarIcs(webinarSessie)) }];
      agendaHtml = `<p><strong>Zet het in je agenda:</strong> <a href="${ontsnap(googleAgendaLink(webinarSessie))}">Google Agenda</a> · <a href="${ontsnap(outlookWerkAgendaLink(webinarSessie))}">Outlook (werk)</a> · <a href="${ontsnap(outlookAgendaLink(webinarSessie))}">Outlook.com</a> · <a href="https://wordswap.nl/webinar/agenda/${webinarSessie.id}">Apple Agenda</a>, of open de bijlage bij deze mail.</p>`;
    }

    // Alleen als de voorbereidingsmails echt aanstaan, kondigen we ze aan
    let reeksZin = "";
    if (formulier === "webinar") {
      try {
        const { webinarMailInstellingen } = await import("@/db/schema");
        const { DAGMAILS } = await import("@/lib/webinar-reeks");
        const inst = await db.select().from(webinarMailInstellingen);
        if (inst.some((x) => x.aan && (DAGMAILS as string[]).includes(x.soort))) {
          reeksZin = "<p>De komende dagen krijg je van mij een paar korte mails, zodat je goed voorbereid binnenkomt.</p>";
        }
      } catch {
        /* tabel ontbreekt nog: geen aankondiging */
      }
    }

    if (invullerEmail && oordeel.mailen) {
      if (formulier === "webinar") {
        await verstuurSiteMail({
          site: site ?? null,
          naar: invullerEmail,
          onderwerp: `Je bent aangemeld voor het webinar van ${siteNaam}`,
          html: `<p>Beste ${ontsnap(velden.naam ?? "")},</p><p>Leuk dat je erbij bent! Je plek voor het webinar <strong>${ontsnap(velden.webinar ?? "")}</strong> is gereserveerd.</p>${hoek ? `<p>${ontsnap(hoek.mail)}</p>` : ""}${webinarInfo}${agendaHtml}${reeksZin}<p>Tot dan! Heb je een vraag? Antwoord gewoon op deze mail.</p>`,
          antwoordNaar: site?.notificatieEmail ?? undefined,
          bijlagen: webinarBijlagen,
        });
      } else {
        // Uit naam van het bedrijf; antwoorden gaan rechtstreeks naar het bedrijf.
        // Tekst per formulier (portaal/admin), anders de oude _bevestiging uit de HTML,
        // anders de standaardtekst. Staat de bevestiging uit, dan geen mail.
        const { formulierBevestigingen } = await import("@/db/schema");
        const { and } = await import("drizzle-orm");
        const { bevestigingsHtml, standaardOnderwerp, standaardTekst } = await import("@/lib/formulier-bevestiging");
        const [instelling] = site
          ? await db
              .select()
              .from(formulierBevestigingen)
              .where(and(eq(formulierBevestigingen.siteId, site.id), eq(formulierBevestigingen.formulier, formulier)))
              .catch(() => [])
          : [];
        if (!instelling || instelling.aan) {
          const tekst =
            instelling?.tekst ??
            (eigenBevestiging ? `Beste {naam},\n\n${eigenBevestiging}` : standaardTekst(siteNaam, "u"));
          await verstuurSiteMail({
            site: site ?? null,
            naar: invullerEmail,
            onderwerp: instelling?.onderwerp ?? standaardOnderwerp(siteNaam, "u"),
            html: bevestigingsHtml({ tekst, naam: velden.naam ?? "", veldenHtml }),
            antwoordNaar: site?.notificatieEmail ?? undefined,
          });
        }
        // Nog onbekend formulier (bijv. van vóór deze functie)? Op de achtergrond registreren,
        // met één voorstel van de AI, zodat het in portaal en admin verschijnt.
        if (site && !instelling) {
          const { after } = await import("next/server");
          const velnamen = Object.keys(velden).filter((k) => !k.startsWith("_"));
          after(async () => {
            const { registreerOnbekendFormulier } = await import("@/lib/formulier-bevestiging");
            await registreerOnbekendFormulier(site, formulier, velnamen).catch((e) =>
              console.error("Formulier registreren mislukt:", e),
            );
          });
        }
      }
    }

    // Melding naar de site-eigenaar; antwoorden gaat rechtstreeks naar de invuller
    if (site?.notificatieEmail) {
      const staart = bewaren
        ? `<p>Alle inzendingen staan ook in je WordSwap-portaal.</p>`
        : `<p>Dit bericht wordt bij ons niet bewaard, dus deze mail is de enige plek waar het staat.</p>`;
      const weg = await verstuurSiteMail({
        site,
        naar: site.notificatieEmail,
        onderwerp: `Nieuwe ${formulier}-inzending via ${siteNaam}`,
        html: `<p>Er is een nieuw bericht binnengekomen via het formulier "${ontsnap(formulier)}" op ${ontsnap(siteNaam)}:</p>${veldenHtml}${staart}`,
        antwoordNaar: invullerEmail,
        bijlagen,
      });
      // Kwam de melding niet aan, dan mist de eigenaar een aanvraag zonder
      // dat hij het merkt: het bericht staat wel in zijn portaal, maar daar
      // kijkt niemand dagelijks. Eén seintje per dag per site naar WordSwap.
      if (!weg) {
        const { after } = await import("next/server");
        after(async () => {
          const { meldFormulierMailStoring } = await import("@/lib/mail");
          await meldFormulierMailStoring(site, formulier, bewaren).catch((e) =>
            console.error("Melding formuliermail-storing mislukt:", e),
          );
        });
      }
      // Bewaren we niets, dan is een mislukte mail geen ongemak maar verlies.
      // Dan moet de bezoeker het weten, zodat hij kan bellen in plaats van te
      // wachten op een antwoord dat nooit komt.
      if (!bewaren && !weg) {
        console.error(`Formulierbericht van ${siteRepo} kwam niet aan en is niet bewaard`);
        return NextResponse.json(
          {
            error:
              "Je bericht kon niet worden bezorgd. Probeer het nog eens of neem telefonisch contact op.",
          },
          { status: 502 },
        );
      }
    }
  }

  // Webinar-aanmelder op de eigen site: automatisch in de leadlijst met een opvolgactie na het webinar
  if (formulier === "webinar" && siteRepo === "wordswap" && webinarSessie) {
    try {
      const { leads, leadActies } = await import("@/db/schema");
      const { and, ilike } = await import("drizzle-orm");
      const { formatWanneer } = await import("@/lib/webinar");
      const email = String(velden.email ?? "").trim();
      if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        const website = String(velden.website ?? "").trim().replace(/^https?:\/\//, "").replace(/\/$/, "") || null;
        const datum = formatWanneer(webinarSessie.wanneer);
        const [bestaand] = await db.select().from(leads).where(ilike(leads.email, email));
        const leadId =
          bestaand?.id ??
          (
            await db
              .insert(leads)
              .values({
                naam: String(velden.naam ?? "").trim() || "Webinar-aanmelder",
                email,
                website,
                bron: `Webinar (${datum})${hoekNaam ? ` · hoek: ${hoekNaam}` : ""}`,
                soort: "klant",
                status: "nieuw",
                notities: `Aangemeld voor het webinar van ${datum}. Let op antwoorden op de voorbereidingsmails: dat zijn de warmste leads.`,
              })
              .returning({ id: leads.id })
          )[0].id;
        const dagNa = new Date(webinarSessie.wanneer.getTime() + 24 * 3_600_000).toLocaleDateString("sv-SE", {
          timeZone: "Europe/Amsterdam",
        });
        const tekst = website ? `Na het webinar: ${website} checken en opvolgen` : "Na het webinar: opvolgen (vraag naar de website)";
        const [alActie] = await db
          .select({ id: leadActies.id })
          .from(leadActies)
          .where(and(eq(leadActies.leadId, leadId), eq(leadActies.tekst, tekst)));
        if (!alActie) await db.insert(leadActies).values({ leadId, tekst, datum: dagNa });
      }
    } catch (e) {
      console.error("Webinar-aanmelder in leadlijst zetten mislukt:", e);
    }
  }

  if (websitecheckJson) return NextResponse.json({ ok: true });

  // Webinar-inschrijving: naar de eigen bedanktpagina met agenda-knoppen
  if (formulier === "webinar" && siteRepo === "wordswap" && webinarSessie) {
    let host = "wordswap.nl";
    try {
      const h = new URL(req.headers.get("referer") ?? "").host;
      if (/(^|\.)wordswap\.nl$|\.vercel\.app$|^localhost(:\d+)?$/.test(h)) host = h;
    } catch {
      /* standaard wordswap.nl */
    }
    const protocol = host.startsWith("localhost") ? "http" : "https";
    return NextResponse.redirect(`${protocol}://${host}/webinar/bedankt?w=${webinarSessie.id}`, 303);
  }

  // Eigen bedankt-pagina van de site? Daarheen doorsturen — naar dezelfde
  // host als waar het formulier werd ingevuld (live domein óf een werkversie/
  // concept op *.wordswap.workers.dev), zodat testen vanuit het concept niet
  // op de live site belandt waar de pagina nog niet bestaat.
  if (bedanktPad) {
    const herkomst = req.headers.get("referer") ?? req.headers.get("origin") ?? "";
    let host: string | null = null;
    try {
      host = herkomst ? new URL(herkomst).host : null;
    } catch {
      host = null;
    }
    const eigenHosts = new Set(
      [
        site?.domein,
        site?.domein ? `www.${site.domein}` : null,
        site?.githubRepo ? `${site.githubRepo}.wordswap.workers.dev` : null,
      ].filter(Boolean) as string[],
    );
    const magTerug =
      host && (eigenHosts.has(host) || host.endsWith(".wordswap.workers.dev"));
    if (magTerug) {
      return NextResponse.redirect(`https://${host}${bedanktPad}`, 303);
    }
    if (site?.domein) {
      return NextResponse.redirect(`https://${site.domein}${bedanktPad}`, 303);
    }
  }

  return new Response(
    `<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Bedankt voor uw bericht</title><style>body{font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#fafaf9;color:#292524}main{text-align:center;padding:2rem}h1{font-size:1.6rem}a{color:#6d28d9}</style></head><body><main><h1>Bedankt voor uw bericht!</h1><p>We hebben uw bericht goed ontvangen en nemen zo snel mogelijk contact met u op.</p><p><a href="javascript:history.back()">← Terug naar de website</a></p></main></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}
