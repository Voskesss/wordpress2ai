import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import MediaAssets from "./MediaAssets";

export const metadata: Metadata = {
  title: "Merkmateriaal",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function Media() {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <Link href="/admin" className="text-sm text-stone-500 hover:text-violet-700">
        ← Alle klanten
      </Link>
      <h1 className="font-display mt-3 text-3xl sm:text-4xl font-semibold tracking-tight">
        Merkmateriaal
      </h1>
      <p className="mt-3 text-stone-600 max-w-2xl">
        Het WordSwap-logo in alle varianten. SVG is oneindig schaalbaar (voor
        video-editors die dat aankunnen); PNG-groot is 1024px+ met transparante
        achtergrond. De video-kaarten zijn kant-en-klare 9:16-beelden
        (1080×1920) voor verticale video.
      </p>
      <div className="mt-8">
        <MediaAssets />
      </div>
    </div>
  );
}
