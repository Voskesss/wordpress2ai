import Link from "next/link";
import { verwant } from "@/lib/seo-paginas";

/** "Lees ook": verwante pagina's in de lopende inhoud, zodat geen enkele
 * onderwerppagina alleen nog aan de footer hangt (SEO-ronde 14-10-2026). */
export default function LeesOok({ pad }: { pad: string }) {
  const lijst = verwant(pad);
  if (lijst.length === 0) return null;
  return (
    <nav aria-label="Lees ook" className="mx-auto max-w-3xl px-6 py-6">
      <h2 className="font-display text-xl font-semibold tracking-tight">Lees ook</h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {lijst.map((p) => (
          <li key={p.pad}>
            <Link href={p.pad} className="block h-full rounded-lg border border-stone-200 bg-white p-4 hover:border-violet-300">
              <span className="font-semibold text-violet-800">{p.naam} →</span>
              <span className="mt-1 block text-sm text-stone-600">{p.zin}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
