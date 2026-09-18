import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sites } from "@/db/schema";
import { duurInWoorden, momentInWoorden, vrijeMomenten } from "@/lib/afspraken";
import { afspraakStand, bezetteTijden } from "@/lib/afspraken-db";
import Kiezer, { type Dag } from "@/app/afspraak/[token]/Kiezer";

/**
 * "Even samen kijken": alleen zichtbaar als Jos voor deze klant tijden heeft
 * klaargezet of er een afspraak loopt. De klant kiest hier rechtstreeks zijn
 * moment; de losse planlink (/afspraak/<code>) blijft daarnaast gewoon werken,
 * bijvoorbeeld vanuit de mail of voor wie geen account heeft.
 */
export default async function AfspraakBlok({ siteId }: { siteId: number }) {
  const { blokken, afspraken: rijen, token } = await afspraakStand(siteId);
  // Alleen komende afspraken tellen; staan er nieuwe dagen klaar, dan gaan die voor
  const nu = new Date();
  const komend = rijen.filter((a) => a.start.getTime() > nu.getTime());
  const bevestigd = komend.find((a) => a.status === "bevestigd");
  const aangevraagd = komend.find((a) => a.status === "aangevraagd");
  const momenten = aangevraagd ? [] : vrijeMomenten(blokken, await bezetteTijden(), nu);
  if (!bevestigd && !aangevraagd && momenten.length === 0) return null;

  // Ingelogd als de eigenaar van deze site? Dan hoeft hij niets in te vullen.
  const [site] = await db
    .select({ clerkUserId: sites.clerkUserId, naam: sites.naam })
    .from(sites)
    .where(eq(sites.id, siteId));
  const gebruiker = await currentUser().catch(() => null);
  const ingelogdAls =
    gebruiker && site && gebruiker.id === site.clerkUserId
      ? {
          naam: [gebruiker.firstName, gebruiker.lastName].filter(Boolean).join(" ") || site.naam,
          email: gebruiker.emailAddresses?.[0]?.emailAddress ?? "",
        }
      : null;

  const dagen: Dag[] = momenten.map((d) => ({
    datum: d.datum,
    datumTekst: new Date(`${d.datum}T12:00:00`).toLocaleDateString("nl-NL", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }),
    duurTekst: duurInWoorden(d.duurMinuten),
    tijden: d.tijden.map((t) => ({ tijd: t.tijd, iso: t.start.toISOString() })),
  }));

  return (
    <div id="afspraak" className="mt-4 scroll-mt-24 rounded-2xl border border-stone-200 bg-white p-5">
      <h3 className="font-display text-lg font-semibold">📅 Even samen kijken</h3>
      {bevestigd && momenten.length === 0 && !aangevraagd ? (
        <p className="mt-1 text-sm leading-relaxed text-stone-700">
          Je afspraak met Jos staat: <strong>{momentInWoorden(bevestigd.start, bevestigd.duurMinuten)}</strong>. Hij
          belt je. Komt het toch niet uit, mail hem gerust op{" "}
          <a href="mailto:info@wordswap.nl" className="font-semibold text-violet-700 hover:underline">
            info@wordswap.nl
          </a>
          .
        </p>
      ) : aangevraagd ? (
        <>
          <p className="mt-1 text-sm leading-relaxed text-stone-700">
            Je voorkeur voor <strong>{momentInWoorden(aangevraagd.start, aangevraagd.duurMinuten)}</strong> is
            doorgegeven. Jos bevestigt hem zo snel mogelijk; je krijgt dan een mailtje met een agendabestand.
          </p>
          {bevestigd && (
            <p className="mt-2 text-sm leading-relaxed text-stone-700">
              Je eerdere afspraak blijft gewoon staan:{" "}
              <strong>{momentInWoorden(bevestigd.start, bevestigd.duurMinuten)}</strong>.
            </p>
          )}
        </>
      ) : (
        <>
          <p className="mt-1 mb-4 text-sm leading-relaxed text-stone-600">
            Jos heeft tijd vrijgehouden om je website samen door te lopen: een gesprek van {dagen[0].duurTekst}. Kies
            een moment dat jou uitkomt; hij belt je dan.
          </p>
          {bevestigd && (
            <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-sm text-stone-800">
              Er staat al een afspraak op <strong>{momentInWoorden(bevestigd.start, bevestigd.duurMinuten)}</strong>;
              hieronder kies je een nieuw, extra moment.
            </p>
          )}
          {token && <Kiezer token={token} dagen={dagen} ingelogdAls={ingelogdAls} />}
        </>
      )}
    </div>
  );
}
