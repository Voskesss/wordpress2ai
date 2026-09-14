"use client";

/** Het huidige WordSwap-logo (zelfde paden als app/Logo.tsx) als losse bestanden. */

const FONT = "Geist, 'Avenir Next', 'Helvetica Neue', Arial, sans-serif";

const ICOON = (kleur: string) => `
  <path d="M4 9 12 31 20 13 28 31 34 15" fill="none" stroke="${kleur}" stroke-width="4.5" stroke-linejoin="round"/>
  <path d="m34 15 2-6" fill="none" stroke="#31956B" stroke-width="4.5"/>`;

const WOORDMERK = (kleur: string) => `
  <g transform="translate(0,0)">${ICOON(kleur)}</g>
  <text x="37" y="31" font-family="${FONT}" font-weight="700" font-size="35" letter-spacing="-1.9" fill="${kleur}">ordswap<tspan fill="#31956B">.</tspan></text>`;

type Asset = {
  naam: string;
  breedte: number;
  hoogte: number;
  svg: string;
  donkereAchtergrond?: boolean;
};

const ASSETS: Asset[] = [
  {
    naam: "logo-icoon",
    breedte: 40,
    hoogte: 40,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">${ICOON("#172E3B")}</svg>`,
  },
  {
    naam: "logo-icoon-wit",
    breedte: 40,
    hoogte: 40,
    donkereAchtergrond: true,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">${ICOON("#ffffff")}</svg>`,
  },
  {
    naam: "logo-volledig",
    breedte: 190,
    hoogte: 40,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 190 40">${WOORDMERK("#172E3B")}</svg>`,
  },
  {
    naam: "logo-volledig-wit",
    breedte: 190,
    hoogte: 40,
    donkereAchtergrond: true,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 190 40">${WOORDMERK("#ffffff")}</svg>`,
  },
];

function downloadSvg(asset: Asset) {
  const blob = new Blob([asset.svg], { type: "image/svg+xml" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${asset.naam}.svg`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function downloadPng(asset: Asset, schaal: number) {
  const img = new Image();
  const svgBlob = new Blob([asset.svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(svgBlob);
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = asset.breedte * schaal;
    canvas.height = asset.hoogte * schaal;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((png) => {
      if (!png) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(png);
      a.download = `${asset.naam}-${canvas.width}x${canvas.height}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    }, "image/png");
    URL.revokeObjectURL(url);
  };
  img.src = url;
}

export default function MediaAssets() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {ASSETS.map((asset) => (
        <div key={asset.naam} className="rounded-2xl border border-stone-200 bg-white p-4">
          <div
            className={`flex items-center justify-center rounded-xl p-5 ${
              asset.donkereAchtergrond ? "bg-[#172d3a]" : "bg-stone-50"
            }`}
            style={{ minHeight: 96 }}
          >
            <div
              className="max-w-full"
              style={{ width: asset.breedte > 100 ? 150 : 44 }}
              dangerouslySetInnerHTML={{ __html: asset.svg }}
            />
          </div>
          <p className="mt-3 text-sm font-semibold">{asset.naam}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <button
              onClick={() => downloadSvg(asset)}
              className="rounded-full border border-stone-300 px-3 py-1 font-medium hover:border-violet-400 cursor-pointer"
            >
              SVG
            </button>
            <button
              onClick={() => downloadPng(asset, 20)}
              className="rounded-full bg-violet-700 px-3 py-1 text-white font-medium hover:bg-violet-600 cursor-pointer"
            >
              PNG groot
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
