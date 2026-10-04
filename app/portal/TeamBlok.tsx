import { eq } from "drizzle-orm";
import { db } from "@/db";
import { siteLeden } from "@/db/schema";
import { MAX_GRATIS_LEDEN } from "@/lib/toegang";
import { teamRechten, teamVerwijderen } from "./acties-team";
import InzendingKnop from "./InzendingKnop";
import TeamUitleg from "./TeamUitleg";
import TeamUitnodigen from "./TeamUitnodigen";

/** Eén recht als schakelaar: een klein formulier dat het omzet. */
function Schakel({ siteId, lidId, veld, aan, label }: { siteId: number; lidId: number; veld: string; aan: boolean; label: string }) {
  return (
    <form action={teamRechten} className="inline">
      <input type="hidden" name="siteId" value={siteId} />
      <input type="hidden" name="lidId" value={lidId} />
      <input type="hidden" name="veld" value={veld} />
      <input type="hidden" name="aan" value={aan ? "0" : "1"} />
      <InzendingKnop
        label={`${aan ? "✓" : "✕"} ${label}`}
        bezigLabel="Bezig..."
        className={`rounded-full border px-3 py-1 text-xs font-semibold cursor-pointer ${
          aan ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-stone-300 bg-white text-stone-500"
        }`}
      />
    </form>
  );
}

/** Team van de site, voor de eigenaar: wie er toegang heeft, wat ze mogen,
 * en iemand toevoegen. Tot MAX_GRATIS_LEDEN teamleden zijn gratis. */
export default async function TeamBlok({ siteId }: { siteId: number }) {
  const leden = await db.select().from(siteLeden).where(eq(siteLeden.siteId, siteId)).orderBy(siteLeden.id).catch(() => []);
  const vol = leden.length >= MAX_GRATIS_LEDEN;
  return (
    <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-5 sm:p-6" aria-labelledby="team-kop">
      <h2 id="team-kop" className="font-display text-xl font-semibold">👥 Team</h2>
      <p className="mt-1 text-sm text-stone-600">
        Laat anderen meewerken aan je website, elk met een eigen inlog. Tot {MAX_GRATIS_LEDEN} teamleden zijn gratis.
        Klik op een recht om het aan of uit te zetten.
      </p>
      {leden.length > 0 && (
        <ul className="mt-4 divide-y divide-stone-100 rounded-2xl border border-stone-200">
          {leden.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-stone-900">{l.naam}</p>
                <p className="text-xs text-stone-500 [overflow-wrap:anywhere]">{l.email}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Schakel siteId={siteId} lidId={l.id} veld="magPubliceren" aan={l.magPubliceren} label="Zelf publiceren" />
                <Schakel siteId={siteId} lidId={l.id} veld="magBerichten" aan={l.magBerichten} label="Berichten zien" />
                <form action={teamVerwijderen} className="inline">
                  <input type="hidden" name="siteId" value={siteId} />
                  <input type="hidden" name="lidId" value={l.id} />
                  <InzendingKnop
                    label="Verwijderen"
                    bezigLabel="Bezig..."
                    bevestig={`${l.naam} uit het team halen? Die kan dan niet meer inloggen op deze website.`}
                    className="px-2 py-1 text-xs font-semibold text-stone-400 hover:text-red-600 cursor-pointer"
                  />
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
      {vol ? (
        <p className="mt-4 text-sm text-stone-600">
          Je team is vol ({MAX_GRATIS_LEDEN} van {MAX_GRATIS_LEDEN}). Wil je er meer? Laat het ons weten via Hulp &amp; support.
        </p>
      ) : (
        <TeamUitnodigen siteId={siteId} vol={vol} />
      )}
      <TeamUitleg />
    </section>
  );
}
