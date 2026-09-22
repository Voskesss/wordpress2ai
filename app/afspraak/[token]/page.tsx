import { currentUser } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { duurInWoorden, momentInWoorden, vrijeMomenten } from "@/lib/afspraken";
import { afspraakStand, bezetteTijden, eigenaarViaToken } from "@/lib/afspraken-db";
import { contactZin } from "@/lib/klant-mails";
import AfzegKnop from "./AfzegKnop";
import Kiezer, { type Dag } from "./Kiezer";

// Planlinks horen niet in Google
export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AfspraakPagina({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  // De code hoort bij een klant (site) of bij een potentiële klant (lead)
  const wie = await eigenaarViaToken(token);

  // Ingelogde klant? Dan nemen we naam en e-mail gewoon over uit zijn account.
  const gebruiker = wie?.clerkUserId ? await currentUser().catch(() => null) : null;
  const isKlant = Boolean(gebruiker && wie?.clerkUserId && gebruiker.id === wie.clerkUserId);
  const ingelogdAls = isKlant
    ? {
        naam: [gebruiker!.firstName, gebruiker!.lastName].filter(Boolean).join(" ") || wie!.naam,
        email: gebruiker!.emailAddresses?.[0]?.emailAddress ?? "",
      }
    : null;

  const stand = wie ? await afspraakStand(wie.eigenaar) : null;
  const nu = new Date();
  // "Komend" = het gesprek is nog niet afgelopen; daarna verdwijnt hij vanzelf
  const komend = (stand?.afspraken ?? []).filter(
    (a) => a.start.getTime() + a.duurMinuten * 60_000 > nu.getTime(),
  );
  // Álle komende afspraken en aanvragen tonen, niet alleen de eerste
  const bevestigde = komend.filter((a) => a.status === "bevestigd");
  const aanvragen = komend.filter((a) => a.status === "aangevraagd");
  const dagen: Dag[] = stand
    ? vrijeMomenten(stand.blokken, await bezetteTijden(), nu).map((d) => ({
        datum: d.datum,
        datumTekst: new Date(`${d.datum}T12:00:00`).toLocaleDateString("nl-NL", {
          weekday: "long",
          day: "numeric",
          month: "long",
        }),
        duurTekst: duurInWoorden(d.duurMinuten),
        tijden: d.tijden.map((t) => ({ tijd: t.tijd, iso: t.start.toISOString() })),
      }))
    : [];

  const afspraakLijst = bevestigde.length > 0 && (
    <div className="mt-4 space-y-3">
      {bevestigde.map((a) => (
        <div key={a.id} className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-stone-800">
          ✓ Afgesproken: <strong>{momentInWoorden(a.start, a.duurMinuten)}</strong>. {contactZin(a.contact ?? a.telefoon)}{" "}
          Komt het toch niet uit? Zeg hem hieronder af.
          <AfzegKnop token={token} afspraakId={a.id} />
        </div>
      ))}
    </div>
  );

  return (
    <main className="mx-auto max-w-2xl px-6 py-14">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Een moment afspreken met Jos</h1>
      {!wie ? (
        <p className="mt-4 text-stone-600">
          Deze link werkt niet (meer). Vraag Jos gerust om een nieuwe, of mail{" "}
          <a href="mailto:info@wordswap.nl" className="font-semibold text-violet-700 hover:underline">
            info@wordswap.nl
          </a>
          .
        </p>
      ) : aanvragen.length > 0 ? (
        <>
          {aanvragen.map((a) => (
            <div key={a.id} className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-stone-800">
              Je voorkeur voor <strong>{momentInWoorden(a.start, a.duurMinuten)}</strong> is doorgegeven. Jos bevestigt
              hem zo snel mogelijk; je krijgt dan een mailtje met een agendabestand.
              <AfzegKnop token={token} afspraakId={a.id} label="Aanvraag intrekken" />
            </div>
          ))}
          {afspraakLijst}
        </>
      ) : dagen.length === 0 ? (
        bevestigde.length > 0 ? (
          afspraakLijst
        ) : (
          <p className="mt-4 text-stone-600">
            Er staan op dit moment geen tijden klaar. Jos zet ze binnenkort neer, of mail hem gerust op{" "}
            <a href="mailto:info@wordswap.nl" className="font-semibold text-violet-700 hover:underline">
              info@wordswap.nl
            </a>
            .
          </p>
        )
      ) : (
        <>
          <p className="mt-3 text-stone-600">
            {wie.eigenaar.soort === "site" ? (
              <>
                Voor <strong>{wie.naam}</strong>. Kies een moment dat jou uitkomt; Jos belt je dan.
              </>
            ) : (
              <>Kies een moment dat jou uitkomt. Jos laat je daarna weten of hij belt of een videogesprek stuurt.</>
            )}
          </p>
          {afspraakLijst}
          <div className="mt-6">
            <Kiezer token={token} dagen={dagen} ingelogdAls={ingelogdAls} />
          </div>
        </>
      )}
    </main>
  );
}
