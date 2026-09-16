import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { formatWanneer } from "@/lib/webinar";
import { bouwReeksMail, REEKS } from "@/lib/webinar-reeks";
import { HOEKEN, vindHoek } from "@/lib/hoeken";
import { voorbeeldWebinar } from "../../../acties-webinar-reeks";

export const metadata: Metadata = { title: "Voorbeeld webinarmail", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ReeksVoorbeeld({
  params,
  searchParams,
}: {
  params: Promise<{ soort: string }>;
  searchParams: Promise<{ hoek?: string }>;
}) {
  await requireAdmin();
  const { soort } = await params;
  const item = REEKS.find((r) => r.soort === soort);
  if (!item) notFound();
  // Voorbeeld bekijken zoals een aanmelder via een bepaalde advertentie-hoek hem krijgt
  const hoek = vindHoek((await searchParams).hoek);
  const w = await voorbeeldWebinar();
  const mail = bouwReeksMail(item.soort, {
    voornaam: "Roelie",
    webinar: w,
    afmeldUrl: "https://wordswap.nl/webinar/afmelden?voorbeeld=1",
    hoek,
  });
  const index = REEKS.findIndex((r) => r.soort === soort);
  const vorige = REEKS[index - 1];
  const volgende = REEKS[index + 1];
  const metHoek = (pad: string) => (hoek ? `${pad}?hoek=${hoek.sleutel}` : pad);

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
      <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm">
        <p className="font-semibold text-stone-800">🎯 Bekijk als aanmelder via advertentie-hoek</p>
        <p className="mt-1 text-xs text-stone-500">
          De eerste voorbereidingsmail (en de bevestigingsmail) krijgt dan een eigen zin voor die hoek.
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Link
            href={`/admin/webinars/reeks/${item.soort}`}
            className={`rounded-full border px-2.5 py-0.5 text-xs ${!hoek ? "border-violet-600 bg-violet-50 text-violet-800" : "border-stone-300 text-stone-600 hover:border-violet-400"}`}
          >
            Zonder hoek
          </Link>
          {Object.entries(HOEKEN).map(([sleutel, h]) => (
            <Link
              key={sleutel}
              href={`/admin/webinars/reeks/${item.soort}?hoek=${sleutel}`}
              className={`rounded-full border px-2.5 py-0.5 text-xs ${hoek?.sleutel === sleutel ? "border-violet-600 bg-violet-50 text-violet-800" : "border-stone-300 text-stone-600 hover:border-violet-400"}`}
            >
              {h.naam}
            </Link>
          ))}
        </div>
      </div>
      <div className="mt-6 overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <p className="border-b border-stone-200 bg-stone-50 px-5 py-3 text-sm">
          <span className="text-stone-500">Onderwerp:</span> <strong>{mail.onderwerp}</strong>
        </p>
        <div className="px-5 py-4 leading-relaxed text-stone-800" dangerouslySetInnerHTML={{ __html: mail.html }} />
      </div>
      <div className="mt-6 flex justify-between text-sm">
        {vorige ? (
          <Link href={metHoek(`/admin/webinars/reeks/${vorige.soort}`)} className="text-violet-700 hover:underline">
            ← {vorige.naam}
          </Link>
        ) : (
          <span />
        )}
        {volgende && (
          <Link href={metHoek(`/admin/webinars/reeks/${volgende.soort}`)} className="text-violet-700 hover:underline">
            {volgende.naam} →
          </Link>
        )}
      </div>
    </div>
  );
}
