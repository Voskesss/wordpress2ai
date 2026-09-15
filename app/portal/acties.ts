"use server";

import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { kennisDocumenten, sites } from "@/db/schema";
import { isBeheerder } from "@/lib/auth";

/** Site ophalen als de ingelogde gebruiker eigenaar (of admin) is. */
async function eigenSite(siteId: number) {
  const { userId } = await auth();
  if (!userId || !Number.isInteger(siteId)) return null;
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  if (!site) return null;
  if (site.clerkUserId !== userId && !(await isBeheerder())) return null;
  return site;
}

export async function bewaarNotificatieEmail(formData: FormData) {
  const site = await eigenSite(Number(formData.get("siteId")));
  if (!site) return;
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (email && !email.includes("@")) return;
  await db
    .update(sites)
    .set({ notificatieEmail: email || null })
    .where(eq(sites.id, site.id));
  revalidatePath("/portal");
}

/** Handtekening onder de formuliermails van deze site (bevestiging aan de invuller). */
export async function bewaarMailHandtekening(formData: FormData) {
  const site = await eigenSite(Number(formData.get("siteId")));
  if (!site) return;
  const handtekening = String(formData.get("handtekening") ?? "").replace(/\r/g, "").trim().slice(0, 600);
  const logoUrl = String(formData.get("logoUrl") ?? "").trim().slice(0, 300);
  const kleur = String(formData.get("kleur") ?? "").trim();
  if (logoUrl && !/^https?:\/\/[^\s<>"]+$/.test(logoUrl)) return;
  await db
    .update(sites)
    .set({
      mailHandtekening: handtekening || null,
      mailLogoUrl: logoUrl || null,
      mailKleur: /^#[0-9a-fA-F]{6}$/.test(kleur) ? kleur : null,
    })
    .where(eq(sites.id, site.id));
  revalidatePath("/portal");
  revalidatePath(`/admin/klant/${site.id}`);
}

/** Logo voor de mailhandtekening uploaden: komt als afbeeldingen/mail-logo.webp
 * in de site (repo + live), zodat mailprogramma's hem gewoon kunnen laden. */
export async function uploadMailLogo(formData: FormData) {
  const site = await eigenSite(Number(formData.get("siteId")));
  if (!site) return;
  const bestand = formData.get("logo");
  if (!(bestand instanceof File) || bestand.size === 0) return;
  if (bestand.size > 5 * 1024 * 1024) return;
  const sharp = (await import("sharp")).default;
  const data = await sharp(Buffer.from(await bestand.arrayBuffer()))
    .rotate()
    .resize({ width: 480, height: 200, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 88 })
    .toBuffer();
  const pad = "afbeeldingen/mail-logo.webp";
  const { pushBestanden } = await import("@/lib/github");
  await pushBestanden(site.githubRepo, [{ pad, inhoud: data }], "Logo voor de mailhandtekening");
  if (site.siteSlug) {
    const { deployRepoNaarCloudflare } = await import("@/lib/cloudflare");
    await deployRepoNaarCloudflare(site.githubRepo, site.siteSlug).catch((e) =>
      console.error("Deploy na logo-upload mislukt:", e)
    );
  }
  const host = site.domein && !/\.workers\.dev$/.test(site.domein) ? site.domein : `${site.siteSlug ?? site.githubRepo}.wordswap.workers.dev`;
  await db
    .update(sites)
    .set({ mailLogoUrl: `https://${host.replace(/^https?:\/\//, "").replace(/\/$/, "")}/${pad}?v=${Date.now().toString(36)}` })
    .where(eq(sites.id, site.id));
  revalidatePath("/portal");
  revalidatePath(`/admin/klant/${site.id}`);
}

/** Het op de site gevonden logo als handtekeninglogo gebruiken. */
export async function gebruikGevondenLogo(formData: FormData) {
  const site = await eigenSite(Number(formData.get("siteId")));
  if (!site) return;
  const url = String(formData.get("url") ?? "").trim();
  if (!/^https:\/\/[^\s<>"]+$/.test(url) || url.length > 300) return;
  await db.update(sites).set({ mailLogoUrl: url }).where(eq(sites.id, site.id));
  revalidatePath("/portal");
  revalidatePath(`/admin/klant/${site.id}`);
}

/** Klant geeft aan interesse te hebben in een chatbot: komt als aanvraag in het admin en per mail bij Jos. */
export async function chatbotInteresse(formData: FormData) {
  const site = await eigenSite(Number(formData.get("siteId")));
  if (!site) return;
  const { formulierInzendingen } = await import("@/db/schema");
  const { currentUser } = await import("@clerk/nextjs/server");
  const u = await currentUser();
  const email = u?.emailAddresses[0]?.emailAddress ?? "";
  const naam = [u?.firstName, u?.lastName].filter(Boolean).join(" ") || site.naam;
  await db.insert(formulierInzendingen).values({
    siteRepo: "wordswap",
    formulier: "chatbot-interesse",
    velden: { naam, email, website: site.domein ?? site.githubRepo, site: site.naam, bericht: "Heeft interesse in een chatbot op de website (knop in het portaal)." },
  });
  try {
    const [ws] = await db.select().from(sites).where(eq(sites.githubRepo, "wordswap"));
    if (ws?.notificatieEmail) {
      const { verstuurSiteMail } = await import("@/lib/mail");
      await verstuurSiteMail({
        site: ws,
        naar: ws.notificatieEmail,
        onderwerp: `Chatbot-interesse: ${site.naam}`,
        html: `<p>${naam} (${email}) van <strong>${site.naam}</strong> wil een chatbot op de website. Staat ook bij de aanvragen in het admin.</p>`,
      });
    }
  } catch (e) {
    console.error("Chatbot-interesse mailen mislukt:", e);
  }
  revalidatePath("/portal");
}

const MAX_DOCUMENTEN = 20;

export async function uploadKennisDocument(formData: FormData) {
  const site = await eigenSite(Number(formData.get("siteId")));
  if (!site) return;
  const file = formData.get("document");
  if (!(file instanceof File) || file.size === 0) return;
  if (file.size > 1024 * 1024) return; // max 1 MB tekst
  if (!/\.(txt|md|markdown)$/i.test(file.name)) return;

  const aantal = await db
    .select({ id: kennisDocumenten.id })
    .from(kennisDocumenten)
    .where(eq(kennisDocumenten.siteId, site.id));
  if (aantal.length >= MAX_DOCUMENTEN) return;

  await db.insert(kennisDocumenten).values({
    siteId: site.id,
    naam: file.name.slice(0, 120),
    inhoud: (await file.text()).slice(0, 200_000),
  });
  revalidatePath("/portal");
}

export async function verwijderKennisDocument(formData: FormData) {
  const site = await eigenSite(Number(formData.get("siteId")));
  if (!site) return;
  const docId = Number(formData.get("docId"));
  if (!Number.isInteger(docId)) return;
  await db
    .delete(kennisDocumenten)
    .where(
      and(eq(kennisDocumenten.id, docId), eq(kennisDocumenten.siteId, site.id))
    );
  revalidatePath("/portal");
}

/** Inzending archiveren (uit het overzicht) of definitief verwijderen. */
export async function inzendingVerwerken(formData: FormData) {
  const { userId } = await auth();
  if (!userId) return;
  const id = Number(formData.get("id"));
  const siteId = Number(formData.get("siteId"));
  if (!Number.isInteger(id) || !Number.isInteger(siteId)) return;
  const site = await eigenSite(siteId);
  if (!site) return;

  const { formulierInzendingen } = await import("@/db/schema");
  const { and } = await import("drizzle-orm");
  const actie = String(formData.get("actie") ?? "archiveer");
  if (actie === "verwijder") {
    await db
      .delete(formulierInzendingen)
      .where(
        and(
          eq(formulierInzendingen.id, id),
          eq(formulierInzendingen.siteRepo, site.githubRepo)
        )
      );
  } else {
    await db
      .update(formulierInzendingen)
      .set({ gearchiveerd: actie !== "terug" })
      .where(
        and(
          eq(formulierInzendingen.id, id),
          eq(formulierInzendingen.siteRepo, site.githubRepo)
        )
      );
  }
  revalidatePath("/portal");
  revalidatePath(`/admin/klant/${siteId}`);
}

/** Akkoord op de verwerkersovereenkomst vastleggen (eerste inlog van een klant). */
export async function akkoordVerwerkersovereenkomst() {
  const { userId } = await auth();
  if (!userId) return;
  const { akkoorden } = await import("@/db/schema");
  const { VERWERKERS_VERSIE } = await import("@/lib/verwerkersovereenkomst");
  const { currentUser } = await import("@clerk/nextjs/server");
  const gebruiker = await currentUser();
  await db
    .insert(akkoorden)
    .values({
      clerkUserId: userId,
      email: gebruiker?.emailAddresses?.[0]?.emailAddress ?? null,
      soort: "verwerkersovereenkomst",
      versie: VERWERKERS_VERSIE,
    })
    .onConflictDoNothing();
  revalidatePath("/portal");
}

/**
 * Opzeggen vanuit het portaal: stopt de maandelijkse incasso direct bij Mollie en laat Jos en
 * de klant het weten. Verwijderen van account en gegevens gebeurt daarna door Jos (binnen drie maanden).
 */
export async function zegAbonnementOp(formData: FormData) {
  const site = await eigenSite(Number(formData.get("siteId")));
  if (!site || formData.get("bevestig") !== "on") return;
  const verwijderen = formData.get("verwijderen") === "on";
  const { abonnementen } = await import("@/db/schema");
  const { mollie } = await import("@/lib/mollie");
  const { mailVanJos, ontsnap } = await import("@/lib/wordswap-mail");
  const { currentUser } = await import("@clerk/nextjs/server");

  const [abo] = await db.select().from(abonnementen).where(eq(abonnementen.siteId, site.id)).catch(() => []);
  let doorlopenTot: string | null = null;
  let fout = "";
  const lopend = abo && (abo.status === "actief" || abo.status === "mislukt");
  if (lopend && abo.mollieCustomerId && abo.mollieSubscriptionId) {
    const pad = `/customers/${abo.mollieCustomerId}/subscriptions/${abo.mollieSubscriptionId}`;
    try {
      const sub = await mollie<{ nextPaymentDate?: string }>(pad);
      doorlopenTot = sub.nextPaymentDate ?? null;
      await mollie(pad, { methode: "DELETE" });
    } catch (e) {
      fout = e instanceof Error ? e.message : String(e);
    }
  }
  if (abo && abo.status !== "gestopt" && !fout) {
    await db
      .update(abonnementen)
      .set({ status: "gestopt", mollieSubscriptionId: null, betaallink: null, stoptOp: null, nieuwBedragCent: null, nieuwBedragVanaf: null, bijgewerkt: new Date() })
      .where(eq(abonnementen.id, abo.id));
  }
  // De klantenlijst in de admin meteen kloppend: site op "opgezegd"
  if (!fout) {
    await db.update(sites).set({ status: "opgezegd" }).where(eq(sites.id, site.id));
  }

  const gebruiker = await currentUser();
  const klantEmail = abo?.email ?? gebruiker?.emailAddresses?.[0]?.emailAddress ?? null;
  const naam = abo?.naam ?? ([gebruiker?.firstName, gebruiker?.lastName].filter(Boolean).join(" ") || "klant");
  const einde = doorlopenTot
    ? new Date(`${doorlopenTot}T12:00:00`).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })
    : null;

  await mailVanJos({
    naar: "jos@wordswap.nl",
    bcc: false,
    onderwerp: `🚪 Opzegging via het portaal: ${site.naam}`,
    html: `<p><strong>${ontsnap(naam)}</strong> (${ontsnap(klantEmail ?? "onbekend")}) heeft het abonnement voor <strong>${ontsnap(site.naam)}</strong> opgezegd via het portaal.</p>
<ul>
<li>Incasso: ${fout ? `<strong>NIET gestopt</strong>, Mollie gaf een fout: ${ontsnap(fout)}. Stop hem handmatig in de admin.` : lopend ? "gestopt bij Mollie" : "er liep geen incasso"}</li>
<li>Betaald tot: ${einde ?? "onbekend"}</li>
<li>Account en gegevens verwijderen: <strong>${verwijderen ? "JA, binnen drie maanden" : "nee"}</strong></li>
</ul>
<p>Afgesproken vertrek-stappen (checklist):</p>
<ol>
<li>DNS-overzicht van het domein naar de klant mailen (vooral de mailrecords)</li>
<li>Worker offline halen: één maand ná de betaalde periode${einde ? ` (dus rond een maand na ${einde})` : ""}</li>
<li>Domeinverhuizing: klant regelt het zelf bij TransIP of vraagt hulp</li>
${verwijderen ? "<li>Account en gegevens verwijderen binnen drie maanden (facturen 7 jaar bewaren)</li>" : ""}
</ol>`,
  });
  if (klantEmail) {
    await mailVanJos({
      naar: klantEmail,
      van: "Jos van WordSwap",
      onderwerp: "Je opzegging bij WordSwap",
      html: `<p>Beste ${ontsnap(naam.split(" ")[0])},</p>
<p>Je opzegging voor <strong>${ontsnap(site.naam)}</strong> is ontvangen. ${
        fout ? "Ik verwerk hem zo snel mogelijk zelf." : "Er wordt vanaf nu niets meer afgeschreven."
      }${einde ? ` Je website blijft online tot ${einde}, en daarna nog één maand extra — zo heb je nooit tijdsdruk bij een verhuizing.` : " Je website blijft nog even online, zodat je rustig kunt verhuizen."}</p>
<p>Goed om te weten: je domeinnaam staat bij TransIP op jouw eigen naam, dus jij (of je nieuwe webbouwer) kunt hem altijd verhuizen, ook zonder ons. Je krijgt van mij nog een overzicht van je domeininstellingen, zodat ook je e-mail gewoon blijft werken.</p>
<p>Ik neem nog even contact met je op over je website: wil je hem meenemen, dan help ik je daarbij. Je bestanden en gegevens kun je tot die tijd gewoon downloaden in je portaal.${
        verwijderen ? " Daarna verwijderen we je account en gegevens, uiterlijk binnen drie maanden (facturen moeten we wettelijk zeven jaar bewaren)." : ""
      }</p>
<p>Bedankt dat je klant was.</p>
<p>Met vriendelijke groet,<br>Jos Klijnhout<br>WordSwap</p>`,
    });
  }
  revalidatePath("/portal");
}
