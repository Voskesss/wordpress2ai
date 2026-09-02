import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import MailerVak from "./MailerVak";

export const metadata: Metadata = {
  title: "Mailer",
  robots: { index: false, follow: false },
};

export default async function Mailer() {
  await requireAdmin();
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
      <MailerVak />
    </div>
  );
}
