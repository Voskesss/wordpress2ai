/**
 * Demovideo op de homepage. Keuze Jos 29-09: de video staat BOVENAAN met een
 * afspeelknop in het midden (het klikbare voorbeeld werd nauwelijks gebruikt)
 * en het klikbare voorbeeld staat lager. Bewaakt: de volgorde, dat de video
 * de pagina niet trager maakt (niets laden vóór afspelen, vaste maten tegen
 * verspringen), dat beide uitvoeringen en startbeelden bestaan, en dat hij
 * zonder geluid en zonder vanzelf starten speelt.
 */
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";

const pagina = await readFile("app/page.tsx", "utf8");
const video = await readFile("app/DemoVideo.tsx", "utf8");
const css = await readFile("app/globals.css", "utf8");

// 1. De video staat in het bovenste blok, het klikbare voorbeeld komt erna
const held = pagina.slice(pagina.indexOf('className="home-hero'), pagina.indexOf("</section>", pagina.indexOf('className="home-hero')));
assert.ok(held.includes("<DemoVideo />"), "de video staat niet in het bovenste blok");
assert.ok(!held.includes("<ProductPreview />"), "het klikbare voorbeeld staat nog bovenaan naast de video");
assert.ok(pagina.indexOf("<ProductPreview />") > pagina.indexOf("<DemoVideo />"), "het klikbare voorbeeld is verdwenen of staat boven de video");
assert.ok(held.includes('href="#bekijk-de-video"') && held.includes('id="bekijk-de-video"'), "de link bovenaan wijst niet naar de video");
assert.equal((pagina.match(/id="zo-werkt-aanpassen"/g) ?? []).length, 1, "het anker van het klikbare voorbeeld ontbreekt of staat dubbel");

// 1b. Afspeelknop over het startbeeld, met een naam voor schermlezers
assert.ok(video.includes('className="demo-video-knop"') && video.includes("aria-label=\"Speel de video af"), "de afspeelknop ontbreekt of heeft geen naam");
assert.ok(video.includes("controls={gestart}"), "de gewone bediening verschijnt niet na het starten");
assert.ok(/\.demo-video-knop \{[^}]*position: absolute[^}]*place-items: center/.test(css), "de afspeelknop staat niet gecentreerd over de video");

// 2. Niets laden tot iemand afspeelt, niet vanzelf starten, geen geluid
assert.ok(video.includes('preload="none"'), "de video wordt al geladen voordat iemand afspeelt: de pagina wordt trager");
assert.ok(!/autoPlay|autoplay/.test(video), "de video start vanzelf");
assert.ok(video.includes("muted") && video.includes("playsInline"), "muted of playsInline ontbreekt");
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
