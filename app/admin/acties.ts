"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { sites } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

/** Zelfde bewerkingsslot als de chat, foto's en publiceren: een admin-actie
 * die main of de branches aanpast mag niet tegelijk met een klantbewerking
 * lopen. Bezet? Dan terug naar de klantpagina met een melding. */
async function metSiteSlot(siteId: number, werk: () => Promise<void>) {
  const { claimOperation } = await import("@/lib/operation-guards");
  const vrijgeven = await claimOperation(`site:${siteId}`);
  if (!vrijgeven) redirect(`/admin/klant/${siteId}?slot=bezet`);
  try {
    await werk();
  } finally {
    await vrijgeven();
  }
}

export async function bewaarRichtlijnen(formData: FormData) {
  await requireAdmin();
  const siteId = Number(formData.get("siteId"));
  const richtlijnen = String(formData.get("richtlijnen") ?? "").trim();
  if (!Number.isInteger(siteId)) return;
  await db
    .update(sites)
    .set({ richtlijnen: richtlijnen || null })
    .where(eq(sites.id, siteId));
  revalidatePath(`/admin/klant/${siteId}`);
}

export async function bewaarSite(formData: FormData) {
  await requireAdmin();
  const siteId = Number(formData.get("siteId"));
  if (!Number.isInteger(siteId)) return;
  const naam = String(formData.get("naam") ?? "").trim();
  const domein = String(formData.get("domein") ?? "").trim();
  const siteSlug = String(formData.get("siteSlug") ?? "").trim();
  const plan = String(formData.get("plan") ?? "via_ons");
  const status = String(formData.get("status") ?? "migratie");
  if (!naam) return;
  const [vorige] = await db.select({ domein: sites.domein, siteSlug: sites.siteSlug, githubRepo: sites.githubRepo }).from(sites).where(eq(sites.id, siteId));
  await db
    .update(sites)
    .set({
      naam,
      domein: domein || null,
      siteSlug: siteSlug || null,
      plan: plan === "eigen_key" ? "eigen_key" : "via_ons",
      status: (["migratie", "actief", "gepauzeerd", "opgezegd"].includes(status)
        ? status
        : "migratie") as "migratie" | "actief" | "gepauzeerd" | "opgezegd",
    })
    .where(eq(sites.id, siteId));
  // Domein gewijzigd? Dan meteen herdeployen: de deploy vervangt het
  // placeholder-domein (VERVANG.nl) door het echte domein in canonical,
  // sitemap en robots — anders wijst de site naar een niet-bestaand domein.
  const nieuwDomein = domein || null;
  if (vorige && nieuwDomein !== vorige.domein && nieuwDomein && !/\.workers\.dev$/.test(nieuwDomein)) {
    // Logo van de mailhandtekening stond op het workers.dev-adres: mee naar het echte domein
    const [rij] = await db.select({ logo: sites.mailLogoUrl }).from(sites).where(eq(sites.id, siteId));
    if (rij?.logo && /\.workers\.dev\//.test(rij.logo)) {
      await db.update(sites).set({ mailLogoUrl: rij.logo.replace(/^https:\/\/[^/]+\//, `https://${nieuwDomein.replace(/^https?:\/\//, "").replace(/\/$/, "")}/`) }).where(eq(sites.id, siteId));
    }
  }
  if (vorige && nieuwDomein !== vorige.domein && vorige.siteSlug) {
    const { deployRepoNaarCloudflare } = await import("@/lib/cloudflare");
    await deployRepoNaarCloudflare(vorige.githubRepo, vorige.siteSlug).catch((e) =>
      console.error("Herdeploy na domeinwijziging mislukt:", e)
    );
    await deployRepoNaarCloudflare(vorige.githubRepo, `wv-${vorige.siteSlug}`).catch(() => {});
  }
  revalidatePath(`/admin/klant/${siteId}`);
  revalidatePath("/admin");
}

/** Koppelt een klantaccount (Clerk) aan een site op basis van e-mail; maakt het account meteen aan als
 * het nog niet bestaat (zonder wachtwoord, inloggen gaat met een code per mail). De klant krijgt één
 * Nederlandse mail van ons met een link naar zijn website en een inlogknop; bij de eerste inlog volgt
 * (voor sites in opbouw) het akkoord op de oplevering. */
export async function koppelKlant(formData: FormData): Promise<void> {
  await requireAdmin();
  const siteId = Number(formData.get("siteId"));
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const naam = String(formData.get("naam") ?? "").trim().slice(0, 120);
  const eigenTekst = String(formData.get("bericht") ?? "").trim().slice(0, 2000);
  if (!Number.isInteger(siteId) || !email.includes("@")) return;
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  if (!site) return;
  const { bouwKoppelMail, isVeiligeLink, standaardBekijkLink } = await import("@/lib/website-akkoord");
  const opgegevenLink = String(formData.get("bekijkLink") ?? "").trim();
  const bekijkUrl = isVeiligeLink(opgegevenLink) ? opgegevenLink : standaardBekijkLink(site);
  const mailSturen = formData.get("mail") !== "nee";

  const secret = process.env.CLERK_SECRET_KEY;
  const res = await fetch(
    `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(email)}`,
    { headers: { Authorization: `Bearer ${secret}` } }
  );
  const users = (await res.json()) as { id: string }[];

  // Links naar dezelfde omgeving waarin je koppelt (productie of dev), anders
  // belandt een testklant op de verkeerde site
  const { headers } = await import("next/headers");
  const kop = await headers();
  const host = kop.get("x-forwarded-host") ?? kop.get("host") ?? "www.wordswap.nl";
  const origin = `${host.startsWith("localhost") ? "http" : "https"}://${host}`;
  const portaal = `${origin}/portal?site=${siteId}`;
  // Inloggen gaat met een code per mail; na het inloggen door naar deze site in het portaal
  const inlogUrl = `${origin}/sign-in?redirect_url=${encodeURIComponent(portaal)}`;
  const clerk = (pad: string, init?: RequestInit) =>
    fetch(`https://api.clerk.com/v1${pad}`, {
      ...init,
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    });
  let klantId = Array.isArray(users) && users.length > 0 ? users[0].id : null;
  if (!klantId) {
    // Account bestaat nog niet: meteen aanmaken (zonder wachtwoord). Dan kan de klant
    // direct inloggen met een code, ook zonder op de link in de mail te klikken.
    // Naam meteen op het account: dan spreken ook alle latere mails (akkoord,
    // afspraken) de klant met zijn voornaam aan.
    const [voornaam, ...rest] = naam.split(/\s+/).filter(Boolean);
    const nieuw = await clerk("/users", {
      method: "POST",
      body: JSON.stringify({
        email_address: [email],
        skip_password_requirement: true,
        ...(voornaam ? { first_name: voornaam } : {}),
        ...(rest.length ? { last_name: rest.join(" ") } : {}),
      }),
    });
    const data = (await nieuw.json().catch(() => ({}))) as { id?: string };
    if (!nieuw.ok || !data.id) {
      console.error("Clerk-account aanmaken mislukt:", nieuw.status, data);
      redirect(`/admin/klant/${siteId}?koppel=mislukt`);
    }
    klantId = data.id;
  }
  // Oude, nooit geaccepteerde uitnodigingen voor dit adres opruimen
  const open = await clerk(`/invitations?status=pending&query=${encodeURIComponent(email)}`);
  if (open.ok) {
    const lijst = (await open.json().catch(() => [])) as { id: string; email_address: string }[] | { data?: { id: string; email_address: string }[] };
    for (const u of (Array.isArray(lijst) ? lijst : (lijst.data ?? [])).filter((u) => u.email_address.toLowerCase() === email)) {
      await clerk(`/invitations/${u.id}/revoke`, { method: "POST" });
    }
  }
  await db
    .update(sites)
    .set({ clerkUserId: klantId, uitnodigingEmail: null })
    .where(eq(sites.id, siteId));

  if (mailSturen) {
    const { mailVanJos } = await import("@/lib/wordswap-mail");
    const mail = bouwKoppelMail(site, { bekijkUrl, inlogUrl, naam, eigenTekst });
    const gelukt = await mailVanJos({ naar: email, van: "Jos van WordSwap", onderwerp: mail.onderwerp, html: mail.html });
    if (!gelukt) redirect(`/admin/klant/${siteId}?koppel=mail-mislukt`);
  }
  revalidatePath(`/admin/klant/${siteId}`);
  redirect(`/admin/klant/${siteId}?koppel=${mailSturen ? "verstuurd" : "gekoppeld"}`);
}

/**
 * Koppeling intrekken zolang de klant het portaal nog niet echt heeft gebruikt (geen akkoord op de
 * verwerkersovereenkomst, geen chatberichten): openstaande Clerk-uitnodiging intrekken, het
 * ongebruikte account verwijderen (nooit een beheerder, en alleen als het aan geen andere site
 * hangt) en de site terugzetten naar Jos. Heeft de klant het portaal al gebruikt, dan gebeurt er niets.
 */
export async function trekKoppelingIn(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const siteId = Number(formData.get("siteId"));
  if (!Number.isInteger(siteId)) return;
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  if (!site) return;
  const secret = process.env.CLERK_SECRET_KEY;
  const clerk = (pad: string, init?: RequestInit) =>
    fetch(`https://api.clerk.com/v1${pad}`, {
      ...init,
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    });
  type ClerkUser = {
    id: string;
    public_metadata?: { role?: string };
    email_addresses?: { email_address: string }[];
  };

  // Welk account hoort erbij: het gekoppelde (als dat niet Jos zelf is) of dat van het uitnodigingsadres
  let gebruiker: ClerkUser | null = null;
  if (site.clerkUserId && site.clerkUserId !== admin.id) {
    const r = await clerk(`/users/${site.clerkUserId}`);
    gebruiker = r.ok ? ((await r.json()) as ClerkUser) : null;
  } else if (site.uitnodigingEmail) {
    const r = await clerk(`/users?email_address=${encodeURIComponent(site.uitnodigingEmail)}`);
    const lijst = r.ok ? ((await r.json()) as ClerkUser[]) : [];
    gebruiker = lijst[0] ?? null;
  }
  const { heeftPortaalGebruikt } = await import("@/lib/website-akkoord");
  if (gebruiker && (gebruiker.public_metadata?.role === "admin" || (await heeftPortaalGebruikt(gebruiker.id)))) {
    redirect(`/admin/klant/${siteId}?koppel=intrekken-ingelogd`);
  }

  // Openstaande uitnodiging(en) intrekken
  const email = site.uitnodigingEmail ?? gebruiker?.email_addresses?.[0]?.email_address ?? null;
  if (email) {
    const r = await clerk(`/invitations?status=pending&query=${encodeURIComponent(email)}`);
    const data = r.ok ? ((await r.json()) as { data?: { id: string; email_address: string }[] } | { id: string; email_address: string }[]) : [];
    const lijst = Array.isArray(data) ? data : (data.data ?? []);
    for (const u of lijst.filter((u) => u.email_address.toLowerCase() === email.toLowerCase())) {
      await clerk(`/invitations/${u.id}/revoke`, { method: "POST" });
    }
  }

  // Nooit gebruikt account verwijderen, maar alleen als het nergens anders aan hangt
  if (gebruiker && gebruiker.id !== admin.id) {
    const { and, ne } = await import("drizzle-orm");
    const anders = await db
      .select({ id: sites.id })
      .from(sites)
      .where(and(eq(sites.clerkUserId, gebruiker.id), ne(sites.id, siteId)));
    if (anders.length === 0) await clerk(`/users/${gebruiker.id}`, { method: "DELETE" });
  }

  await db
    .update(sites)
    .set({ clerkUserId: admin.id, uitnodigingEmail: null })
    .where(eq(sites.id, siteId));
  revalidatePath(`/admin/klant/${siteId}`);
  redirect(`/admin/klant/${siteId}?koppel=ingetrokken`);
}

export async function nieuweSite(formData: FormData) {
  const admin = await requireAdmin();
  const naam = String(formData.get("naam") ?? "").trim();
  const githubRepo = String(formData.get("githubRepo") ?? "").trim();
  const domein = String(formData.get("domein") ?? "").trim();
  if (!naam || !githubRepo) return;
  const [rij] = await db
    .insert(sites)
    .values({
      clerkUserId: admin.id,
      naam,
      githubRepo,
      domein: domein || null,
    })
    .returning({ id: sites.id });
  revalidatePath("/admin");
  redirect(`/admin/klant/${rij.id}`);
}

/** Verwijdert een klant volledig: databasegegevens, en optioneel repo en Cloudflare-site. */
export async function verwijderKlant(formData: FormData) {
  await requireAdmin();
  const siteId = Number(formData.get("siteId"));
  const ookRepo = formData.get("ookRepo") === "on";
  const ookHosting = formData.get("ookHosting") === "on";
  if (!Number.isInteger(siteId)) return;

  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  if (!site) return;

  // Typ-bevestiging: de ingevoerde naam moet exact overeenkomen
  const getypt = String(formData.get("bevestigNaam") ?? "").trim();
  if (getypt !== site.naam) return;

  const {
    changes,
    messages,
    usage,
    apiKeys,
    migrations,
    aiKosten,
    kennisDocumenten,
    formulierInzendingen,
  } = await import("@/db/schema");
  await db.delete(changes).where(eq(changes.siteId, siteId));
  await db.delete(messages).where(eq(messages.siteId, siteId));
  await db.delete(usage).where(eq(usage.siteId, siteId));
  await db.delete(apiKeys).where(eq(apiKeys.siteId, siteId));
  await db.delete(migrations).where(eq(migrations.siteId, siteId));
  await db.delete(aiKosten).where(eq(aiKosten.siteId, siteId));
  await db.delete(kennisDocumenten).where(eq(kennisDocumenten.siteId, siteId));
  await db
    .delete(formulierInzendingen)
    .where(eq(formulierInzendingen.siteRepo, site.githubRepo));
  await db.delete(sites).where(eq(sites.id, siteId));

  if (ookRepo) {
    const { gh, GITHUB_ORG } = await import("@/lib/github");
    await gh(`/repos/${GITHUB_ORG}/${site.githubRepo}`, {
      method: "DELETE",
    }).catch(() => {});
  }

  if (ookHosting && site.siteSlug) {
    const { verwijderCloudflareSite } = await import("@/lib/cloudflare");
    await verwijderCloudflareSite(site.siteSlug);
    await verwijderCloudflareSite(`wv-${site.siteSlug}`);
  }

  revalidatePath("/admin");
  redirect("/admin");
}

/** Zet de site online op Cloudflare (gratis, direct, geen build). */
export async function zetSiteOnline(formData: FormData) {
  await requireAdmin();
  const siteId = Number(formData.get("siteId"));
  if (!Number.isInteger(siteId)) return;
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  if (!site || site.siteSlug) return;

  await metSiteSlot(siteId, async () => {
    const { deployRepoNaarCloudflare, CF_SUBDOMEIN } = await import("@/lib/cloudflare");
    await deployRepoNaarCloudflare(site.githubRepo, site.githubRepo);
    // Werkversie-adres alvast klaarzetten (SSL heeft even nodig bij eerste keer)
    await deployRepoNaarCloudflare(site.githubRepo, `wv-${site.githubRepo}`).catch(() => {});
    await db
      .update(sites)
      .set({
        siteSlug: site.githubRepo,
        domein: `${site.githubRepo}.${CF_SUBDOMEIN}.workers.dev`,
      })
      .where(eq(sites.id, siteId));
  });
  revalidatePath(`/admin/klant/${siteId}`);
  revalidatePath("/admin");
}

/** Zet de live site terug naar een eerdere versie (commit) — geschiedenis blijft intact. */
export async function herstelVersie(formData: FormData) {
  await requireAdmin();
  const siteId = Number(formData.get("siteId"));
  const sha = String(formData.get("sha") ?? "");
  if (!Number.isInteger(siteId) || !/^[0-9a-f]{7,40}$/i.test(sha)) return;
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  if (!site) return;
  await metSiteSlot(siteId, async () => {
    const { zetTerugNaarVersie } = await import("@/lib/github");
    await zetTerugNaarVersie(site.githubRepo, sha);
    if (site.siteSlug) {
      const { deployRepoNaarCloudflare } = await import("@/lib/cloudflare");
      await deployRepoNaarCloudflare(site.githubRepo, site.siteSlug).catch((e) =>
        console.error("Deploy na terugzetten mislukt:", e)
      );
    }
  });
  revalidatePath(`/admin/klant/${siteId}`);
}

/** Witlabel-mail: SMTP-instellingen van de klant opslaan (wachtwoord versleuteld). */
export async function bewaarSmtp(formData: FormData) {
  await requireAdmin();
  const siteId = Number(formData.get("siteId"));
  if (!Number.isInteger(siteId)) return;
  const host = String(formData.get("host") ?? "").trim();
  const poort = Number(formData.get("poort") || 465);
  const gebruiker = String(formData.get("gebruiker") ?? "").trim();
  const wachtwoord = String(formData.get("wachtwoord") ?? "");
  const afzender = String(formData.get("afzender") ?? "").trim();

  if (!host) {
    // Leegmaken = terug naar de standaard (Resend)
    await db
      .update(sites)
      .set({ smtpHost: null, smtpPoort: null, smtpGebruiker: null, smtpWachtwoord: null, smtpAfzender: null })
      .where(eq(sites.id, siteId));
  } else {
    const { versleutel } = await import("@/lib/mail");
    await db
      .update(sites)
      .set({
        smtpHost: host,
        smtpPoort: Number.isInteger(poort) ? poort : 465,
        smtpGebruiker: gebruiker || null,
        smtpAfzender: afzender || null,
        // Wachtwoord alleen overschrijven als er een nieuw is ingevuld
        ...(wachtwoord ? { smtpWachtwoord: versleutel(wachtwoord) } : {}),
      })
      .where(eq(sites.id, siteId));
  }
  revalidatePath(`/admin/klant/${siteId}`);
}

/** Outreach: prospect toevoegen. */
export async function prospectToevoegen(formData: FormData) {
  await requireAdmin();
  const { prospects } = await import("@/db/schema");
  const bedrijf = String(formData.get("bedrijf") ?? "").trim();
  const website = String(formData.get("website") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const observatie = String(formData.get("observatie") ?? "").trim();
  // Kenmerken voor de doelgroep-analyse (komen mee uit de scanner)
  const branche = String(formData.get("branche") ?? "").trim();
  const plaats = String(formData.get("plaats") ?? "").trim();
  const score = Number(formData.get("score"));
  const laadMs = Number(formData.get("laadMs"));
  const kenmerken = String(formData.get("kenmerken") ?? "").trim();
  const prijs = String(formData.get("prijs") ?? "").trim();
  if (!bedrijf || !website || !email.includes("@")) return;
  // Dubbelen voorkomen: nooit twee keer dezelfde naam, website of e-mail
  // (en nooit iemand die zich heeft afgemeld opnieuw opvoeren)
  const schoonWebsite = website
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/+$/, "");
  const alleProspects = await db.select().from(prospects);
  const bestaatAl = alleProspects.some(
    (p) =>
      p.email.toLowerCase() === email ||
      p.website.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/+$/, "") ===
        schoonWebsite ||
      p.bedrijf.trim().toLowerCase() === bedrijf.toLowerCase()
  );
  if (bestaatAl) {
    revalidatePath("/admin/outreach");
    return;
  }
  await db
    .insert(prospects)
    .values({
      bedrijf,
      website: schoonWebsite,
      email,
      observatie: observatie || null,
      branche: branche || null,
      plaats: plaats || null,
      score: Number.isFinite(score) ? score : null,
      laadMs: Number.isFinite(laadMs) && laadMs > 0 ? laadMs : null,
      kenmerken: kenmerken || null,
      prijs: prijs || null,
    });
  revalidatePath("/admin/outreach");
}

/** Outreach: observatie/e-mail bijwerken of status zetten. */
export async function prospectBijwerken(formData: FormData) {
  await requireAdmin();
  const { prospects } = await import("@/db/schema");
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  const status = String(formData.get("status") ?? "");
  const observatie = formData.get("observatie");
  const email = formData.get("email");
  const wijziging: Record<string, unknown> = {};
  if (["nieuw", "mail1", "mail2", "mail3", "gereageerd", "klant", "niet_mailen"].includes(status)) {
    wijziging.status = status;
  }
  if (typeof observatie === "string") wijziging.observatie = observatie.trim() || null;
  const prijs = formData.get("prijs");
  if (typeof prijs === "string") wijziging.prijs = prijs.trim() || null;
  if (typeof email === "string" && email.includes("@")) {
    const nieuwAdres = email.trim().toLowerCase();
    const [conflict] = await db
      .select()
      .from(prospects)
      .where(eq(prospects.email, nieuwAdres));
    // Niet toestaan als dat adres al bestaat als afgemelde prospect
    if (!conflict || (conflict.id === id && conflict.status !== "niet_mailen")) {
      wijziging.email = nieuwAdres;
    }
  }
  if (Object.keys(wijziging).length > 0) {
    await db.update(prospects).set(wijziging).where(eq(prospects.id, id));
  }
  revalidatePath("/admin/outreach");
}

/** Outreach: prospect verwijderen. Afgemelde adressen blijven bewaard op een
 * aparte blokkeerlijst, zodat ze nooit opnieuw benaderd kunnen worden. */
export async function prospectVerwijderen(formData: FormData) {
  await requireAdmin();
  const { prospects } = await import("@/db/schema");
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  const [p] = await db.select().from(prospects).where(eq(prospects.id, id));
  if (!p) return;
  if (p.status === "niet_mailen") {
    // Nooit wissen: dan zou het adres opnieuw toegevoegd kunnen worden
    revalidatePath("/admin/outreach");
    return;
  }
  await db.delete(prospects).where(eq(prospects.id, id));
  revalidatePath("/admin/outreach");
}

/** Outreach: volgende mail versturen (1 → 2 → 3, nooit voorbij niet-mailen). */
export async function verstuurOutreach(formData: FormData) {
  await requireAdmin();
  const { prospects } = await import("@/db/schema");
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  const [p] = await db.select().from(prospects).where(eq(prospects.id, id));
  if (!p) return;
  if (["niet_mailen", "gereageerd", "klant", "mail3"].includes(p.status)) return;
  // Extra vangnet: staat dit e-mailadres ergens op niet-mailen, dan nooit versturen
  const afgemeld = await db
    .select()
    .from(prospects)
    .where(eq(prospects.email, p.email))
    .then((rs) => rs.some((r) => r.status === "niet_mailen"));
  if (afgemeld) return;

  const nummer = (p.status === "nieuw" ? 1 : p.status === "mail1" ? 2 : 3) as 1 | 2 | 3;
  const { kiesMail } = await import("@/lib/outreach");
  const { mailSjablonen, prospectMails } = await import("@/db/schema");
  const { and } = await import("drizzle-orm");
  const [sjab] = await db
    .select()
    .from(mailSjablonen)
    .where(and(eq(mailSjablonen.nummer, nummer), eq(mailSjablonen.actief, true)));
  const [pers] = await db
    .select()
    .from(prospectMails)
    .where(and(eq(prospectMails.prospectId, id), eq(prospectMails.nummer, nummer)));
  const mail = kiesMail(nummer, p, sjab ?? null, pers ?? null);

  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  const basisFrom = process.env.RESEND_FROM ?? "WordSwap <onboarding@resend.dev>";
  const adres = basisFrom.match(/<([^>]+)>/)?.[1] ?? basisFrom;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: `Jos van WordSwap <${adres}>`,
      to: [p.email],
      subject: mail.onderwerp,
      html: mail.html,
      reply_to: ["info@wordswap.nl"],
    }),
  });
  if (!res.ok) {
    console.error("Outreach-mail mislukt:", await res.text());
    return;
  }
  await db
    .update(prospects)
    .set({
      status: `mail${nummer}`,
      ...(nummer === 1 ? { mail1Op: new Date(), mailVersie: mail.bron } : nummer === 2 ? { mail2Op: new Date() } : { mail3Op: new Date() }),
    })
    .where(eq(prospects.id, id));
  revalidatePath("/admin/outreach");
}

