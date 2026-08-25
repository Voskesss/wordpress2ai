import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { nieuweSite } from "../acties";

export const metadata: Metadata = {
  title: "Nieuwe klant",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const invoerStijl =
  "mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 font-normal text-sm focus:border-violet-600 focus:outline-none";

export default async function NieuweKlant() {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/admin" className="text-sm text-stone-500 hover:text-violet-700">
        ← Alle klanten
      </Link>
      <h1 className="font-display mt-3 text-3xl sm:text-4xl font-semibold tracking-tight">
        Nieuwe klant
      </h1>
      <p className="mt-3 text-stone-600">
        Komt de klant via een migratie? Gebruik dan{" "}
        <Link href="/admin/migraties" className="text-violet-700 underline">
          Migraties
        </Link>{" "}
        — die maakt de site en de omgeving automatisch aan. Dit formulier is
        voor het handmatig toevoegen van een bestaande omgeving.
      </p>
      <form
        action={nieuweSite}
        className="mt-6 rounded-3xl border border-stone-200 bg-white p-6 space-y-4"
      >
        <label className="block text-sm font-semibold">
          Naam
          <input name="naam" required placeholder="Bakkerij Jansen" className={invoerStijl} />
        </label>
        <label className="block text-sm font-semibold">
          Repo (bestaande naam binnen de organisatie)
          <input name="githubRepo" required placeholder="bakkerij-jansen" className={invoerStijl} />
        </label>
        <label className="block text-sm font-semibold">
          Domein (optioneel)
          <input name="domein" placeholder="bakkerijjansen.nl" className={invoerStijl} />
        </label>
        <button
          type="submit"
          className="rounded-full bg-violet-700 px-6 py-2.5 text-white font-semibold hover:bg-violet-600 cursor-pointer"
        >
          Aanmaken
        </button>
      </form>
    </div>
  );
}
