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
// 14-10-2026 (Jos akkoord): het klikbare voorbeeld liet hetzelfde zien als de
// video en is van de homepage gehaald; het staat nog op /demo.
assert.ok(!pagina.includes("<ProductPreview />"), "het klikbare voorbeeld staat weer op de homepage naast de video");
// 14-10-2026 (Jos): geen "Bekijk de video"-knop in de hero; de video staat er direct onder
assert.ok(!held.includes('href="#bekijk-de-video"'), "de hero heeft weer een knop naar de video");
assert.ok(pagina.includes('id="bekijk-de-video"'), "het anker van de video ontbreekt");
assert.ok(!pagina.includes('href="#zo-werkt-aanpassen"'), "er wijst nog een link naar het verwijderde klikbare voorbeeld");

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

// Alle video's op de site schermvullend op de telefoon (15-10-2026), iPhone via webkitEnterFullscreen
{
  const fs = await import("node:fs/promises");
  const hulp = await fs.readFile("app/volscherm.ts", "utf8");
  if (!hulp.includes("webkitEnterFullscreen") || !hulp.includes("requestFullscreen")) throw new Error("volscherm kent iPhone of Android niet");
  // Elke openbare <video> moet de hulp gebruiken (het portaal telt niet mee)
  for (const bestand of ["app/DemoVideo.tsx", "app/video/[naam]/TikVideo.tsx"]) {
    if (!(await fs.readFile(bestand, "utf8")).includes("volschermOpTelefoon(")) throw new Error(`${bestand} gaat op de telefoon niet schermvullend`);
  }
  const { execSync } = await import("node:child_process");
  const metVideo = execSync("grep -rl '<video' app --include=*.tsx", { encoding: "utf8" }).trim().split("\n").filter((f) => !f.startsWith("app/portal/") && !f.startsWith("app/api/"));
  for (const f of metVideo) {
    if (!["app/DemoVideo.tsx", "app/video/[naam]/TikVideo.tsx"].includes(f)) throw new Error(`nieuwe video zonder schermvullend op de telefoon: ${f}`);
  }
}

// WhatsApp-blok op de homepage met filmpje (15-10-2026): eerlijk dat het bij Optimaal ontzorgd hoort
{
  const home = await (await import("node:fs/promises")).readFile("app/page.tsx", "utf8");
  if (!home.includes("<WhatsAppVideo />")) throw new Error("WhatsApp-filmpje ontbreekt op de homepage");
  if (!home.includes('href="/appen"')) throw new Error("WhatsApp-blok linkt niet naar /appen");
  if (!/WhatsApp zit in Optimaal ontzorgd/.test(home)) throw new Error("WhatsApp-blok zegt niet dat het bij Optimaal ontzorgd hoort");
}