/** Webinar inplannen. */
export async function webinarToevoegen(formData: FormData) {
  await requireAdmin();
  const { webinars } = await import("@/db/schema");
  const titel = String(formData.get("titel") ?? "").trim();
  const datum = String(formData.get("datum") ?? "");
  const tijd = String(formData.get("tijd") ?? "");
  const meetLink = String(formData.get("meetLink") ?? "").trim();
  if (!titel || !datum || !tijd) return;
  const { amsterdamseTijdNaarDatum } = await import("@/lib/webinar");
  const wanneer = amsterdamseTijdNaarDatum(datum, tijd);
  if (isNaN(wanneer.getTime())) return;
  await db.insert(webinars).values({ titel, wanneer, meetLink: meetLink || null });
  revalidatePath("/admin/webinars");
  revalidatePath("/webinar");
}

/** Webinar bijwerken (opnamelink, aan/uit) of verwijderen. */
export async function webinarBijwerken(formData: FormData) {
  await requireAdmin();
  const { webinars } = await import("@/db/schema");
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  if (formData.get("verwijder")) {
    // Inschrijvers eerst een plek geven: verplaatsen naar een ander webinar of
    // (bewust) verwijderen. Zonder keuze wordt een webinar mét inschrijvers
    // niet weggegooid — dan zouden mensen zich hebben aangemeld voor niets.
    const { formulierInzendingen } = await import("@/db/schema");
    const { hoortBij, webinarLabel } = await import("@/lib/webinar");
    const [w] = await db.select().from(webinars).where(eq(webinars.id, id));
    if (!w) return;
    const alle = await db.select().from(formulierInzendingen).where(eq(formulierInzendingen.formulier, "webinar"));
    const inschr = alle.filter((i) => hoortBij(i.velden as Record<string, unknown>, w));
    const keuze = String(formData.get("inschrijvingen") ?? "");
    if (inschr.length > 0) {
      if (keuze.startsWith("naar:")) {
        const naarId = Number(keuze.slice(5));
        const [doel] = await db.select().from(webinars).where(eq(webinars.id, naarId));
        if (!doel) return;
        for (const i of inschr) {
          const velden = { ...(i.velden as Record<string, unknown>), webinar_id: String(doel.id), webinar: webinarLabel(doel) };
          await db.update(formulierInzendingen).set({ velden }).where(eq(formulierInzendingen.id, i.id));
        }
      } else if (keuze === "weg") {
        for (const i of inschr) await db.delete(formulierInzendingen).where(eq(formulierInzendingen.id, i.id));
      } else {
        return; // geen keuze gemaakt: niets doen
      }
    }
    await db.delete(webinars).where(eq(webinars.id, id));
  } else {
    const opnameLink = String(formData.get("opnameLink") ?? "").trim();
    const demoVideoLink = String(formData.get("demoVideoLink") ?? "").trim();
    const actief = formData.get("actief") === "on";
    await db
      .update(webinars)
      .set({ opnameLink: opnameLink || null, demoVideoLink: /^https?:\/\//.test(demoVideoLink) ? demoVideoLink : null, actief })
      .where(eq(webinars.id, id));
  }
  revalidatePath("/admin/webinars");
  revalidatePath("/webinar");
}

/** Eén inschrijving verplaatsen naar een ander webinar, of verwijderen. */
export async function webinarInschrijvingVerplaatsen(formData: FormData) {
  await requireAdmin();
  const { webinars, formulierInzendingen } = await import("@/db/schema");
  const { webinarLabel } = await import("@/lib/webinar");
  const inzendingId = Number(formData.get("inzendingId"));
  const naar = String(formData.get("naar") ?? "");
  if (!Number.isInteger(inzendingId) || !naar) return;
  if (naar === "weg") {
    await db.delete(formulierInzendingen).where(eq(formulierInzendingen.id, inzendingId));
  } else {
    const naarId = Number(naar);
    const [doel] = await db.select().from(webinars).where(eq(webinars.id, naarId));
    const [i] = await db.select().from(formulierInzendingen).where(eq(formulierInzendingen.id, inzendingId));
    if (!doel || !i) return;
    const velden = { ...(i.velden as Record<string, unknown>), webinar_id: String(doel.id), webinar: webinarLabel(doel) };
    await db.update(formulierInzendingen).set({ velden }).where(eq(formulierInzendingen.id, inzendingId));
  }
  revalidatePath("/admin/webinars");
}

/** Aanvraag op de admin-hoofdpagina archiveren, terugzetten of verwijderen. */
export async function aanvraagVerwerken(formData: FormData) {
  await requireAdmin();
  const { formulierInzendingen } = await import("@/db/schema");
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  const actie = String(formData.get("actie") ?? "archiveer");
  if (actie === "verwijder") {
    await db.delete(formulierInzendingen).where(eq(formulierInzendingen.id, id));
  } else {
    await db
      .update(formulierInzendingen)
      .set({ gearchiveerd: actie !== "terug" })
      .where(eq(formulierInzendingen.id, id));
  }
  revalidatePath("/admin");
}

/** Mail alle inschrijvers van een webinar: link, herinnering of follow-up. */
export async function webinarMailen(formData: FormData) {
  await requireAdmin();
  const { webinars, formulierInzendingen } = await import("@/db/schema");
  const id = Number(formData.get("id"));
  const soort = String(formData.get("soort") ?? "link");
  if (!Number.isInteger(id)) return;

  const [w] = await db.select().from(webinars).where(eq(webinars.id, id));
  if (!w) return;

  const inzendingen = await db
    .select()
    .from(formulierInzendingen)
    .where(eq(formulierInzendingen.formulier, "webinar"));
  const { hoortBij } = await import("@/lib/webinar");
  const ontvangers = inzendingen
    .filter((i) => hoortBij(i.velden as Record<string, unknown>, w))
    .map((i) => ({
      email: (i.velden as Record<string, string>).email,
      naam: (i.velden as Record<string, string>).naam ?? "",
    }))
    .filter((o) => o.email?.includes("@"));
  if (ontvangers.length === 0) return;

  const wanneer = w.wanneer.toLocaleString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Amsterdam",
  });
  const linkBlok = w.meetLink
    ? `<p style="margin:20px 0"><a href="${w.meetLink}" style="display:inline-block;background:#31956B;color:#fff !important;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:600"><span style="color:#fff !important;text-decoration:none">Deelnemen aan het webinar</span></a></p><p style="font-size:13px;color:#78716c">Of plak deze link in je browser: ${w.meetLink}</p>`
    : "";

  const teksten: Record<string, { onderwerp: string; html: string }> = {
    link: {
      onderwerp: `De deelnamelink voor het webinar (${wanneer})`,
      html: `<p>Hallo{{naam}},</p><p>Hierbij de link voor het webinar <strong>${w.titel}</strong> op <strong>${wanneer}</strong>. Bewaar deze mail — je hebt hem straks nodig om deel te nemen.</p>${linkBlok}<p>Tot dan!</p>`,
    },
    herinnering: {
      onderwerp: `Vandaag: het webinar begint om ${w.wanneer.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam" })}`,
      html: `<p>Hallo{{naam}},</p><p>Kleine herinnering: vandaag om <strong>${w.wanneer.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam" })}</strong> begint het webinar <strong>${w.titel}</strong>. Het duurt ongeveer een half uur en je mag gerust alleen luisteren.</p>${linkBlok}<p>Tot zo!</p>`,
    },
    followup: {
      onderwerp: `Bedankt voor je interesse in het webinar`,
      html: `<p>Hallo{{naam}},</p><p>Bedankt voor je aanmelding voor <strong>${w.titel}</strong>.${
        w.opnameLink
          ? ` Kon je er niet bij zijn of wil je iets terugkijken? <a href="${w.opnameLink}">Hier staat de opname</a>.`
          : ""
      }</p><p>Wil je weten of jij van het gedoe af kunt, voor jóuw eigen website? Vraag vrijblijvend de gratis websitecheck aan op <a href="https://wordswap.nl/contact">wordswap.nl/contact</a>. Je krijgt binnen één werkdag een eerlijk antwoord, ook als dat ‘blijf waar je zit’ is.</p><p>Groet,<br>Jos — WordSwap</p>`,
    },
  };
  const sjabloon = teksten[soort] ?? teksten.link;

  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  const basisFrom = process.env.RESEND_FROM ?? "WordSwap <onboarding@resend.dev>";
  const adres = basisFrom.match(/<([^>]+)>/)?.[1] ?? basisFrom;

  for (const o of ontvangers) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `WordSwap <${adres}>`,
        to: [o.email],
        subject: sjabloon.onderwerp,
        html: sjabloon.html.replace("{{naam}}", o.naam ? ` ${o.naam}` : ""),
        reply_to: ["info@wordswap.nl"],
      }),
    }).catch((e) => console.error("Webinar-mail mislukt:", e));
  }
  revalidatePath("/admin/webinars");
}

