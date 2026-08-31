"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { sites } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

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
  const netlifySiteId = String(formData.get("netlifySiteId") ?? "").trim();
  const plan = String(formData.get("plan") ?? "via_ons");
  const status = String(formData.get("status") ?? "migratie");
  if (!naam) return;
  await db
    .update(sites)
    .set({
      naam,
      domein: domein || null,
      netlifySiteId: netlifySiteId || null,
      plan: plan === "eigen_key" ? "eigen_key" : "via_ons",
      status: (["migratie", "actief", "gepauzeerd", "opgezegd"].includes(status)
        ? status
        : "migratie") as "migratie" | "actief" | "gepauzeerd" | "opgezegd",
    })
    .where(eq(sites.id, siteId));
  revalidatePath(`/admin/klant/${siteId}`);
  revalidatePath("/admin");
}

/** Koppelt een klantaccount (Clerk) aan een site op basis van e-mail; nodigt uit als het account nog niet bestaat. */
export async function koppelKlant(formData: FormData): Promise<void> {
  await requireAdmin();
  const siteId = Number(formData.get("siteId"));
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!Number.isInteger(siteId) || !email.includes("@")) return;

  const secret = process.env.CLERK_SECRET_KEY;
  const res = await fetch(
    `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(email)}`,
    { headers: { Authorization: `Bearer ${secret}` } }
  );
  const users = (await res.json()) as { id: string }[];

  if (Array.isArray(users) && users.length > 0) {
    await db
      .update(sites)
      .set({ clerkUserId: users[0].id, uitnodigingEmail: null })
      .where(eq(sites.id, siteId));
  } else {
    // Account bestaat nog niet: uitnodiging sturen en het adres onthouden —
    // het portaal koppelt de site automatisch zodra dit adres voor het eerst
    // inlogt.
    await fetch("https://api.clerk.com/v1/invitations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email_address: email }),
    });
    await db
      .update(sites)
      .set({ uitnodigingEmail: email })
      .where(eq(sites.id, siteId));
  }
  revalidatePath(`/admin/klant/${siteId}`);
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
  const ookNetlify = formData.get("ookNetlify") === "on";
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

  if (ookNetlify && site.netlifySiteId) {
    const { verwijderCloudflareSite } = await import("@/lib/cloudflare");
    await verwijderCloudflareSite(site.netlifySiteId);
    await verwijderCloudflareSite(`wv-${site.netlifySiteId}`);
  }

  revalidatePath("/admin");
  redirect("/admin");
}

/** Zet de site online op Cloudflare (gratis, direct, geen build). */
export async function koppelNetlify(formData: FormData) {
  await requireAdmin();
  const siteId = Number(formData.get("siteId"));
  if (!Number.isInteger(siteId)) return;
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  if (!site || site.netlifySiteId) return;

  const { deployRepoNaarCloudflare, CF_SUBDOMEIN } = await import("@/lib/cloudflare");
  await deployRepoNaarCloudflare(site.githubRepo, site.githubRepo);
  // Werkversie-adres alvast klaarzetten (SSL heeft even nodig bij eerste keer)
  await deployRepoNaarCloudflare(site.githubRepo, `wv-${site.githubRepo}`).catch(() => {});
  await db
    .update(sites)
    .set({
      netlifySiteId: site.githubRepo,
      domein: `${site.githubRepo}.${CF_SUBDOMEIN}.workers.dev`,
    })
    .where(eq(sites.id, siteId));
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
  const { zetTerugNaarVersie } = await import("@/lib/github");
  await zetTerugNaarVersie(site.githubRepo, sha);
  if (site.netlifySiteId) {
    const { deployRepoNaarCloudflare } = await import("@/lib/cloudflare");
    await deployRepoNaarCloudflare(site.githubRepo, site.netlifySiteId).catch((e) =>
      console.error("Deploy na terugzetten mislukt:", e)
    );
  }
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
  if (!bedrijf || !website || !email.includes("@")) return;
  // Nooit iemand opnieuw opvoeren die zich heeft afgemeld
  const [bestaand] = await db.select().from(prospects).where(eq(prospects.email, email));
  if (bestaand) {
    revalidatePath("/admin/outreach");
    return;
  }
  await db.insert(prospects).values({ bedrijf, website, email, observatie: observatie || null });
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
  const { maakOutreachMail } = await import("@/lib/outreach");
  const mail = maakOutreachMail(nummer, p);

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
      reply_to: ["info@aibackoffice.nl"],
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
      ...(nummer === 1 ? { mail1Op: new Date() } : nummer === 2 ? { mail2Op: new Date() } : { mail3Op: new Date() }),
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
  const wanneer = new Date(`${datum}T${tijd}`);
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
    await db.delete(webinars).where(eq(webinars.id, id));
  } else {
    const opnameLink = String(formData.get("opnameLink") ?? "").trim();
    const actief = formData.get("actief") === "on";
    await db.update(webinars).set({ opnameLink: opnameLink || null, actief }).where(eq(webinars.id, id));
  }
  revalidatePath("/admin/webinars");
  revalidatePath("/webinar");
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
  const ontvangers = inzendingen
    .filter((i) => (i.velden as Record<string, string>).webinar === w.titel)
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
  });
  const linkBlok = w.meetLink
    ? `<p style="margin:20px 0"><a href="${w.meetLink}" style="background:#6d28d9;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:600">Deelnemen aan het webinar</a></p><p style="font-size:13px;color:#78716c">Of plak deze link in je browser: ${w.meetLink}</p>`
    : "";

  const teksten: Record<string, { onderwerp: string; html: string }> = {
    link: {
      onderwerp: `De deelnamelink voor het webinar (${wanneer})`,
      html: `<p>Hallo{{naam}},</p><p>Hierbij de link voor het webinar <strong>${w.titel}</strong> op <strong>${wanneer}</strong>. Bewaar deze mail — je hebt hem straks nodig om deel te nemen.</p>${linkBlok}<p>Tot dan!</p>`,
    },
    herinnering: {
      onderwerp: `Vandaag: het webinar begint om ${w.wanneer.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}`,
      html: `<p>Hallo{{naam}},</p><p>Kleine herinnering: vandaag om <strong>${w.wanneer.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}</strong> begint het webinar <strong>${w.titel}</strong>. Het duurt ongeveer een half uur en je mag gerust alleen luisteren.</p>${linkBlok}<p>Tot zo!</p>`,
    },
    followup: {
      onderwerp: `Bedankt voor je interesse in het webinar`,
      html: `<p>Hallo{{naam}},</p><p>Bedankt voor je aanmelding voor <strong>${w.titel}</strong>.${
        w.opnameLink
          ? ` Kon je er niet bij zijn of wil je iets terugkijken? <a href="${w.opnameLink}">Hier staat de opname</a>.`
          : ""
      }</p><p>Wil je weten wat de overstap voor jóuw website betekent? Vraag vrijblijvend de gratis site-check aan op <a href="https://wordswap.nl/contact">wordswap.nl/contact</a> — je krijgt binnen één werkdag een eerlijk antwoord en een vaste prijs. En het is no cure, no pay: pas als je tevreden bent met de kopie van je site betaal je iets.</p><p>Groet,<br>Jos — WordSwap</p>`,
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
        reply_to: ["info@aibackoffice.nl"],
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
      reply_to: ["info@aibackoffice.nl"],
    }),
  }).catch((e) => console.error("Testmail mislukt:", e));
  revalidatePath("/admin/outreach");
}
