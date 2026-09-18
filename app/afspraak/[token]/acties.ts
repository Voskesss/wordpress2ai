"use server";

import { currentUser } from "@clerk/nextjs/server";
import { and, eq, gte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { afspraken, sites } from "@/db/schema";
import { duurInWoorden, momentInWoorden, vrijeMomenten } from "@/lib/afspraken";
import { afspraakStand, bezetteTijden } from "@/lib/afspraken-db";
import { mailVanJos, ontsnap } from "@/lib/wordswap-mail";

/** Hooguit zoveel aanvragen per site per uur: rem tegen misbruik van de link. */
const MAX_PER_UUR = 5;

export type KiesUitkomst = { ok: boolean; melding: string };

/**
 * De klant kiest een moment. De code in de link is het enige bewijs; verder
 * controleren we alles opnieuw op de server: bestaat het moment echt in de
 * klaargezette dagen, is het nog vrij, en is er niet al te vaak geboekt.
 */
export async function kiesMoment(_vorige: KiesUitkomst | null, formData: FormData): Promise<KiesUitkomst> {
  const token = String(formData.get("token") ?? "");
  const gekozen = String(formData.get("moment") ?? "");
  const telefoon = String(formData.get("telefoon") ?? "").trim().slice(0, 40);
  const opmerking = String(formData.get("opmerking") ?? "").trim().slice(0, 1000);
  if (!token || token.length < 20) return { ok: false, melding: "Deze link werkt niet meer." };

  const [site] = await db.select().from(sites).where(eq(sites.afspraakToken, token));
  if (!site) return { ok: false, melding: "Deze link werkt niet meer." };

  // Is de bezoeker ingelogd als deze klant? Dan nemen we naam en e-mail uit zijn
  // account over; wat er in het formulier stond doet er dan niet toe.
  const gebruiker = await currentUser().catch(() => null);
  const ingelogd = Boolean(gebruiker && gebruiker.id === site.clerkUserId);
  const naam = ingelogd
    ? [gebruiker!.firstName, gebruiker!.lastName].filter(Boolean).join(" ") || site.naam
    : String(formData.get("naam") ?? "").trim().slice(0, 120);
  const email = ingelogd
    ? (gebruiker!.emailAddresses?.[0]?.emailAddress ?? "")
    : String(formData.get("email") ?? "").trim().slice(0, 160);
  if (!naam || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, melding: "Vul je naam en een geldig e-mailadres in." };
  }

  const eenUurGeleden = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await db
    .select({ id: afspraken.id })
    .from(afspraken)
    .where(and(eq(afspraken.siteId, site.id), gte(afspraken.aangemaakt, eenUurGeleden)));
  if (recent.length >= MAX_PER_UUR) {
    return { ok: false, melding: "Er zijn net al meerdere momenten aangevraagd. Probeer het over een uurtje nog eens, of mail Jos." };
  }

  // Het gekozen moment moet echt in de klaargezette dagen zitten en nog vrij zijn
  const { blokken } = await afspraakStand(site.id);
  const dagen = vrijeMomenten(blokken, await bezetteTijden(), new Date());
  const keuze = dagen.flatMap((d) => d.tijden.map((t) => ({ ...t, duurMinuten: d.duurMinuten })))
    .find((t) => t.start.toISOString() === gekozen);
  if (!keuze) {
    return { ok: false, melding: "Dat moment is net vergeven of vervallen. Kies een ander tijdstip." };
  }

  const [rij] = await db
    .insert(afspraken)
    .values({
      siteId: site.id,
      start: keuze.start,
      duurMinuten: keuze.duurMinuten,
      naam,
      email,
      telefoon: telefoon || null,
      opmerking: opmerking || null,
      onderwerp: `Afspraak over ${site.naam}`,
      ingelogd,
      clerkUserId: ingelogd ? (gebruiker?.id ?? null) : null,
    })
    .returning({ id: afspraken.id });

  const wanneer = momentInWoorden(keuze.start, keuze.duurMinuten);
  await mailVanJos({
    naar: "jos@wordswap.nl",
    bcc: false,
    onderwerp: `⏳ Bevestigen: afspraak ${site.naam} — ${wanneer}`,
    html: `<p><strong>${ontsnap(naam)}</strong> (${ontsnap(email)}${telefoon ? `, ${ontsnap(telefoon)}` : ""}) wil afspreken over <strong>${ontsnap(site.naam)}</strong>.</p>
<p>${ingelogd ? "✅ <strong>Ingelogd als de klant</strong> — naam en e-mail komen uit zijn eigen account." : "⚠️ Via de planlink, niet ingelogd — de opgegeven gegevens zijn niet gecontroleerd."}</p>
<ul>
<li>Wanneer: <strong>${ontsnap(wanneer)}</strong> (${duurInWoorden(keuze.duurMinuten)})</li>
${opmerking ? `<li>Bericht: ${ontsnap(opmerking)}</li>` : ""}
</ul>
<p style="background:#fef3c7;border:1px solid #fcd34d;border-radius:12px;padding:12px 16px"><strong>De afspraak staat nog niet vast.</strong> De klant wacht op jouw bevestiging — pas daarna krijgt hij het agendabestand en verdwijnen de voorgestelde dagen.</p>
<p><a href="https://www.wordswap.nl/admin/klant/${site.id}#afspraken-blok" style="display:inline-block;background:#31956B;color:#fff !important;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:600"><span style="color:#fff !important;text-decoration:none">Bevestigen op wordswap.nl</span></a></p>`,
  });
  await mailVanJos({
    naar: email,
    van: "Jos van WordSwap",
    onderwerp: `Je voorkeur is doorgegeven: ${wanneer}`,
    html: `<p>Beste ${ontsnap(naam.split(" ")[0])},</p>
<p>Je voorkeur voor <strong>${ontsnap(wanneer)}</strong> (${duurInWoorden(keuze.duurMinuten)}) is bij mij binnen. Ik bevestig hem zo snel mogelijk; dan krijg je een mailtje met een agendabestand erbij.</p>
<p>Met vriendelijke groet,<br>Jos Klijnhout<br>WordSwap</p>`,
  });

  revalidatePath(`/afspraak/${token}`);
  revalidatePath(`/admin/klant/${site.id}`);
  revalidatePath("/portal");
  return {
    ok: true,
    melding: `Gelukt — je voorkeur voor ${wanneer} is doorgegeven (aanvraag ${rij.id}). Je krijgt een bevestiging per mail.`,
  };
}