/** Testmail: stuur een outreach-mail naar jezelf om hem te beoordelen. */
export async function outreachTestmail(formData: FormData) {
  await requireAdmin();
  const naar = String(formData.get("naar") ?? "").trim().toLowerCase();
  const nummer = Number(formData.get("nummer") || 1);
  if (!naar.includes("@") || ![1, 2, 3].includes(nummer)) return;

  const { maakOutreachMail } = await import("@/lib/outreach");
  const voorbeeld = {
    id: 0,
    bedrijf: String(formData.get("bedrijf") ?? "Bakkerij De Korenbloem"),
    website: String(formData.get("website") ?? "www.voorbeeldbedrijf.nl"),
    email: naar,
    observatie:
      String(formData.get("observatie") ?? "") ||
      "Wat me opviel: de site laadt op mobiel vrij traag en het menu valt buiten beeld — zonde, want jullie werk ziet er goed uit.",
  };
  const mail = maakOutreachMail(nummer as 1 | 2 | 3, voorbeeld);

  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  const basisFrom = process.env.RESEND_FROM ?? "WordSwap <onboarding@resend.dev>";
  const adres = basisFrom.match(/<([^>]+)>/)?.[1] ?? basisFrom;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: `Jos van WordSwap <${adres}>`,
      to: [naar],
      subject: `[TEST mail ${nummer}] ${mail.onderwerp}`,
      html: `<div style="background:#fef3c7;border:1px solid #fde68a;padding:10px 14px;border-radius:10px;font-family:sans-serif;font-size:13px;color:#92400e;margin-bottom:16px">Dit is een TESTMAIL van outreach-mail ${nummer}. De afmeldknop onderaan doet in deze test niets.</div>${mail.html}`,
      reply_to: ["info@wordswap.nl"],
    }),
  }).catch((e) => console.error("Testmail mislukt:", e));
  revalidatePath("/admin/outreach");
}


