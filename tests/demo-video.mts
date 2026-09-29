/**
 * Demovideo op de homepage (keuze Jos 29-09): de video staat LAGER op de
 * pagina, het klikbare voorbeeld blijft bovenaan. Bewaakt: de volgorde, dat
 * de video de pagina niet trager maakt (niets laden vóór afspelen, vaste
 * maten tegen verspringen), dat beide uitvoeringen en startbeelden bestaan,
 * en dat hij zonder geluid en zonder vanzelf starten speelt.
 */
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";

const pagina = await readFile("app/page.tsx", "utf8");
const video = await readFile("app/DemoVideo.tsx", "utf8");
const css = await readFile("app/globals.css", "utf8");

// 1. Het klikbare voorbeeld blijft bovenaan, de video komt erna
const voorbeeld = pagina.indexOf("<ProductPreview />");
const demo = pagina.indexOf("<DemoVideo />");
assert.ok(voorbeeld > 0, "het klikbare voorbeeld is van de homepage verdwenen");
assert.ok(demo > voorbeeld, "de video staat boven het klikbare voorbeeld");
assert.ok(pagina.indexOf('className="home-hero') < voorbeeld && pagina.indexOf("</section>", voorbeeld) < demo, "de video staat in het bovenste blok");

// 2. Niets laden tot iemand afspeelt, niet vanzelf starten, geen geluid
assert.ok(video.includes('preload="none"'), "de video wordt al geladen voordat iemand afspeelt: de pagina wordt trager");
assert.ok(!/autoPlay|autoplay/.test(video), "de video start vanzelf");
assert.ok(video.includes("muted") && video.includes("playsInline") && video.includes("controls"), "muted, playsInline of de bedieningsknoppen ontbreken");
assert.ok(video.includes("width={u.breedte}") && video.includes("height={u.hoogte}"), "zonder vaste maten verspringt de pagina bij het laden");

// 3. Beide uitvoeringen met startbeeld bestaan echt, en het startbeeld is licht
for (const naam of ["vierkant", "reels"]) {
  const mp4 = await stat(`public/social/wordswap-demo-${naam}.mp4`);
  const beeld = await stat(`public/social/wordswap-demo-${naam}.webp`);
  assert.ok(mp4.size > 500_000, `video ${naam} ontbreekt of is leeg`);
  assert.ok(beeld.size > 5_000 && beeld.size < 150_000, `startbeeld ${naam} ontbreekt of is te zwaar (${beeld.size} bytes)`);
  assert.ok(video.includes(`/social/wordswap-demo-${naam}.mp4`) && video.includes(`/social/wordswap-demo-${naam}.webp`), `uitvoering ${naam} wordt niet gebruikt`);
}

// 4. Op de telefoon de staande, op breed scherm de vierkante: nooit allebei
assert.ok(/\.demo-video-staand \{ display: none !important; \}/.test(css), "de staande video is ook op een breed scherm zichtbaar");
assert.ok(/@media \(max-width: 760px\)[\s\S]*\.demo-video-vierkant \{ display: none !important; \}/.test(css), "de vierkante video is ook op de telefoon zichtbaar");

// 5. Het afspelen wordt gemeten, achter de cookiekeuze (trackMarketing regelt dat)
assert.ok(video.includes('trackMarketing("demo_video_start"'), "het starten van de video wordt niet gemeten");

console.log("demo-video: ok");
