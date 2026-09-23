"use server";

import { currentUser } from "@clerk/nextjs/server";
import { and, eq, gte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { afspraken } from "@/db/schema";
import { duurInWoorden, momentInWoorden, vrijeMomenten } from "@/lib/afspraken";
import {
  afspraakStand,
  afspraakVan,
  bezetteTijden,
  eigenaarKolommen,
  eigenaarPad,
  eigenaarViaToken,
} from "@/lib/afspraken-db";
import { werkLeadStatusBijAfspraak } from "@/lib/lead-afspraakstatus";
import { inWordSwapHuisstijl, mailVanJos, ontsnap } from "@/lib/wordswap-mail";

/** Hooguit zoveel aanvragen per planlink per uur: rem tegen misbruik van de link. */
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

  const wie = await eigenaarViaToken(token);
  if (!wie) return { ok: false, melding: "Deze link werkt niet meer." };
  const { eigenaar } = wie;

  // Is de bezoeker ingelogd als deze klant? Dan nemen we naam en e-mail uit zijn
  // account over; wat er in het formulier stond doet er dan niet toe. Een lead
  // heeft geen account, dus daar kan dit niet.
  const gebruiker = wie.clerkUserId ? await currentUser().catch(() => null) : null;
  const ingelogd = Boolean(gebruiker && wie.clerkUserId && gebruiker.id === wie.clerkUserId);
  // Een lead met een bekend adres kreeg de uitnodiging al op dat adres: dat
  // gebruiken we, en niet wat er getypt wordt. Een tikfout (jos@ in plaats van
  // josklijnhout@) liet eerder elke bevestiging en afzegging stuiteren.
  const bekend = wie.leadEmail ? { naam: wie.naam, email: wie.leadEmail } : null;
  const naam = ingelogd
    ? [gebruiker!.firstName, gebruiker!.lastName].filter(Boolean).join(" ") || wie.naam
    : bekend
      ? bekend.naam
      : String(formData.get("naam") ?? "").trim().slice(0, 120);
  const email = ingelogd
    ? (gebruiker!.emailAddresses?.[0]?.emailAddress ?? "")
    : bekend
      ? bekend.email
      : String(formData.get("email") ?? "").trim().slice(0, 160);
  if (!naam || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, melding: "Vul je naam en een geldig e-mailadres in." };
  }

  const eenUurGeleden = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await db
    .select({ id: afspraken.id })
    .from(afspraken)
    .where(and(afspraakVan(eigenaar), gte(afspraken.aangemaakt, eenUurGeleden)));
  if (recent.length >= MAX_PER_UUR) {
    return { ok: false, melding: "Er zijn net al meerdere momenten aangevraagd. Probeer het over een uurtje nog eens, of mail Jos." };
  }

  // Het gekozen moment moet echt in de klaargezette dagen zitten en nog vrij zijn
  const { blokken } = await afspraakStand(eigenaar);
  const dagen = vrijeMomenten(blokken, await bezetteTijden(), new Date());
  const keuze = dagen.flatMap((d) => d.tijden.map((t) => ({ ...t, duurMinuten: d.duurMinuten })))
    .find((t) => t.start.toISOString() === gekozen);
  if (!keuze) {
    return { ok: false, melding: "Dat moment is net vergeven of vervallen. Kies een ander tijdstip." };
  }

  const [rij] = await db
    .insert(afspraken)
    .values({
      ...eigenaarKolommen(eigenaar),
      start: keuze.start,
      duurMinuten: keuze.duurMinuten,
      naam,
      email,
      telefoon: telefoon || null,
      opmerking: opmerking || null,
      onderwerp: eigenaar.soort === "site" ? `Afspraak over ${wie.naam}` : `Kennismaken met ${wie.naam}`,
      ingelogd,
      clerkUserId: ingelogd ? (gebruiker?.id ?? null) : null,
    })
    .returning({ id: afspraken.id });

  const wanneer = momentInWoorden(keuze.start, keuze.duurMinuten);
  await mailVanJos({
    naar: "jos@wordswap.nl",
    bcc: false,
    onderwerp: `⏳ Bevestigen: ${eigenaar.soort === "lead" ? "kennismaking" : "afspraak"} ${wie.naam} — ${wanneer}`,
    html: `<p><strong>${ontsnap(naam)}</strong> (${ontsnap(email)}${telefoon ? `, ${ontsnap(telefoon)}` : ""}) wil afspreken over <strong>${ontsnap(wie.naam)}</strong>${
      eigenaar.soort === "lead" ? " (potentiële klant uit de leadlijst)" : ""
    }.</p>
<p>${ingelogd ? "✅ <strong>Ingelogd als de klant</strong> — naam en e-mail komen uit zijn eigen account." : "⚠️ Via de planlink, niet ingelogd — de opgegeven gegevens zijn niet gecontroleerd."}</p>
<ul>
<li>Wanneer: <strong>${ontsnap(wanneer)}</strong> (${duurInWoorden(keuze.duurMinuten)})</li>
${opmerking ? `<li>Bericht: ${ontsnap(opmerking)}</li>` : ""}
</ul>
<p style="background:#fef3c7;border:1px solid #fcd34d;border-radius:12px;padding:12px 16px"><strong>De afspraak staat nog niet vast.</strong> De klant wacht op jouw bevestiging — pas daarna krijgt hij het agendabestand en verdwijnen de voorgestelde dagen.</p>
<p><a href="https://www.wordswap.nl${eigenaarPad(eigenaar)}#afspraken" style="display:inline-block;background:#31956B;color:#fff !important;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:600"><span style="color:#fff !important;text-decoration:none">Bevestigen op wordswap.nl</span></a></p>`,
  });
  await mailVanJos({
    naar: email,
    van: "Jos van WordSwap",
    onderwerp: `Je voorkeur is doorgegeven: ${wanneer}`,
    html: inWordSwapHuisstijl(`<p>Beste ${ontsnap(naam.split(" ")[0])},</p>
<p>Je voorkeur voor <strong>${ontsnap(wanneer)}</strong> (${duurInWoorden(keuze.duurMinuten)}) is bij mij binnen. Ik bevestig hem zo snel mogelijk; dan krijg je een mailtje met een agendabestand erbij.</p>
<p>Groet,<br>Jos</p>`),
  });

  revalidatePath(`/afspraak/${token}`);
  revalidatePath(eigenaarPad(eigenaar));
  if (eigenaar.soort === "site") revalidatePath("/portal");
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
  const wie = await eigenaarViaToken(token);
  if (!wie) return { ok: false, melding: "Deze link werkt niet meer." };
  const { eigenaar } = wie;
  const [afspraak] = await db
    .select()
    .from(afspraken)
    .where(and(eq(afspraken.id, afspraakId), afspraakVan(eigenaar)));
  if (!afspraak || afspraak.status === "geannuleerd") {
    return { ok: false, melding: "Deze afspraak staat niet (meer) open." };
  }
  const gebruiker = wie.clerkUserId ? await currentUser().catch(() => null) : null;
  const ingelogd = Boolean(gebruiker && wie.clerkUserId && gebruiker.id === wie.clerkUserId);
  const wasBevestigd = afspraak.status === "bevestigd";
  await db
    .update(afspraken)
    .set({ status: "geannuleerd", afzegReden: reden || null })
    .where(eq(afspraken.id, afspraak.id));

  // Zegt hij de afspraak af, dan klopt "Afspraak gepland" niet meer
  if (eigenaar.soort === "lead") await werkLeadStatusBijAfspraak(eigenaar.id);

  const wanneer = momentInWoorden(afspraak.start, afspraak.duurMinuten);
  await mailVanJos({
    naar: "jos@wordswap.nl",
    bcc: false,
    onderwerp: `❌ ${wasBevestigd ? "Afspraak afgezegd" : "Aanvraag ingetrokken"}: ${wie.naam} — ${wanneer}`,
    html: `<p>${ontsnap(afspraak.naam ?? wie.naam)} heeft ${
      wasBevestigd ? "de bevestigde afspraak" : "de aanvraag"
    } voor <strong>${ontsnap(wie.naam)}</strong> afgezegd: <strong>${ontsnap(wanneer)}</strong>.</p>
<p>Reden: ${reden ? `<strong>${ontsnap(reden)}</strong>` : "geen reden opgegeven"}</p>
<p>${ingelogd ? "✅ Ingelogd als de klant." : "🔗 Via de planlink."}${
      wasBevestigd ? " Haal hem ook uit je agenda. Zet gerust nieuwe dagen klaar voor een ander moment." : ""
    }</p>
<p><a href="https://www.wordswap.nl${eigenaarPad(eigenaar)}#afspraken">Naar ${
      eigenaar.soort === "lead" ? "de lead" : "de klant"
    } in de admin</a></p>`,
  });
  if (afspraak.email) {
    await mailVanJos({
      naar: afspraak.email,
      van: "Jos van WordSwap",
      onderwerp: "Je afspraak is afgezegd",
      html: inWordSwapHuisstijl(`<p>Beste ${ontsnap((afspraak.naam ?? "").split(" ")[0] || "klant")},</p>
<p>Je hebt ${wasBevestigd ? "de afspraak" : "je aanvraag"} voor <strong>${ontsnap(wanneer)}</strong> afgezegd. Helemaal goed — wil je een nieuw moment, mail me gerust of kijk of er tijden klaarstaan.</p>
<p>Groet,<br>Jos</p>`),
    });
  }
  revalidatePath(`/afspraak/${token}`);
  revalidatePath(eigenaarPad(eigenaar));
  if (eigenaar.soort === "site") revalidatePath("/portal");
  return { ok: true, melding: `${wasBevestigd ? "De afspraak" : "Je aanvraag"} voor ${wanneer} is afgezegd.` };
}