/** Mailsjabloon opslaan (nieuw of bewerken) en optioneel activeren. */
export async function sjabloonOpslaan(formData: FormData) {
  await requireAdmin();
  const { mailSjablonen } = await import("@/db/schema");
  const { and } = await import("drizzle-orm");
  const id = Number(formData.get("id"));
  const nummer = Number(formData.get("nummer"));
  const naam = String(formData.get("naam") ?? "").trim();
  const onderwerp = String(formData.get("onderwerp") ?? "").trim();
  const tekst = String(formData.get("tekst") ?? "").trim();
  const activeren = formData.get("activeren") === "1";
  if (![1, 2, 3].includes(nummer) || !naam || !onderwerp || !tekst) return;
  let doelId = id;
  if (Number.isInteger(id) && id > 0) {
    await db.update(mailSjablonen).set({ naam, onderwerp, tekst }).where(eq(mailSjablonen.id, id));
  } else {
    const [rij] = await db
      .insert(mailSjablonen)
      .values({ nummer, naam, onderwerp, tekst })
      .returning({ id: mailSjablonen.id });
    doelId = rij.id;
  }
  if (activeren && doelId) {
    await db.update(mailSjablonen).set({ actief: false }).where(eq(mailSjablonen.nummer, nummer));
    await db.update(mailSjablonen).set({ actief: true }).where(eq(mailSjablonen.id, doelId));
  }
  revalidatePath("/admin/outreach/sjablonen");
  revalidatePath("/admin/outreach");
}

