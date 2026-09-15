import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { formatWanneer } from "@/lib/webinar";
import { bouwReeksMail, REEKS } from "@/lib/webinar-reeks";
import { voorbeeldWebinar } from "../../../acties-webinar-reeks";

export const metadata: Metadata = { title: "Voorbeeld webinarmail", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ReeksVoorbeeld({ params }: { params: Promise<{ soort: string }> }) {
  await requireAdmin();
  const { soort } = await params;
  const item = REEKS.find((r) => r.soort === soort);
  if (!item) notFound();
  const w = await voorbeeldWebinar();
  const mail = bouwReeksMail(item.soort, { voornaam: "Roelie", webinar: w, afmeldUrl: "https://wordswap.nl/webinar/afmelden?voorbeeld=1" });
  const index = REEKS.findIndex((r) => r.soort === soort);
  const vorige = REEKS[index - 1];
  const volgende = REEKS[index + 1];

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/admin/webinars" className="text-sm text-stone-500 hover:text-violet-700">
        ← Webinars
      </Link>
      <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight">{item.naam}</h1>
      <p className="mt-2 text-sm text-stone-600">
        Wordt verstuurd: <strong>{item.moment}</strong>. Voorbeeld met het webinar van {formatWanneer(w.wanneer)}
        {"meetLink" in w && w.meetLink ? "" : " (nog zonder deelnamelink)"}.
      </p>
      <div className="mt-6 overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <p className="border-b border-stone-200 bg-stone-50 px-5 py-3 text-sm">
          <span className="text-stone-500">Onderwerp:</span> <strong>{mail.onderwerp}</strong>
        </p>
        <div className="px-5 py-4 leading-relaxed text-stone-800" dangerouslySetInnerHTML={{ __html: mail.html }} />
      </div>
      <div className="mt-6 flex justify-between text-sm">
        {vorige ? (
          <Link href={`/admin/webinars/reeks/${vorige.soort}`} className="text-violet-700 hover:underline">
            ← {vorige.naam}
          </Link>
        ) : (
          <span />
        )}
        {volgende && (
          <Link href={`/admin/webinars/reeks/${volgende.soort}`} className="text-violet-700 hover:underline">
            {volgende.naam} →
          </Link>
        )}
      </div>
    </div>
  );
}
