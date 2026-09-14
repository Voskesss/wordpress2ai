import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Webinar-script",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/** Inline-opmaak: **vet**, *cursief* en `code` binnen één regel. */
function inline(tekst: string, sleutel: number): ReactNode {
  const delen = tekst.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return (
    <span key={sleutel}>
      {delen.map((d, i) => {
        if (d.startsWith("**")) return <strong key={i}>{d.slice(2, -2)}</strong>;
        if (d.startsWith("`")) return <code key={i} className="rounded bg-stone-100 px-1 text-[0.9em]">{d.slice(1, -1)}</code>;
        if (d.startsWith("*")) return <em key={i}>{d.slice(1, -1)}</em>;
        return d;
      })}
    </span>
  );
}

/**
 * Minimale markdown-weergave voor docs/webinar-opzet.md: koppen, citaten
 * (de spreekteksten), lijsten en scheidingslijnen. Geen externe library.
 */
function renderMarkdown(md: string): ReactNode[] {
  const regels = md.split("\n");
  const uit: ReactNode[] = [];
  let citaat: string[] = [];
  let lijst: string[] = [];

  const sluitCitaat = (k: number) => {
    if (citaat.length === 0) return;
    uit.push(
      <blockquote
        key={`q${k}`}
        className="my-5 rounded-r-2xl border-l-4 border-violet-400 bg-violet-50/60 px-5 py-4 text-lg leading-relaxed text-stone-800"
      >
        {citaat.map((r, i) =>
          r === "" ? <div key={i} className="h-4" /> : <p key={i}>{inline(r, i)}</p>
        )}
      </blockquote>
    );
    citaat = [];
  };
  const sluitLijst = (k: number) => {
    if (lijst.length === 0) return;
    uit.push(
      <ul key={`l${k}`} className="my-4 list-disc space-y-1.5 pl-6 text-stone-700">
        {lijst.map((r, i) => (
          <li key={i}>{inline(r, i)}</li>
        ))}
      </ul>
    );
    lijst = [];
  };

  regels.forEach((regel, k) => {
    if (regel.startsWith(">")) {
      sluitLijst(k);
      citaat.push(regel.replace(/^>\s?/, ""));
      return;
    }
    sluitCitaat(k);
    const lijstItem = regel.match(/^[-*] (.*)/) ?? regel.match(/^\d+\. (.*)/);
    if (lijstItem) {
      lijst.push(lijstItem[1]);
      return;
    }
    sluitLijst(k);

    if (regel.startsWith("# ")) {
      uit.push(
        <h1 key={k} className="font-display mt-2 text-3xl font-semibold tracking-tight">
          {inline(regel.slice(2), k)}
        </h1>
      );
    } else if (regel.startsWith("## ")) {
      uit.push(
        <h2 key={k} className="font-display mt-10 border-b border-stone-200 pb-2 text-2xl font-semibold tracking-tight text-violet-900">
          {inline(regel.slice(3), k)}
        </h2>
      );
    } else if (regel.startsWith("### ")) {
      uit.push(
        <h3 key={k} className="font-display mt-6 text-xl font-semibold">
          {inline(regel.slice(4), k)}
        </h3>
      );
    } else if (/^---+$/.test(regel.trim())) {
      uit.push(<hr key={k} className="my-8 border-stone-200" />);
    } else if (regel.trim() !== "") {
      uit.push(
        <p key={k} className="my-3 leading-relaxed text-stone-700">
          {inline(regel, k)}
        </p>
      );
    }
  });
  sluitCitaat(regels.length);
  sluitLijst(regels.length + 1);
  return uit;
}

export default async function WebinarScript() {
  await requireAdmin();
  const md = await readFile(
    path.join(process.cwd(), "docs/webinar-opzet.md"),
    "utf8"
  );

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="flex items-center justify-between gap-4">
        <Link href="/admin/webinars" className="text-sm text-stone-500 hover:text-violet-700">
          ← Webinars
        </Link>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
          Spiekbrief — alleen voor jou zichtbaar
        </span>
      </div>
      <article className="mt-4">{renderMarkdown(md)}</article>
    </div>
  );
}
