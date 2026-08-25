"use client";

const ICOON = (kleur1: string, kleur2: string, ai: string) => `
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${kleur1}"/>
      <stop offset="1" stop-color="${kleur2}"/>
    </linearGradient>
  </defs>
  <path d="M18 24a16 16 0 0 1 27-3" fill="none" stroke="url(#g)" stroke-width="5" stroke-linecap="round"/>
  <path d="M46 12v9h-9" fill="none" stroke="url(#g)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M46 40a16 16 0 0 1-27 3" fill="none" stroke="url(#g)" stroke-width="5" stroke-linecap="round"/>
  <path d="M18 52v-9h9" fill="none" stroke="url(#g)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="32" y="37" text-anchor="middle" font-family="Arial, sans-serif" font-weight="800" font-size="16" fill="${ai}">ai</text>`;

const WOORDMERK = (donker: string, wDonker = "#464342") => `
  <defs>
    <linearGradient id="tg" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#7c3aed"/>
      <stop offset="1" stop-color="#d946ef"/>
    </linearGradient>
  </defs>
  <text x="0" y="46" font-family="Georgia, serif" font-style="italic" font-weight="600" font-size="46" fill="${wDonker}">W</text>
  <text x="44" y="46" font-family="Arial, sans-serif" font-weight="700" font-size="42" letter-spacing="-1.5" fill="${donker}">ord</text>
  <text x="108" y="46" font-family="Arial, sans-serif" font-weight="700" font-size="42" letter-spacing="-1.5" fill="url(#tg)">swap</text>`;

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
    breedte: 64,
    hoogte: 64,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${ICOON("#7c3aed", "#d946ef", "#292524")}</svg>`,
  },
  {
    naam: "logo-icoon-wit",
    breedte: 64,
    hoogte: 64,
    donkereAchtergrond: true,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${ICOON("#a78bfa", "#e879f9", "#ffffff")}</svg>`,
  },
  {
    naam: "logo-volledig",
    breedte: 320,
    hoogte: 64,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 64"><g>${ICOON("#7c3aed", "#d946ef", "#292524")}</g><g transform="translate(76,2)">${WOORDMERK("#18181b")}</g></svg>`,
  },
  {
    naam: "logo-volledig-wit",
    breedte: 320,
    hoogte: 64,
    donkereAchtergrond: true,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 64"><g>${ICOON("#a78bfa", "#e879f9", "#ffffff")}</g><g transform="translate(76,2)">${WOORDMERK("#ffffff", "#d6d3d1")}</g></svg>`,
  },
  {
    naam: "video-kaart-9x16",
    breedte: 1080,
    hoogte: 1920,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920">
      <rect width="1080" height="1920" fill="#fdfbf7"/>
      <g transform="translate(396,780) scale(4.5)">${ICOON("#7c3aed", "#d946ef", "#292524")}</g>
      <g transform="translate(240,1120) scale(2)">${WOORDMERK("#18181b")}</g>
      <text x="540" y="1290" text-anchor="middle" font-family="Georgia, serif" font-size="42" fill="#57534e">van WordPress naar een website die doet wat je zegt</text>
    </svg>`,
  },
  {
    naam: "video-kaart-9x16-donker",
    breedte: 1080,
    hoogte: 1920,
    donkereAchtergrond: true,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920">
      <rect width="1080" height="1920" fill="#1c1917"/>
      <g transform="translate(396,780) scale(4.5)">${ICOON("#a78bfa", "#e879f9", "#ffffff")}</g>
      <g transform="translate(240,1120) scale(2)">${WOORDMERK("#ffffff", "#d6d3d1")}</g>
      <text x="540" y="1290" text-anchor="middle" font-family="Georgia, serif" font-size="42" fill="#a8a29e">van WordPress naar een website die doet wat je zegt</text>
    </svg>`,
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
    <div className="grid gap-6 sm:grid-cols-2">
      {ASSETS.map((asset) => (
        <div
          key={asset.naam}
          className="rounded-3xl border border-stone-200 bg-white p-6"
        >
          <div
            className={`flex items-center justify-center rounded-2xl p-6 ${
              asset.donkereAchtergrond ? "bg-stone-900" : "bg-stone-50"
            }`}
            style={{ minHeight: 120 }}
          >
            <div
              className="max-w-full"
              style={{
                width: asset.breedte > 400 ? 140 : asset.breedte * 1.4,
              }}
              dangerouslySetInnerHTML={{ __html: asset.svg }}
            />
          </div>
          <p className="mt-4 font-semibold">{asset.naam}</p>
          <p className="text-sm text-stone-500">
            {asset.breedte > 400
              ? `${asset.breedte} × ${asset.hoogte}`
              : "vector — elk formaat"}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <button
              onClick={() => downloadSvg(asset)}
              className="rounded-full border border-stone-300 px-4 py-1.5 font-medium hover:border-violet-400 cursor-pointer"
            >
              SVG
            </button>
            <button
              onClick={() => downloadPng(asset, asset.breedte > 400 ? 1 : 16)}
              className="rounded-full bg-violet-700 px-4 py-1.5 text-white font-medium hover:bg-violet-600 cursor-pointer"
            >
              PNG {asset.breedte > 400 ? "(1080×1920)" : "(groot)"}
            </button>
            {asset.breedte <= 400 && (
              <button
                onClick={() => downloadPng(asset, 32)}
                className="rounded-full border border-stone-300 px-4 py-1.5 font-medium hover:border-violet-400 cursor-pointer"
              >
                PNG (extra groot)
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
