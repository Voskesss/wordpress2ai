/**
 * Foto-dubbel telt wat de bezoeker ziet (Summit 26-09). Een lopende logostrook
 * heeft een tweede, verborgen kopie van dezelfde logo's nodig om naadloos rond
 * te lopen; die kopie staat in aria-hidden="true" en is geen dubbele foto.
 */
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { controleerSiteMap } from "../lib/bouw-controle";

async function site(body: string) {
  const map = await mkdtemp(path.join(tmpdir(), "fotodubbel-"));
  await mkdir(path.join(map, "afbeeldingen"), { recursive: true });
  await writeFile(path.join(map, "afbeeldingen", "espria.webp"), "x");
  await writeFile(path.join(map, "index.html"), `<html><head><title>T</title></head><body>${body}</body></html>`);
  return map;
}
const dubbel = async (body: string) => {
  const map = await site(body);
  const uit = (await controleerSiteMap(map)).filter((b) => b.regel === "foto-dubbel");
  await rm(map, { recursive: true, force: true });
  return uit.length;
};
const img = `<img src="/afbeeldingen/espria.webp" alt="Espria" width="300" height="100">`;

// Twee keer zichtbaar: melding
assert.equal(await dubbel(`${img}<p>tekst</p>${img}`), 1, "twee zichtbare kopieën horen gemeld te worden");
// Tweede kopie in een verborgen lus-rij: geen melding
assert.equal(await dubbel(`<ul class="logo-rij"><li>${img}</li></ul><ul class="logo-rij" aria-hidden="true"><li>${img}</li></ul>`), 0, "verborgen lus-kopie telt als dubbele foto");

console.log("foto-dubbel: ok");