/**
 * De klant zegt zelf af — een openstaande aanvraag of een bevestigde afspraak.
 * De code in de link is het bewijs; Jos krijgt altijd bericht.
 */
export async function zegAfspraakAf(_vorige: KiesUitkomst | null, formData: FormData): Promise<KiesUitkomst> {
  const token = String(formData.get("token") ?? "");
  const afspraakId = Number(formData.get("afspraakId"));
  const reden = String(formData.get("reden") ?? "").trim().slice(0, 500);
  if (!token || token.length < 20 || !Number.isInteger(afspraakId)) {
    return { ok: false, melding: "Afzeggen lukte niet. Mail Jos even op info@wordswap.nl." };
  }
  const [site] = await db.select().from(sites).where(eq(sites.afspraakToken, token));
  if (!site) return { ok: false, melding: "Deze link werkt niet meer." };
  const [afspraak] = await db
    .select()
    .from(afspraken)
    .where(and(eq(afspraken.id, afspraakId), eq(afspraken.siteId, site.id)));
  if (!afspraak || afspraak.status === "geannuleerd") {
    return { ok: false, melding: "Deze afspraak staat niet (meer) open." };
  }
  const gebruiker = await currentUser().catch(() => null);
  const ingelogd = Boolean(gebruiker && gebruiker.id === site.clerkUserId);
  const wasBevestigd = afspraak.status === "bevestigd";
  await db
    .update(afspraken)
    .set({ status: "geannuleerd", afzegReden: reden || null })
    .where(eq(afspraken.id, afspraak.id));

  const wanneer = momentInWoorden(afspraak.start, afspraak.duurMinuten);
  await mailVanJos({
    naar: "jos@wordswap.nl",
    bcc: false,
    onderwerp: `❌ ${wasBevestigd ? "Afspraak afgezegd" : "Aanvraag ingetrokken"}: ${site.naam} — ${wanneer}`,
    html: `<p>${ontsnap(afspraak.naam ?? site.naam)} heeft ${
      wasBevestigd ? "de bevestigde afspraak" : "de aanvraag"
    } voor <strong>${ontsnap(site.naam)}</strong> afgezegd: <strong>${ontsnap(wanneer)}</strong>.</p>
<p>Reden: ${reden ? `<strong>${ontsnap(reden)}</strong>` : "geen reden opgegeven"}</p>
<p>${ingelogd ? "✅ Ingelogd als de klant." : "🔗 Via de planlink."}${
      wasBevestigd ? " Haal hem ook uit je agenda. Zet gerust nieuwe dagen klaar voor een ander moment." : ""
    }</p>
<p><a href="https://www.wordswap.nl/admin/klant/${site.id}#afspraken-blok">Naar de klant in de admin</a></p>`,
  });
  if (afspraak.email) {
    await mailVanJos({
      naar: afspraak.email,
      van: "Jos van WordSwap",
      onderwerp: "Je afspraak is afgezegd",
      html: `<p>Beste ${ontsnap((afspraak.naam ?? "").split(" ")[0] || "klant")},</p>
<p>Je hebt ${wasBevestigd ? "de afspraak" : "je aanvraag"} voor <strong>${ontsnap(wanneer)}</strong> afgezegd. Helemaal goed — wil je een nieuw moment, mail me gerust of kijk of er tijden klaarstaan.</p>
<p>Met vriendelijke groet,<br>Jos Klijnhout<br>WordSwap</p>`,
    });
  }
  revalidatePath(`/afspraak/${token}`);
  revalidatePath(`/admin/klant/${site.id}`);
  revalidatePath("/portal");
  return { ok: true, melding: `${wasBevestigd ? "De afspraak" : "Je aanvraag"} voor ${wanneer} is afgezegd.` };
}
