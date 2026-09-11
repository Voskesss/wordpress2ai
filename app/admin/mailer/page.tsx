import type { Metadata } from "next";
import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { verzondenMails } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import MailerVak from "./MailerVak";

export const metadata: Metadata = {
  title: "Mailer",
  robots: { index: false, follow: false },
};

export default async function Mailer({
  searchParams,
}: {
  searchParams: Promise<{ aan?: string; onderwerp?: string; tekst?: string; demo?: string }>;
}) {
  await requireAdmin();
  const p = await searchParams;
  const verzonden = await db
    .select()
    .from(verzondenMails)
    .orderBy(desc(verzondenMails.verzonden))
    .limit(30)
    .catch(() => []);

  // Bezorgstatus per mail live bij Resend opvragen (best effort)
  const STATUS: Record<string, { tekst: string; kleur: string }> = {
    delivered: { tekst: "✓ afgeleverd", kleur: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    opened: { tekst: "✓ geopend", kleur: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    clicked: { tekst: "✓ link aangeklikt", kleur: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    bounced: { tekst: "✗ gebounced — adres klopt niet", kleur: "bg-red-50 text-red-700 border-red-200" },
    complained: { tekst: "⚠ als spam gemarkeerd", kleur: "bg-amber-50 text-amber-700 border-amber-200" },
    delivery_delayed: { tekst: "⏳ vertraagd", kleur: "bg-amber-50 text-amber-700 border-amber-200" },
    sent: { tekst: "⏳ onderweg", kleur: "bg-stone-100 text-stone-600 border-stone-200" },
  };
  const statussen = new Map<number, { tekst: string; kleur: string }>();
  const key = process.env.RESEND_API_KEY;
  if (key) {
    await Promise.all(
      verzonden
        .filter((m) => m.resendId)
        .map(async (m) => {
          try {
            const r = await fetch(`https://api.resend.com/emails/${m.resendId}`, {
              headers: { Authorization: `Bearer ${key}` },
              cache: "no-store",
            });
            if (!r.ok) return;
            const d = (await r.json()) as { last_event?: string };
            const s = d.last_event && STATUS[d.last_event];
            if (s) statussen.set(m.id, s);
          } catch {}
        })
    );
  }
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/admin" className="text-sm text-stone-500 hover:text-violet-700">
        ← Alle klanten
      </Link>
      <h1 className="font-display mt-3 text-4xl font-semibold tracking-tight">✉️ Mailer</h1>
      <p className="mt-3 text-stone-600 leading-relaxed max-w-2xl">
        Verstuur een losse mail vanuit <strong>jos@wordswap.nl</strong> — voor
        reacties op prospects, klanten of wat dan ook. De handtekening komt er
        automatisch onder, links die je typt worden klikbaar, en met de
        AI-aanwijzing schaaf je de tekst bij tot hij goed voelt. Antwoorden
        komen via de doorsturing gewoon in je eigen inbox.
      </p>
      <MailerVak
        beginAan={p.aan ?? ""}
        beginOnderwerp={p.onderwerp ?? ""}
        beginTekst={p.tekst ?? ""}
        beginDemo={p.demo !== "0"}
      />

      <h2 className="font-display mt-14 text-2xl font-semibold">📬 Verzonden</h2>
      <p className="mt-1 text-sm text-stone-500">
        De laatste {verzonden.length ? verzonden.length : ""} mails uit deze
        Mailer — klik open om de volledige tekst terug te lezen. Je krijgt van
        elke mail ook een kopie in je eigen inbox (BCC via jos@wordswap.nl).
      </p>
      {verzonden.length === 0 ? (
        <p className="mt-4 text-sm text-stone-500">
          Nog niets vastgelegd — mails van vóór vandaag staan hier niet in.
        </p>
      ) : (
        <div className="mt-4 space-y-2">
          {verzonden.map((m) => (
            <details
              key={m.id}
              className="rounded-2xl border border-stone-200 bg-white px-4 py-3"
            >
              <summary className="cursor-pointer text-sm">
                <span className="font-semibold">{m.aan}</span>
                <span className="text-stone-500"> — {m.onderwerp}</span>
                <span className="ml-2 text-xs text-stone-400">
                  {m.verzonden.toLocaleString("nl-NL", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                {statussen.has(m.id) && (
                  <span
                    className={`ml-2 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statussen.get(m.id)!.kleur}`}
                  >
                    {statussen.get(m.id)!.tekst}
                  </span>
                )}
              </summary>
              <pre className="mt-3 whitespace-pre-wrap border-t border-stone-100 pt-3 font-sans text-sm text-stone-700">
                {m.tekst}
              </pre>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
