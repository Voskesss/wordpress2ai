import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import Beeldmaker from "./Beeldmaker";
import MediaAssets from "./MediaAssets";

export const metadata: Metadata = {
  title: "Beeldmaker",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function Media() {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <Link href="/admin" className="text-sm text-stone-500 hover:text-violet-700">
        ← Alle klanten
      </Link>
      <h1 className="font-display mt-3 text-3xl sm:text-4xl font-semibold tracking-tight">
        Beeldmaker
      </h1>
      <p className="mt-3 text-stone-600 max-w-2xl">
        Maak in een minuut een beeld in de WordSwap-opmaak voor LinkedIn,
        Facebook of een advertentie: foto boven, groene lijn, donkerblauwe band
        met je koppen en het logo. Kies het formaat, zet een foto erin, typ je
        regels en download. Alles gebeurt in je browser, er wordt niets
        opgeslagen op de server.
      </p>
      <div className="mt-8">
        <Beeldmaker />
      </div>

      <h2 className="font-display mt-16 text-2xl font-semibold tracking-tight">
        Logo
      </h2>
      <p className="mt-2 text-stone-600 max-w-2xl text-sm">
        Het huidige logo als SVG (oneindig schaalbaar) of grote PNG met
        transparante achtergrond, in donker en wit.
      </p>
      <div className="mt-5">
        <MediaAssets />
      </div>
    </div>
  );
}
