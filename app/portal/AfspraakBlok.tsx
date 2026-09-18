import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sites } from "@/db/schema";
import { duurInWoorden, momentInWoorden, vrijeMomenten } from "@/lib/afspraken";
import { afspraakStand, bezetteTijden } from "@/lib/afspraken-db";

/**
 * "Even met Jos overleggen": alleen zichtbaar als Jos voor deze klant tijden
 * heeft klaargezet of er een afspraak loopt. Staat er niets, dan staat hier ook
 * niets — geen loos blokje in het portaal.
 */
export default async function AfspraakBlok({ siteId }: { siteId: number }) {
  const { blokken, afspraken: rijen, token } = await afspraakStand(siteId);
  const bevestigd = rijen.find((a) => a.status === "bevestigd");
  const aangevraagd = rijen.find((a) => a.status === "aangevraagd");
  const dagen = bevestigd || aangevraagd ? [] : vrijeMomenten(blokken, await bezetteTijden(), new Date());
  if (!bevestigd && !aangevraagd && dagen.length === 0) return null;

  const [site] = await db.select({ token: sites.afspraakToken }).from(sites).where(eq(sites.id, siteId));
  const link = site?.token ?? token;

  return (
    <div id="afspraak" className="mt-4 scroll-mt-24 rounded-2xl border border-stone-200 bg-white p-5">
      <h3 className="font-display text-lg font-semibold">📅 Even samen kijken</h3>
      {bevestigd ? (
        <p className="mt-1 text-sm leading-relaxed text-stone-700">
          Je afspraak met Jos staat: <strong>{momentInWoorden(bevestigd.start, bevestigd.duurMinuten)}</strong>. Hij
          belt je. Komt het toch niet uit, mail hem gerust op{" "}
          <a href="mailto:info@wordswap.nl" className="font-semibold text-violet-700 hover:underline">
            info@wordswap.nl
          </a>
          .
        </p>
      ) : aangevraagd ? (
        <p className="mt-1 text-sm leading-relaxed text-stone-700">
          Je voorkeur voor <strong>{momentInWoorden(aangevraagd.start, aangevraagd.duurMinuten)}</strong> is
          doorgegeven. Jos bevestigt hem zo snel mogelijk.
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm leading-relaxed text-stone-600">
            Jos heeft tijd vrijgehouden om je website samen door te lopen: een gesprek van{" "}
            {duurInWoorden(dagen[0].duurMinuten)}. Kies een moment dat jou uitkomt.
          </p>
          {link && (
            <Link
              href={`/afspraak/${link}`}
              className="mt-3 inline-flex rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
            >
              Kies een moment
            </Link>
          )}
        </>
      )}
    </div>
  );
}
