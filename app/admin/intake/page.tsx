import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import IntakeCheck from "./IntakeCheck";

export const metadata: Metadata = {
  title: "Intake-check",
  robots: { index: false, follow: false },
};

/** Live check tijdens een klantgesprek: domein, DNS en mail van de prospect,
 * met kort AI-advies volgens de vaste beslisboom. */
export default async function IntakePagina() {
  await requireAdmin();
  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">🧭 Intake-check</h1>
          <p className="mt-1 text-sm text-stone-500">
            Vul het domein van de prospect in tijdens het gesprek — je ziet meteen waar
            domein, DNS en mail staan, plus het advies dat daarbij hoort.
          </p>
        </div>
        <Link href="/admin" className="text-sm font-semibold text-violet-700 hover:underline">
          ← Admin
        </Link>
      </div>
      <IntakeCheck />
    </main>
  );
}
