/**
 * Rem op live schrijven vanaf de testomgeving (02-10): een testupload op dev
 * stond op de echte site van Vakbeursonline. Op productie verandert niets
 * (uploaden gaat direct live én in het concept); op dev en lokaal mogen
 * banken alleen nog bij testsites live schrijven of wissen.
 */
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { isTestsite, magLiveSchrijven, REM_MELDING } from "../lib/omgeving";

const klant = { isDemo: false, githubRepo: "vandenberg-mediation" };
const eigen = { isDemo: false, githubRepo: "vakbeursonline" };
const test1 = { isDemo: false, githubRepo: "test-groene-golf" };
const test2 = { isDemo: false, githubRepo: "proefballon-test" };
const demo = { isDemo: true, githubRepo: "demo-bakkerij" };
const bijna = { isDemo: false, githubRepo: "testament-notaris" };

// 1. Het echte pad, per omgeving
const zet = (v: string | undefined) => { if (v === undefined) delete process.env.VERCEL_ENV; else process.env.VERCEL_ENV = v; };
zet("production");
assert.equal(magLiveSchrijven(klant), true, "op productie moet een klantsite gewoon direct live kunnen");
for (const omgeving of ["preview", "development", undefined]) {
  zet(omgeving);
  assert.equal(magLiveSchrijven(klant), false, `op ${omgeving ?? "lokaal"} mag een echte klantsite niet live beschreven worden`);
  assert.equal(magLiveSchrijven(test1), true, "test-groene-golf moet op dev testbaar blijven");
  assert.equal(magLiveSchrijven(test2), true, "proefballon-test moet op dev testbaar blijven");
  assert.equal(magLiveSchrijven(demo), true, "de demo moet op dev testbaar blijven");
  assert.equal(magLiveSchrijven(eigen), true, "vakbeursonline is de eigen site van Jos en moet op dev testbaar blijven");
}
assert.equal(isTestsite(bijna), false, "een klant die toevallig met 'test' begint (testament-notaris) is geen testsite");
assert.ok(!REM_MELDING.includes("—"), "lang streepje in de remmelding");

// 2. De rem staat in elke bankactie die live schrijft of wist, en niet daarbuiten
const verwacht: [string, string[]][] = [
  ["app/api/audiobank/route.ts", ["POST", "DELETE"]],
  ["app/api/documentbank/route.ts", ["POST", "DELETE"]],
  ["app/api/fotobank/route.ts", ["DELETE"]],
  ["app/api/fotobank/upload/route.ts", ["POST"]],
  ["app/api/videobank/route.ts", ["POST", "DELETE"]],
];
for (const [pad, methodes] of verwacht) {
  const bron = await readFile(pad, "utf8");
  const blokken = bron.split(/(?=^export async function )/m).filter((b) => b.startsWith("export async function"));
  for (const blok of blokken) {
    const methode = blok.match(/^export async function (\w+)/)![1];
    const heeftRem = /if \(!magLiveSchrijven\(site\)\) return NextResponse\.json\(\{ error: REM_MELDING/.test(blok);
    assert.equal(heeftRem, methodes.includes(methode), `${pad} ${methode}: rem ${methodes.includes(methode) ? "ontbreekt" : "hoort hier niet (alleen-lezen of concept)"}`);
  }
}
zet(undefined);
console.log("dev-rem: op productie direct live, op dev alleen testsites, rem precies op de schrijvende bankacties");