/** Mailsjabloon activeren of verwijderen. */
export async function sjabloonActie(formData: FormData) {
  await requireAdmin();
  const { mailSjablonen } = await import("@/db/schema");
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  const [rij] = await db.select().from(mailSjablonen).where(eq(mailSjablonen.id, id));
  if (!rij) return;
  if (formData.get("verwijder") === "1") {
    await db.delete(mailSjablonen).where(eq(mailSjablonen.id, id));
  } else if (formData.get("deactiveer") === "1") {
    await db.update(mailSjablonen).set({ actief: false }).where(eq(mailSjablonen.id, id));
  } else {
    await db.update(mailSjablonen).set({ actief: false }).where(eq(mailSjablonen.nummer, rij.nummer));
    await db.update(mailSjablonen).set({ actief: true }).where(eq(mailSjablonen.id, id));
  }
  revalidatePath("/admin/outreach/sjablonen");
  revalidatePath("/admin/outreach");
}

/** Persoonlijke mailversie voor één prospect opslaan (leeg = terug naar de basis). */
export async function prospectMailOpslaan(formData: FormData) {
  await requireAdmin();
  const { prospectMails } = await import("@/db/schema");
  const { and } = await import("drizzle-orm");
  const prospectId = Number(formData.get("prospectId"));
  const nummer = Number(formData.get("nummer"));
  const onderwerp = String(formData.get("onderwerp") ?? "").trim();
  const tekst = String(formData.get("tekst") ?? "").trim();
  if (!Number.isInteger(prospectId) || ![1, 2, 3].includes(nummer)) return;
  await db
    .delete(prospectMails)
    .where(and(eq(prospectMails.prospectId, prospectId), eq(prospectMails.nummer, nummer)));
  if (onderwerp && tekst) {
    await db.insert(prospectMails).values({ prospectId, nummer, onderwerp, tekst });
  }
  revalidatePath("/admin/outreach");
}




