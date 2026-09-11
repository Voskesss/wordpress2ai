import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import LeadVak from "./LeadVak";

export const metadata: Metadata = {
  title: "Leads",
  robots: { index: false, follow: false },
};

export default async function Leads() {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/admin" className="text-sm text-stone-500 hover:text-violet-700">
        ← Alle klanten
      </Link>
      <h1 className="font-display mt-3 text-4xl font-semibold tracking-tight">🎯 Leads</h1>
      <p className="mt-3 text-stone-600 leading-relaxed max-w-2xl">
        Voor mensen die <strong>zelf</strong> een websitecheck aanvroegen (via de
        advertentie). Typ naam, e-mail en website over uit het{" "}
        <a
          href="https://business.facebook.com/latest/leads_center"
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-violet-700 hover:underline"
        >
          Leadcentrum ↗
        </a>
        , check de site, en de opvolgmail staat klaar. Eerst bellen werkt het
        best — de mail is het vangnet.
      </p>
      <LeadVak />
    </div>
  );
}
