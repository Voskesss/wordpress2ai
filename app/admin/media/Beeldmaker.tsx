"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Beeldmaker: dezelfde opmaak als de WordSwap-advertenties (foto boven, groene
 * lijn, donkerblauwe band met koppen en logo), maar dan in de browser. Voor
 * LinkedIn-berichten, Facebook en advertenties. Alles gebeurt lokaal in de
 * browser; er wordt niets geüpload.
 */

const NAVY = "#172d3a";
const GROEN = "#31966c";
const GROEN_LICHT = "#8fd3b5";
const ROOD = "#e0563b";

type Formaat = {
  id: string;
  label: string;
  w: number;
  h: number;
  fotoH: number; // 0 = alleen band
};

const FORMATEN: Formaat[] = [
  { id: "linkedin", label: "LinkedIn liggend 1200×627", w: 1200, h: 627, fotoH: 372 },
  { id: "vierkant", label: "Vierkant 1080×1080", w: 1080, h: 1080, fotoH: 786 },
  { id: "staand", label: "Staand 1080×1350", w: 1080, h: 1350, fotoH: 1057 },
  { id: "story", label: "Story 1080×1920", w: 1080, h: 1920, fotoH: 1500 },
  { id: "tekst-linkedin", label: "Alleen tekst, LinkedIn 1200×627", w: 1200, h: 627, fotoH: 0 },
  { id: "tekst-vierkant", label: "Alleen tekst, vierkant 1080×1080", w: 1080, h: 1080, fotoH: 0 },
];

type Invoer = {
  formaat: string;
  kop1: string;
  kop2: string;
  sub1: string;
  sub2: string;
  doorstrepen: boolean;
  fotoX: number; // 0-100, welk deel van de foto zichtbaar blijft bij bijsnijden
  fotoY: number;
};

const STANDAARD: Invoer = {
  formaat: "linkedin",
  kop1: "Blij met je website?",
  kop2: "Klaar met het WordPress-gedoe?",
  sub1: "Wij zetten je site over. Jij houdt je ontwerp en wijzigt door te typen.",
  sub2: "+ Bonus: je website staat direct open voor AI-chatbots.",
  doorstrepen: false,
  fotoX: 50,
  fotoY: 40,
};

const OPSLAG = "wordswap-beeldmaker";

function fontNaam(): string {
  if (typeof window === "undefined") return "sans-serif";
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue("--font-geist-sans")
    .trim();
  return v ? `${v}, "Avenir Next", "Helvetica Neue", Arial, sans-serif` : `"Avenir Next", "Helvetica Neue", Arial, sans-serif`;
}

/** Kies de grootste lettergrootte (≤ start) waarbij de tekst binnen maxW past. */
function pasFont(
  ctx: CanvasRenderingContext2D,
  tekst: string,
  gewicht: number,
  start: number,
  maxW: number,
  fam: string,
): number {
  let s = start;
  for (; s > 12; s -= 1) {
    ctx.font = `${gewicht} ${s}px ${fam}`;
    if (ctx.measureText(tekst).width <= maxW) break;
  }
  return s;
}

function tekenLogo(ctx: CanvasRenderingContext2D, x: number, y: number, hoogte: number, fam: string) {
  // Icoon: dezelfde paden als app/Logo.tsx (viewBox 40×40), in wit met groene streep.
  const s = hoogte / 40;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.lineWidth = 4.5;
  ctx.lineJoin = "round";
  ctx.lineCap = "butt";
  ctx.strokeStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(4, 9);
  ctx.lineTo(12, 31);
  ctx.lineTo(20, 13);
  ctx.lineTo(28, 31);
  ctx.lineTo(34, 15);
  ctx.stroke();
  ctx.strokeStyle = GROEN;
  ctx.beginPath();
  ctx.moveTo(34, 15);
  ctx.lineTo(36, 9);
  ctx.stroke();
  ctx.restore();
  // Woordmerk
  const size = hoogte * 0.88;
  ctx.font = `700 ${size}px ${fam}`;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#ffffff";
  const tx = x + hoogte * 0.92;
  const ty = y + hoogte * 0.78;
  ctx.fillText("ordswap", tx, ty);
  const w = ctx.measureText("ordswap").width;
  ctx.fillStyle = GROEN;
  ctx.fillText(".", tx + w, ty);
}