/** Video-tegoed van een site aanpassen (standaard 10 per site). */
export async function bewaarVideoLimiet(formData: FormData) {
  await requireAdmin();
  const siteId = Number(formData.get("siteId"));
  const limiet = Number(formData.get("limiet"));
  if (!Number.isInteger(siteId) || !Number.isInteger(limiet) || limiet < 0 || limiet > 10000) return;
  await db.update(sites).set({ videoLimiet: limiet }).where(eq(sites.id, siteId));
  revalidatePath(`/admin/klant/${siteId}`);
}


export async function bewaarAiBudget(formData: FormData) {
  await requireAdmin();
  const siteId = Number(formData.get("siteId"));
  const budget = Number(formData.get("budget"));
  if (!Number.isInteger(siteId) || !Number.isInteger(budget) || budget < 1 || budget > 1000) return;
  await db.update(sites).set({ aiMaandbudgetUsd: budget }).where(eq(sites.id, siteId));
  revalidatePath(`/admin/klant/${siteId}`);
}

export type ReviewMailUitkomst = { ok: boolean; melding: string };

/** Review- en referentieverzoek naar de klant: één klik, huisstijlmail met de
 * Google-reviewknop en de vraag of de site als referentie genoemd mag worden. */
export async function mailReviewVerzoek(
  _vorige: ReviewMailUitkomst | null,
  formData: FormData,
): Promise<ReviewMailUitkomst> {
  await requireAdmin();
  const siteId = Number(formData.get("siteId"));
  if (!Number.isInteger(siteId)) return { ok: false, melding: "Onbekende klant." };
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  if (!site) return { ok: false, melding: "Onbekende klant." };
  const { klantAdres } = await import("@/lib/klant-adres");
  const ontvanger = await klantAdres(site);
  if (!ontvanger) return { ok: false, melding: "Geen e-mailadres bekend bij deze klant." };
  const { inWordSwapHuisstijl, mailVanJos, ontsnap } = await import("@/lib/wordswap-mail");
  const { REVIEW_LINK, TELEFOON } = await import("@/lib/persoonlijk");
  const eigenTekst = String(formData.get("bericht") ?? "").trim().slice(0, 2000);
  const eigenHtml = eigenTekst
    ? eigenTekst.split(/\n{2,}/).map((stuk) => `<p>${ontsnap(stuk).replace(/\n/g, "<br>")}</p>`).join("")
    : "";
  const voornaam = (ontvanger.naam ?? "").trim().split(/\s+/)[0] || "klant";
  const gelukt = await mailVanJos({
    naar: ontvanger.email,
    van: "Jos van WordSwap",
    onderwerp: `Mag ik je twee kleine dingen vragen?`,
    html: inWordSwapHuisstijl(`<p>Hoi ${ontsnap(voornaam)},</p>
${eigenHtml}
<p>Fijn dat je website van <strong>${ontsnap(site.naam)}</strong> bij ons draait. Mag ik je twee kleine dingen vragen? Het kost je hooguit twee minuten en het helpt mijn kleine bedrijf enorm.</p>
<p><strong>1. Een Google-review.</strong> Een paar eerlijke zinnen over hoe je de overstap en het beheren via de chat hebt ervaren — daar hebben andere ondernemers echt iets aan.</p>
<p><a href="${REVIEW_LINK}" style="display:inline-block;background:#31956B;color:#fff !important;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:600"><span style="color:#fff !important;text-decoration:none">Laat een review achter</span></a></p>
<p><strong>2. Mogen we je website als voorbeeld noemen?</strong> Bijvoorbeeld op wordswap.nl, als referentieproject voor nieuwe klanten. Antwoord gewoon "ja" op deze mail, dan weet ik genoeg — en zeg je liever nee, dan is dat natuurlijk ook helemaal prima.</p>
<p>Dank je wel alvast! Vragen of wensen? Antwoord op deze mail of bel me op ${TELEFOON}.</p>
<p>Groet,<br>Jos</p>`),
  });
  if (!gelukt) return { ok: false, melding: "Versturen mislukte. Probeer het nog eens." };
  await db.update(sites).set({ reviewMailOp: new Date() }).where(eq(sites.id, siteId));
  revalidatePath(`/admin/klant/${siteId}`);
  return { ok: true, melding: `Verstuurd naar ${ontvanger.email}.` };
}

/** Wijzigingenteller van deze maand op nul — voor als Jos zelf in het
 * klantaccount heeft zitten testen en de klant er niet op mag inleveren. */
export async function resetWijzigingenTeller(formData: FormData) {
  await requireAdmin();
  const siteId = Number(formData.get("siteId"));
  if (!Number.isInteger(siteId)) return;
  const { usage } = await import("@/db/schema");
  const { and: en } = await import("drizzle-orm");
  const maand = new Date().toISOString().slice(0, 7);
  await db
    .update(usage)
    .set({ wijzigingen: 0 })
    .where(en(eq(usage.siteId, siteId), eq(usage.maand, maand)));
  revalidatePath(`/admin/klant/${siteId}`);
}

/** Fair-use-aantal wijzigingen per maand voor deze klant (pakketbelofte). */
export async function bewaarWijzigingenLimiet(formData: FormData) {
  await requireAdmin();
  const siteId = Number(formData.get("siteId"));
  const limiet = Number(formData.get("limiet"));
  if (!Number.isInteger(siteId) || !Number.isInteger(limiet) || limiet < 1 || limiet > 1000) return;
  await db.update(sites).set({ wijzigingenLimiet: limiet }).where(eq(sites.id, siteId));
  revalidatePath(`/admin/klant/${siteId}`);
}

/** Eenmalig extra wijzigingen voor deze maand; vervalt vanzelf op de 1e. */
export async function bewaarWijzigingenExtra(formData: FormData) {
  await requireAdmin();
  const siteId = Number(formData.get("siteId"));
  const extra = Number(formData.get("extra"));
  if (!Number.isInteger(siteId) || !Number.isInteger(extra) || extra < 0 || extra > 1000) return;
  const { huidigeMaand } = await import("@/lib/ai-budget");
  await db
    .update(sites)
    .set(extra > 0 ? { wijzigingenExtra: extra, wijzigingenExtraMaand: huidigeMaand() } : { wijzigingenExtra: 0, wijzigingenExtraMaand: null })
    .where(eq(sites.id, siteId));
  revalidatePath(`/admin/klant/${siteId}`);
}

/** Eenmalig extra AI-ruimte voor deze maand. Vervalt vanzelf op de 1e van de
 * volgende maand, dus je hoeft hem niet terug te zetten. 0 = meteen weg. */
export async function bewaarAiExtra(formData: FormData) {
  await requireAdmin();
  const siteId = Number(formData.get("siteId"));
  const extra = Number(formData.get("extra"));
  if (!Number.isInteger(siteId) || !Number.isInteger(extra) || extra < 0 || extra > 1000) return;
  const { huidigeMaand } = await import("@/lib/ai-budget");
  await db
    .update(sites)
    .set(extra > 0 ? { aiExtraUsd: extra, aiExtraMaand: huidigeMaand() } : { aiExtraUsd: 0, aiExtraMaand: null })
    .where(eq(sites.id, siteId));
  revalidatePath(`/admin/klant/${siteId}`);
}


