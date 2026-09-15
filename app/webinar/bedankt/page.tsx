import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { webinars } from "@/db/schema";
import { googleAgendaLink, outlookAgendaLink, WEBINAR_DUUR_MIN } from "@/lib/agenda";
import { josFoto, josVideoEmbed } from "@/lib/persoonlijk";
import { formatWanneer } from "@/lib/webinar";

export const metadata: Metadata = {
  title: "Je bent aangemeld voor het webinar",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const knop =
  "flex items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-800 hover:border-emerald-600 hover:text-emerald-800";

export default async function WebinarBedankt({ searchParams }: { searchParams: Promise<{ w?: string }> }) {
  const { w: wParam } = await searchParams;
  const id = Number(wParam);
  const [w] = Number.isInteger(id) ? await db.select().from(webinars).where(eq(webinars.id, id)) : [];
  const foto = josFoto();
  const video = josVideoEmbed();

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <p className="eyebrow">JE PLEK IS GERESERVEERD</p>
      <h1 className="font-display mt-3 text-4xl font-semibold tracking-tight">Top, je bent erbij!</h1>
      {w ? (
        <p className="mt-4 text-lg text-stone-600">
          Het webinar is op <strong>{formatWanneer(w.wanneer)} uur</strong>. Maximaal {WEBINAR_DUUR_MIN} minuten, online.
        </p>
      ) : (
        <p className="mt-4 text-lg text-stone-600">Je aanmelding is binnen. De details staan in je mail.</p>
      )}

      {w && (
        <section className="mt-8 rounded-2xl border border-[#dde7d9] bg-[#f6f9f2] p-6">
          <h2 className="font-display text-xl font-semibold">📅 Zet het meteen in je agenda</h2>
          <p className="mt-1 text-sm text-stone-600">Dan vergeet je het niet. Eén klik is genoeg.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <a href={googleAgendaLink(w)} target="_blank" rel="noreferrer" className={knop}>
              Google Agenda
            </a>
            <a href={outlookAgendaLink(w)} target="_blank" rel="noreferrer" className={knop}>
              Outlook
            </a>
            <a href={`/webinar/agenda/${w.id}`} className={knop}>
              Apple / overig
            </a>
          </div>
          <p className="mt-3 text-xs text-stone-500">Je krijgt ook een bevestiging per mail, met het agendabestand als bijlage.</p>
        </section>
      )}

      {video && (
        <section className="mt-8">
          <h2 className="font-display text-xl font-semibold">Alvast even kennismaken</h2>
          <div className="mt-3 aspect-video overflow-hidden rounded-2xl border border-stone-200 bg-stone-100">
            <iframe
              src={video}
              title="Korte video van Jos"
              className="h-full w-full"
              allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </section>
      )}

      <section className="mt-8 rounded-2xl border border-stone-200 bg-white p-6">
        <div className="flex items-start gap-4">
          {foto && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={foto} alt="Jos Klijnhout" width={64} height={64} className="h-16 w-16 shrink-0 rounded-full object-cover" />
          )}
          <div className="text-stone-700 leading-relaxed">
            <p>
              Fijn dat je erbij bent. Ik ben Jos, en ik ga je in dat half uur geen techniek uitleggen. Ik laat je zien wat er
              tegenwoordig kan met je website, waarom dat juist nu speelt, en wanneer het bij jou past. En wanneer niet.
            </p>
            <p className="mt-3">
              Je hoeft niets voor te bereiden, en alleen luisteren is prima. Wil je er het meeste uithalen? Denk dan alvast
              even na over één vraag: <strong>wat staat er nu op je website dat al het langst niet klopt?</strong>
            </p>
          </div>
        </div>
      </section>

      <p className="mt-8 text-sm text-stone-500">
        Kun je er toch niet bij zijn? Antwoord dan even op de bevestigingsmail. Intussen al benieuwd?{" "}
        <Link href="/demo" className="text-emerald-800 underline underline-offset-2">
          Bekijk de demo
        </Link>
        .
      </p>
    </div>
  );
}