function teken(
  canvas: HTMLCanvasElement,
  inv: Invoer,
  foto: HTMLImageElement | null,
) {
  const f = FORMATEN.find((x) => x.id === inv.formaat) ?? FORMATEN[0];
  const { w: W, h: H } = f;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const fam = fontNaam();
  const schaal = W / 1080; // basis: de advertentiematen op 1080 breed
  const marge = 75 * schaal;

  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, W, H);

  let bandTop = 0;
  if (f.fotoH > 0) {
    const fotoH = f.fotoH;
    if (foto) {
      const r = Math.max(W / foto.width, fotoH / foto.height);
      const dw = foto.width * r;
      const dh = foto.height * r;
      const dx = -(dw - W) * (inv.fotoX / 100);
      const dy = -(dh - fotoH) * (inv.fotoY / 100);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, fotoH);
      ctx.clip();
      ctx.drawImage(foto, dx, dy, dw, dh);
      ctx.restore();
    } else {
      ctx.fillStyle = "#2a3f4d";
      ctx.fillRect(0, 0, W, fotoH);
      ctx.fillStyle = "#8aa0ad";
      ctx.font = `500 ${28 * schaal}px ${fam}`;
      ctx.textAlign = "center";
      ctx.fillText("Kies een foto (links)", W / 2, fotoH / 2);
      ctx.textAlign = "left";
    }
    const lijnH = 8 * schaal;
    ctx.fillStyle = GROEN;
    ctx.fillRect(0, fotoH, W, lijnH);
    bandTop = fotoH + lijnH;
  }

  const bandH = H - bandTop;
  const maxW = W - marge * 2;
  const logoH = 54 * schaal;
  const logoY = H - 74 * schaal;
  ctx.font = `700 ${logoH * 0.88}px ${fam}`;
  const logoW = ctx.measureText("ordswap.").width + logoH * 0.92;
  // Subregels blijven links van het logo, zoals in de advertenties.
  const maxWSub = W - marge - logoW - 30 * schaal;
  // Bij een liggend formaat is de band laag: tekst iets kleiner en strakker.
  const compact = bandH < 260 * schaal;
  const alleenTekst = f.fotoH === 0;
  const kopStart = (alleenTekst ? 72 : compact ? 40 : 50) * schaal;
  const subStart = (alleenTekst ? 40 : compact ? 24 : 30) * schaal;

  // Regels verzamelen en hoogtes bepalen, dan verticaal centreren in de band.
  type Regel = { tekst: string; gewicht: number; size: number; kleur: string; strike?: boolean; gap: number };
  const regels: Regel[] = [];
  if (inv.kop1.trim()) {
    const size = pasFont(ctx, inv.kop1, 700, kopStart, maxW, fam);
    regels.push({ tekst: inv.kop1, gewicht: 700, size, kleur: inv.doorstrepen ? "#c9d3da" : "#ffffff", strike: inv.doorstrepen, gap: size * 1.18 });
  }
  if (inv.kop2.trim()) {
    const size = pasFont(ctx, inv.kop2, 700, kopStart, maxW, fam);
    regels.push({ tekst: inv.kop2, gewicht: 700, size, kleur: GROEN_LICHT, gap: size * 1.18 });
  }
  if (inv.sub1.trim()) {
    const size = pasFont(ctx, inv.sub1, 600, subStart, maxWSub, fam);
    regels.push({ tekst: inv.sub1, gewicht: 600, size, kleur: "#ffffff", gap: size * 1.35 });
  }
  if (inv.sub2.trim()) {
    const size = pasFont(ctx, inv.sub2, 400, subStart, maxWSub, fam);
    regels.push({ tekst: inv.sub2, gewicht: 400, size, kleur: "#d3dce2", gap: size * 1.35 });
  }
  const totaal = regels.reduce((a, r) => a + r.gap, 0);
  const beschikbaar = bandH - logoH - 30 * schaal;
  let y = bandTop + Math.max(28 * schaal, (beschikbaar - totaal) / 2 + 12 * schaal);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  for (const r of regels) {
    y += r.size;
    ctx.font = `${r.gewicht} ${r.size}px ${fam}`;
    ctx.fillStyle = r.kleur;
    ctx.fillText(r.tekst, marge, y);
    if (r.strike) {
      const tw = ctx.measureText(r.tekst).width;
      ctx.strokeStyle = ROOD;
      ctx.lineWidth = Math.max(4, r.size * 0.14);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(marge - 5 * schaal, y - r.size * 0.32);
      ctx.lineTo(marge + tw + 5 * schaal, y - r.size * 0.32);
      ctx.stroke();
    }
    y += r.gap - r.size;
  }

  // Logo rechtsonder
  tekenLogo(ctx, W - marge + 10 * schaal - logoW, logoY, logoH, fam);
}