/** WhatsApp-kanaal (betaalde extra) aan- of uitzetten voor een site. */
export async function bewaarWhatsapp(formData: FormData) {
  await requireAdmin();
  const siteId = Number(formData.get("siteId"));
  if (!Number.isInteger(siteId)) return;
  const aan = formData.get("aan") === "1";
  await db.update(sites).set({ whatsappActief: aan }).where(eq(sites.id, siteId));
  revalidatePath(`/admin/klant/${siteId}`);
  revalidatePath("/portal");
}


/** Telefoonnummer van een klant koppelen aan zijn site. Alleen nummers die
 * hier staan mogen via WhatsApp met de website praten. Landcode verplicht:
 * "06..." bestaat in tientallen landen en een gok zou een vreemde telefoon
 * aan een site kunnen hangen. */
export async function voegWhatsappNummer(formData: FormData) {
  await requireAdmin();
  const siteId = Number(formData.get("siteId"));
  if (!Number.isInteger(siteId)) return;
  const { normaliseerNummer } = await import("@/lib/whatsapp/berichten");
  const telefoon = normaliseerNummer(String(formData.get("nummer") ?? ""));
  const omschrijving = String(formData.get("omschrijving") ?? "").trim().slice(0, 60) || null;
  if (!telefoon) return;
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  if (!site) return;
  const { whatsappKoppelingen } = await import("@/db/schema");
  const [bestaand] = await db
    .select({ siteId: whatsappKoppelingen.siteId })
    .from(whatsappKoppelingen)
    .where(eq(whatsappKoppelingen.telefoon, telefoon));
  // Eén nummer hoort bij één site; staat hij elders, dan niet stilletjes verhuizen
  if (bestaand && bestaand.siteId !== siteId) return;
  if (!bestaand) {
    await db.insert(whatsappKoppelingen).values({
      siteId,
      clerkUserId: site.clerkUserId,
      telefoon,
      omschrijving,
      gekoppeldOp: new Date(),
    });
  }
  revalidatePath(`/admin/klant/${siteId}`);
  revalidatePath("/portal");
}

export async function verwijderWhatsappNummer(formData: FormData) {
  await requireAdmin();
  const siteId = Number(formData.get("siteId"));
  const id = Number(formData.get("koppelingId"));
  if (!Number.isInteger(siteId) || !Number.isInteger(id)) return;
  const { whatsappKoppelingen } = await import("@/db/schema");
  await db
    .delete(whatsappKoppelingen)
    .where(and(eq(whatsappKoppelingen.id, id), eq(whatsappKoppelingen.siteId, siteId)));
  revalidatePath(`/admin/klant/${siteId}`);
  revalidatePath("/portal");
}

/** Sjabloon vastleggen: de huidige live-versie (main) wordt het punt waarnaar
 * "Reset naar sjabloon" terugzet. Handig voor demo-/webinarsites. */
export async function sjabloonVastleggen(formData: FormData) {
  await requireAdmin();
  const siteId = Number(formData.get("siteId"));
  if (!Number.isInteger(siteId)) return;
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  if (!site) return;
  await metSiteSlot(siteId, async () => {
    const { gh, GITHUB_ORG } = await import("@/lib/github");
    const main = (await gh(`/repos/${GITHUB_ORG}/${site.githubRepo}/git/ref/heads/main`)) as { object: { sha: string } };
    const bestaat = await gh(`/repos/${GITHUB_ORG}/${site.githubRepo}/git/ref/heads/sjabloon`).then(() => true).catch(() => false);
    if (bestaat) {
      await gh(`/repos/${GITHUB_ORG}/${site.githubRepo}/git/refs/heads/sjabloon`, {
        method: "PATCH",
        body: JSON.stringify({ sha: main.object.sha, force: true }),
      });
    } else {
      await gh(`/repos/${GITHUB_ORG}/${site.githubRepo}/git/refs`, {
        method: "POST",
        body: JSON.stringify({ ref: "refs/heads/sjabloon", sha: main.object.sha }),
      });
    }
  });
  revalidatePath(`/admin/klant/${siteId}`);
}

/** Site terugzetten naar het sjabloon: main = sjabloon, open concepten en
 * chatgeschiedenis weg, live én werkversie opnieuw neergezet. */
export async function siteResetten(formData: FormData) {
  await requireAdmin();
  const siteId = Number(formData.get("siteId"));
  if (!Number.isInteger(siteId)) return;
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  if (!site) return;
  const { gh, GITHUB_ORG, pushBestanden } = await import("@/lib/github");
  const { laadWerkmap, ruimWerkmapOp, alleBestandenVan } = await import("@/lib/werkmap");
  const { deployMapNaarCloudflare } = await import("@/lib/cloudflare");
  const { readFile } = await import("node:fs/promises");
  const path = (await import("node:path")).default;
  const { changes, messages } = await import("@/db/schema");

  const vrijgeven = await (await import("@/lib/operation-guards")).claimOperation(`site:${siteId}`);
  if (!vrijgeven) redirect(`/admin/klant/${siteId}?slot=bezet`);
  let werkmap: string | null = null;
  try {
    werkmap = await laadWerkmap(site.githubRepo, "sjabloon");
    const bestanden = await Promise.all(
      (await alleBestandenVan(werkmap)).map(async (pad) => ({ pad, inhoud: await readFile(path.join(werkmap!, pad)) }))
    );
    await pushBestanden(site.githubRepo, bestanden, "Reset naar sjabloon (admin)");

    // Open concept-branches en PR's opruimen
    const prs = (await gh(`/repos/${GITHUB_ORG}/${site.githubRepo}/pulls?state=open`).catch(() => [])) as { number: number; head: { ref: string } }[];
    for (const pr of prs) {
      await gh(`/repos/${GITHUB_ORG}/${site.githubRepo}/pulls/${pr.number}`, { method: "PATCH", body: JSON.stringify({ state: "closed" }) }).catch(() => {});
      await gh(`/repos/${GITHUB_ORG}/${site.githubRepo}/git/refs/heads/${pr.head.ref}`, { method: "DELETE" }).catch(() => {});
    }
    const refs = (await gh(`/repos/${GITHUB_ORG}/${site.githubRepo}/git/matching-refs/heads/`).catch(() => [])) as { ref: string }[];
    for (const r of refs) {
      const naam = r.ref.replace("refs/heads/", "");
      if (naam.startsWith("wijziging-") || naam.startsWith("demo-")) {
        await gh(`/repos/${GITHUB_ORG}/${site.githubRepo}/git/refs/heads/${naam}`, { method: "DELETE" }).catch(() => {});
      }
    }

    await db.delete(changes).where(eq(changes.siteId, site.id));
    await db.delete(messages).where(eq(messages.siteId, site.id));

    await deployMapNaarCloudflare(werkmap, site.githubRepo);
    const wv = `wv-${site.siteSlug ?? site.githubRepo}`;
    await deployMapNaarCloudflare(werkmap, wv).catch((e) => console.error("Werkversie-reset mislukt:", e));
  } finally {
    if (werkmap) await ruimWerkmapOp(werkmap).catch(() => {});
    await vrijgeven();
  }
  revalidatePath(`/admin/klant/${siteId}`);
}

