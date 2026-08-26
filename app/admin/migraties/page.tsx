import type { Metadata } from "next";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { bouwJobs } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import MigratieImport from "./MigratieImport";
import BouwWachtrij from "./BouwWachtrij";

export const metadata: Metadata = {
  title: "Migraties",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function Migraties() {
  await requireAdmin();
  const jobs = await db
    .select()
    .from(bouwJobs)
    .orderBy(desc(bouwJobs.id))
    .then((r) => r.slice(0, 8));

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="font-display text-4xl font-semibold tracking-tight">
        Migraties
      </h1>
      <p className="mt-3 text-stone-600 max-w-2xl">
        Migraties draaien we via Claude Code (zie het stappenplan hieronder).
        De uploadknop onderaan is de oude API-pijplijn — duurder en minder
        precies; alleen gebruiken als terugvaloptie.
      </p>

      {/* De actuele flow: bouwen via Claude Code */}
      <div className="mt-8 rounded-3xl border-2 border-violet-600 bg-violet-50/40 p-7">
        <h2 className="font-display text-xl font-semibold">
          Zo migreer je een klant (via Claude Code)
        </h2>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm text-stone-700 leading-relaxed">
          <li>
            <strong>Export ophalen:</strong> laat de klant in WordPress naar
            Extra → Exporteren → Alle content gaan en het bestand downloaden.
            Zet de XML ergens neer, bijv. in{" "}
            <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">~/Downloads</code>.
          </li>
          <li>
            <strong>Terminal openen en naar de projectmap:</strong>{" "}
            <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">cd ~/wordpress2ai</code>
          </li>
          <li>
            <strong>Check de GitHub-verbinding</strong> (moet ingelogd zijn als{" "}
            <span className="font-mono">Voskesss</span>, met toegang tot de org{" "}
            <span className="font-mono">wordpress2ai</span>):{" "}
            <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">gh auth status</code>
            <br />
            Staat daar een ander account of een fout? Dan eenmalig:{" "}
            <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">gh auth login</code>{" "}
            (kies GitHub.com → HTTPS → browser) en log in als Voskesss.
          </li>
          <li>
            <strong>Start Claude Code in die map:</strong>{" "}
            <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">claude</code>
            <br />
            Het maakt niet uit of het een nieuwe of bestaande chat is — de
            migratie-kennis (skill <span className="font-mono">/migreer-klant</span>{" "}
            + leerpunten) zit in de projectmap en laadt automatisch.
          </li>
          <li>
            <strong>Typ je opdracht</strong>, bijvoorbeeld:{" "}
            <em>
              &ldquo;migreer klant Bakkerij Pietersen, xml staat in
              ~/Downloads/bakkerij.xml, repo bakkerij-pietersen — laat de
              blogpagina weg&rdquo;
            </em>
            . Claude doet de rest: voorwerk-script, bouwen met alle regels,
            screenshots ter controle, en registreren zodat de klant hier in de
            admin verschijnt.
          </li>
          <li>
            <strong>Afronden doe je hier:</strong> klantaccount koppelen op de
            klantpagina, richtlijnen invullen, en domein + e-mail volgens de{" "}
            <a href="/admin/handleiding" className="font-semibold text-violet-700 underline">
              handleiding
            </a>{" "}
            (eerst MX-records checken!).
          </li>
        </ol>
        <p className="mt-4 text-xs text-stone-500">
          Waarom zo: bouwen in Claude Code valt onder het abonnement (de
          API-pijplijn rekent per token af) en elke geleerde les wordt
          vastgelegd in LEERPUNTEN.md zodat de volgende migratie beter gaat.
        </p>
      </div>

      <BouwWachtrij
        start={jobs.map((j) => ({
          id: j.id,
          status: j.status,
          voortgang: j.voortgang,
          siteNaam: j.siteNaam,
        }))}
      />

      <div className="mt-8">
        <MigratieImport />
      </div>
    </div>
  );
}
