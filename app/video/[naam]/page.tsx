import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MAIL_VIDEOS, isMailVideo, staandVan } from "@/lib/mail-video";

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
  const staand = staandVan(naam);
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
      <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-[#172E3B]">{v.titel}</h1>
      <p className="mt-3 text-stone-600 leading-relaxed">{v.uitleg}</p>
      {/* Telefoon: de staande versie als die er is, anders vierkant. De
          browser kiest via media op de bron, dus er laadt maar één bestand. */}
      <video
        poster={staand ? undefined : v.beeld}
        autoPlay
        muted
        loop
        playsInline
        controls
        preload="auto"
        aria-label={v.titel}
        className={`mt-6 w-full rounded-2xl bg-[#172E3B] shadow-lg ${staand ? "max-h-[78dvh] object-contain sm:aspect-square sm:max-h-none" : "aspect-square"}`}
      >
        {staand && <source src={staand} type="video/mp4" media="(max-width: 640px)" />}
        <source src={v.bestand} type="video/mp4" />
      </video>
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
