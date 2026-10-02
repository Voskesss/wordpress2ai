import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MAIL_VIDEOS, isMailVideo } from "@/lib/mail-video";

/**
 * Landingsplek voor de filmpjes uit de mails ([video:naam], lib/mail-video).
 * Een mail kan geen video afspelen; de klik op het beeld komt hier uit, en
 * het filmpje speelt meteen. Geen geluid in de filmpjes, dus automatisch
 * afspelen mag. Niet in Google: het is een bestemming, geen pagina.
 */

export const dynamicParams = false;
export const generateStaticParams = () => Object.keys(MAIL_VIDEOS).map((naam) => ({ naam }));

export async function generateMetadata({ params }: { params: Promise<{ naam: string }> }): Promise<Metadata> {
  const { naam } = await params;
  if (!isMailVideo(naam)) return {};
  return { title: MAIL_VIDEOS[naam].titel, robots: { index: false, follow: true } };
}

export default async function VideoPagina({ params }: { params: Promise<{ naam: string }> }) {
  const { naam } = await params;
  if (!isMailVideo(naam)) notFound();
  const v = MAIL_VIDEOS[naam];
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
      <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-[#172E3B]">{v.titel}</h1>
      <p className="mt-3 text-stone-600 leading-relaxed">{v.uitleg}</p>
      <video
        src={v.bestand}
        poster={v.beeld}
        autoPlay
        muted
        loop
        playsInline
        controls
        preload="auto"
        aria-label={v.titel}
        className="mt-6 aspect-square w-full rounded-2xl bg-[#172E3B] shadow-lg"
      />
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/contact"
          className="rounded-full bg-[#245747] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1c4537]"
        >
          Kan dit ook voor mijn website?
        </Link>
        <Link
          href="/demo"
          className="rounded-full border border-stone-300 px-6 py-3 text-sm font-semibold text-stone-700 hover:border-[#245747] hover:text-[#245747]"
        >
          Probeer het zelf in de demo
        </Link>
      </div>
    </div>
  );
}