export default function Beeldmaker() {
  const [inv, setInv] = useState<Invoer>(STANDAARD);
  const [foto, setFoto] = useState<HTMLImageElement | null>(null);
  const [fotoNaam, setFotoNaam] = useState<string>("");
  const [melding, setMelding] = useState<string>("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const geladen = useRef(false);

  useEffect(() => {
    try {
      const b = localStorage.getItem(OPSLAG);
      if (b) setInv({ ...STANDAARD, ...JSON.parse(b) });
    } catch {}
    geladen.current = true;
  }, []);

  useEffect(() => {
    if (!geladen.current) return;
    try {
      localStorage.setItem(OPSLAG, JSON.stringify(inv));
    } catch {}
  }, [inv]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    let dood = false;
    const doe = () => {
      if (!dood) teken(c, inv, foto);
    };
    doe();
    // Nog eens tekenen als de webfonts binnen zijn (anders valt hij terug op een systeemfont).
    document.fonts?.ready.then(doe).catch(() => {});
    return () => {
      dood = true;
    };
  }, [inv, foto]);

  function zet<K extends keyof Invoer>(k: K, v: Invoer[K]) {
    setInv((o) => ({ ...o, [k]: v }));
  }

  function kiesFoto(bestand: File | undefined) {
    if (!bestand) return;
    const url = URL.createObjectURL(bestand);
    const img = new Image();
    img.onload = () => {
      setFoto(img);
      setFotoNaam(bestand.name);
    };
    img.src = url;
  }

  function bestandsnaam() {
    const f = FORMATEN.find((x) => x.id === inv.formaat) ?? FORMATEN[0];
    const slug = (inv.kop1 || inv.kop2 || "wordswap")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);
    return `wordswap-${slug}-${f.w}x${f.h}.png`;
  }

  function download() {
    const c = canvasRef.current;
    if (!c) return;
    c.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = bestandsnaam();
      a.click();
      URL.revokeObjectURL(a.href);
    }, "image/png");
  }

  async function kopieer() {
    const c = canvasRef.current;
    if (!c) return;
    try {
      const blob: Blob | null = await new Promise((r) => c.toBlob(r, "image/png"));
      if (!blob) throw new Error("geen beeld");
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setMelding("✓ Gekopieerd, plak hem in je LinkedIn-bericht");
    } catch {
      setMelding("Kopiëren lukt niet in deze browser, gebruik Download");
    }
    setTimeout(() => setMelding(""), 3000);
  }

  const invoer =
    "mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-violet-500 focus:outline-none";
  const label = "block text-xs font-semibold uppercase tracking-wide text-stone-500";
  const f = FORMATEN.find((x) => x.id === inv.formaat) ?? FORMATEN[0];

  return (
    <div className="grid gap-8 lg:grid-cols-5">
      <div className="lg:col-span-2 space-y-4">
        <div>
          <label className={label} htmlFor="bm-formaat">Formaat</label>
          <select
            id="bm-formaat"
            className={invoer}
            value={inv.formaat}
            onChange={(e) => zet("formaat", e.target.value)}
          >
            {FORMATEN.map((x) => (
              <option key={x.id} value={x.id}>{x.label}</option>
            ))}
          </select>
        </div>
        {f.fotoH > 0 && (
          <div>
            <label className={label} htmlFor="bm-foto">Foto</label>
            <input
              id="bm-foto"
              type="file"
              accept="image/*"
              className="mt-1 block w-full text-sm text-stone-600 file:mr-3 file:rounded-full file:border-0 file:bg-violet-700 file:px-4 file:py-1.5 file:text-sm file:font-semibold file:text-white hover:file:bg-violet-600"
              onChange={(e) => kiesFoto(e.target.files?.[0])}
            />
            {fotoNaam && <p className="mt-1 text-xs text-stone-500">{fotoNaam}</p>}
            {foto && (
              <div className="mt-2 grid grid-cols-2 gap-3">
                <label className="text-xs text-stone-500">
                  Uitsnede links–rechts
                  <input type="range" min={0} max={100} value={inv.fotoX} onChange={(e) => zet("fotoX", Number(e.target.value))} className="mt-1 w-full" />
                </label>
                <label className="text-xs text-stone-500">
                  Uitsnede boven–onder
                  <input type="range" min={0} max={100} value={inv.fotoY} onChange={(e) => zet("fotoY", Number(e.target.value))} className="mt-1 w-full" />
                </label>
              </div>
            )}
          </div>
        )}
        <div>
          <label className={label} htmlFor="bm-kop1">Kop, regel 1 (wit)</label>
          <input id="bm-kop1" className={invoer} value={inv.kop1} onChange={(e) => zet("kop1", e.target.value)} />
          <label className="mt-1.5 flex items-center gap-2 text-xs text-stone-600">
            <input type="checkbox" checked={inv.doorstrepen} onChange={(e) => zet("doorstrepen", e.target.checked)} />
            Regel 1 doorstrepen (zoals “Een website, 20x goedkoper met AI.”)
          </label>
        </div>
        <div>
          <label className={label} htmlFor="bm-kop2">Kop, regel 2 (groen)</label>
          <input id="bm-kop2" className={invoer} value={inv.kop2} onChange={(e) => zet("kop2", e.target.value)} />
        </div>
        <div>
          <label className={label} htmlFor="bm-sub1">Subregel 1 (wit, halfvet)</label>
          <input id="bm-sub1" className={invoer} value={inv.sub1} onChange={(e) => zet("sub1", e.target.value)} />
        </div>
        <div>
          <label className={label} htmlFor="bm-sub2">Subregel 2 (grijs)</label>
          <input id="bm-sub2" className={invoer} value={inv.sub2} onChange={(e) => zet("sub2", e.target.value)} />
        </div>
        <p className="text-xs text-stone-500">
          Te lange regels worden automatisch kleiner. Laat een veld leeg om die regel weg te laten. Je invoer wordt in deze browser onthouden.
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          <button
            onClick={download}
            className="rounded-full bg-violet-700 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-600 cursor-pointer"
          >
            Download PNG ({f.w}×{f.h})
          </button>
          <button
            onClick={kopieer}
            className="rounded-full border border-stone-300 px-5 py-2 text-sm font-semibold text-stone-700 hover:border-violet-400 cursor-pointer"
          >
            Kopieer naar klembord
          </button>
        </div>
        {melding && <p className="text-sm text-emerald-700">{melding}</p>}
      </div>
      <div className="lg:col-span-3">
        <div className="rounded-2xl border border-stone-200 bg-stone-100 p-3">
          <canvas
            ref={canvasRef}
            className="block h-auto w-full max-w-full rounded-lg shadow-sm"
            style={{ aspectRatio: `${f.w} / ${f.h}` }}
          />
        </div>
        <p className="mt-2 text-xs text-stone-500">
          Voorbeeld op ware verhouding. Het gedownloade bestand is {f.w}×{f.h} pixels.
        </p>
      </div>
    </div>
  );
}
