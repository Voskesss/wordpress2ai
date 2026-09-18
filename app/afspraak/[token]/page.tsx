import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { db } from "@/db";
import { sites } from "@/db/schema";
import { duurInWoorden, momentInWoorden, vrijeMomenten } from "@/lib/afspraken";
import { afspraakStand, bezetteTijden } from "@/lib/afspraken-db";
import Kiezer, { type Dag } from "./Kiezer";

// Planlinks horen niet in Google
export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AfspraakPagina({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [site] = token && token.length >= 20 ? await db.select().from(sites).where(eq(sites.afspraakToken, token)) : [];

  // Ingelogde klant? Dan nemen we naam en e-mail gewoon over uit zijn account.
  const gebruiker = site ? await currentUser().catch(() => null) : null;
  const isKlant = Boolean(gebruiker && site && gebruiker.id === site.clerkUserId);
  const ingelogdAls = isKlant
    ? {
        naam: [gebruiker!.firstName, gebruiker!.lastName].filter(Boolean).join(" ") || site!.naam,
        email: gebruiker!.emailAddresses?.[0]?.emailAddress ?? "",
      }
    : null;

  const stand = site ? await afspraakStand(site.id) : null;
  // Alleen afspraken die nog moeten komen tellen mee; wat geweest is, is geweest.
  const nu = new Date();
  const komend = (stand?.afspraken ?? []).filter((a) => a.start.getTime() > nu.getTime());
  const bevestigd = komend.find((a) => a.status === "bevestigd");
  const aangevraagd = komend.find((a) => a.status === "aangevraagd");
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

  return (
    <main className="mx-auto max-w-2xl px-6 py-14">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Een moment afspreken met Jos</h1>
      {!site ? (
        <p className="mt-4 text-stone-600">
          Deze link werkt niet (meer). Vraag Jos gerust om een nieuwe, of mail{" "}
          <a href="mailto:info@wordswap.nl" className="font-semibold text-violet-700 hover:underline">
            info@wordswap.nl
          </a>
          .
        </p>
      ) : aangevraagd ? (
        <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-stone-800">
          Je voorkeur voor <strong>{momentInWoorden(aangevraagd.start, aangevraagd.duurMinuten)}</strong> is
          doorgegeven. Jos bevestigt hem zo snel mogelijk; je krijgt dan een mailtje met een agendabestand.
        </p>
      ) : dagen.length === 0 ? (
        bevestigd ? (
          <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-stone-800">
            Er staat al een afspraak: <strong>{momentInWoorden(bevestigd.start, bevestigd.duurMinuten)}</strong>. Komt
            het toch niet uit? Mail Jos even, dan zoeken we een ander moment.
          </p>
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
            Voor <strong>{site.naam}</strong>. Kies een moment dat jou uitkomt; Jos belt je dan.
          </p>
          {bevestigd && (
            <p className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-stone-800">
              Goed om te weten: er staat al een afspraak op{" "}
              <strong>{momentInWoorden(bevestigd.start, bevestigd.duurMinuten)}</strong>. Hieronder kies je een nieuw,
              extra moment.
            </p>
          )}
          <div className="mt-6">
            <Kiezer token={token} dagen={dagen} ingelogdAls={ingelogdAls} />
          </div>
        </>
      )}
    </main>
  );
}