/** Chatgeschiedenis van een site wissen — alles, of alleen die van één
 * gebruiker (bv. Jos' eigen beheer-chats). Klanten zien elkaars en Jos'
 * gesprekken toch al niet; dit ruimt de opslag zelf op. */
export async function wisChatGeschiedenis(formData: FormData) {
  await requireAdmin();
  const { and: en, eq: is, isNull } = await import("drizzle-orm");
  const { messages } = await import("@/db/schema");
  const siteId = Number(formData.get("siteId"));
  if (!Number.isInteger(siteId)) return;
  const gebruiker = String(formData.get("clerkUserId") ?? "").trim();
  await db
    .delete(messages)
    .where(
      gebruiker === "onbekend"
        ? en(is(messages.siteId, siteId), isNull(messages.clerkUserId))
        : gebruiker
          ? en(is(messages.siteId, siteId), is(messages.clerkUserId, gebruiker))
          : is(messages.siteId, siteId),
    );
  revalidatePath(`/admin/klant/${siteId}`);
}

/** Aankondiging voor klanten plaatsen (verschijnt bovenaan het portaal, wegklikbaar). */
export async function aankondigingPlaatsen(formData: FormData) {
  await requireAdmin();
  const { aankondigingen } = await import("@/db/schema");
  const titel = String(formData.get("titel") ?? "").trim().slice(0, 120);
  const tekst = String(formData.get("tekst") ?? "").trim().slice(0, 1000);
  const link = String(formData.get("link") ?? "").trim().slice(0, 300);
  if (!titel || !tekst) return;
  await db.insert(aankondigingen).values({ titel, tekst, link: link || null });
  revalidatePath("/admin/aankondigingen");
  revalidatePath("/portal");
}

/** Aankondiging aan/uit zetten of verwijderen. */
export async function aankondigingBijwerken(formData: FormData) {
  await requireAdmin();
  const { aankondigingen } = await import("@/db/schema");
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  const actie = String(formData.get("actie") ?? "");
  if (actie === "verwijder") await db.delete(aankondigingen).where(eq(aankondigingen.id, id));
  else if (actie === "uit") await db.update(aankondigingen).set({ actief: false }).where(eq(aankondigingen.id, id));
  else if (actie === "aan") await db.update(aankondigingen).set({ actief: true }).where(eq(aankondigingen.id, id));
  revalidatePath("/admin/aankondigingen");
  revalidatePath("/portal");
}

/* ---------- Ontwerp-route: nieuw ontwerp naast live en werkversie ---------- */

export async function ontwerpMaken(formData: FormData) {
  await requireAdmin();
  const siteId = Number(formData.get("siteId"));
  if (!Number.isInteger(siteId)) return;
  const { siteVoorOntwerp, maakOfVerversOntwerp } = await import("@/lib/ontwerp");
  const site = await siteVoorOntwerp(siteId);
  if (!site?.siteSlug) return;
  await maakOfVerversOntwerp(site);
  revalidatePath(`/admin/klant/${siteId}`);
}

export async function ontwerpBijwerken(formData: FormData) {
  await requireAdmin();
  const siteId = Number(formData.get("siteId"));
  if (!Number.isInteger(siteId)) return;
  const { siteVoorOntwerp, werkOntwerpBij } = await import("@/lib/ontwerp");
  const site = await siteVoorOntwerp(siteId);
  if (!site?.siteSlug) return;
  const uitkomst = await werkOntwerpBij(site);
  revalidatePath(`/admin/klant/${siteId}`);
  if (uitkomst === "conflict") {
    const { redirect } = await import("next/navigation");
    redirect(
      `/admin/klant/${siteId}?ontwerp=${encodeURIComponent(
        "Bijwerken gaf een conflict: dezelfde plek is op live én in het ontwerp gewijzigd. Los dit lokaal op (git merge main op de ontwerp-branch)."
      )}`
    );
  }
}

export async function ontwerpPromoveren(formData: FormData) {
  await requireAdmin();
  const siteId = Number(formData.get("siteId"));
  if (!Number.isInteger(siteId)) return;
  const { siteVoorOntwerp, promoveerOntwerp } = await import("@/lib/ontwerp");
  const site = await siteVoorOntwerp(siteId);
  if (!site?.siteSlug) return;
  let melding: string;
  try {
    const uitkomst = await promoveerOntwerp(site);
    if (uitkomst.soort === "ok")
      melding = "Het ontwerp staat als concept op de werkversie. De klant kan het bekijken en akkoord geven; Publiceren zet het live.";
    else if (uitkomst.soort === "open-concept")
      melding = "Er staat al een concept open voor deze site. Publiceer of verwerp dat eerst; daarna kan het ontwerp erheen.";
    else if (uitkomst.soort === "achter")
      melding = `Het ontwerp loopt ${uitkomst.achter} wijziging(en) achter op de live site. Klik eerst op Bijwerken vanaf live, zodat tekstwijzigingen van de klant meegaan.`;
    else {
      const eerste = uitkomst.fouten
        .slice(0, 3)
        .map((f) => `${f.waar}: ${f.detail}`)
        .join(" | ");
      melding = `Bouw-controle: ${uitkomst.fouten.length} fout(en), promotie geblokkeerd. ${eerste}`;
    }
  } catch (e) {
    console.error("Ontwerp promoveren:", e);
    melding = "Promotie mislukt door een technische fout; zie de logs. Er is niets gepubliceerd.";
  }
  revalidatePath(`/admin/klant/${siteId}`);
  const { redirect } = await import("next/navigation");
  redirect(`/admin/klant/${siteId}?ontwerp=${encodeURIComponent(melding.slice(0, 600))}`);
}


export async function ontwerpZichtbaarheid(formData: FormData) {
  await requireAdmin();
  const siteId = Number(formData.get("siteId"));
  if (!Number.isInteger(siteId)) return;
  const aan = formData.get("aan") === "ja";
  const { siteVoorOntwerp, maakOfVerversOntwerp, verbergOntwerp } = await import("@/lib/ontwerp");
  const site = await siteVoorOntwerp(siteId);
  if (!site?.siteSlug) return;
  try {
    if (aan) {
      // Tonen: zo nodig eerst een (nieuw) adres maken — dat is de trage stap,
      // en pas als die slaagt gaat de kaart bij de klant aan.
      if (!site.ontwerpSlug) await maakOfVerversOntwerp(site);
      await db.update(sites).set({ ontwerpZichtbaar: true }).where(eq(sites.id, siteId));
    } else {
      // Verbergen: direct — adres weg, kaart weg, gedeelde link dood.
      await verbergOntwerp(site);
    }
  } catch (e) {
    console.error("Ontwerp-zichtbaarheid:", e);
    revalidatePath(`/admin/klant/${siteId}`);
    const { redirect } = await import("next/navigation");
    redirect(`/admin/klant/${siteId}?ontwerp=${encodeURIComponent(aan ? "Tonen is niet gelukt (adres maken brak af). Probeer het nog eens; bij een grote site kan de eerste keer lang duren." : "Verbergen is niet gelukt; het adres bestaat mogelijk nog. Probeer het nog eens.")}`);
  }
  revalidatePath(`/admin/klant/${siteId}`);
  revalidatePath("/portal");
}

export async function ontwerpVerwijderen(formData: FormData) {
  await requireAdmin();
  const siteId = Number(formData.get("siteId"));
  if (!Number.isInteger(siteId)) return;
  const { siteVoorOntwerp, verwijderOntwerp } = await import("@/lib/ontwerp");
  const site = await siteVoorOntwerp(siteId);
  if (!site?.siteSlug) return;
  await verwijderOntwerp(site);
  revalidatePath(`/admin/klant/${siteId}`);
  revalidatePath("/portal");
}
