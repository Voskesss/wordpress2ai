/**
 * Eén adres voor Google (wens Jos 27-09, Van den Berg): www hoort met 301
 * naar het kale domein te sturen, de canonical hoort naar het kale domein te
 * wijzen, en de sitemap hoort dezelfde huisstijl te gebruiken. Staat dit
 * scheef, dan verdeelt Google de posities over twee adressen.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { beoordeelWwwEnCanonical } from "../lib/livegang";

const doel = "vandenbergmediation.nl";
const goed = beoordeelWwwEnCanonical(
  doel,
  { status: 200, location: null },
  { status: 301, location: "https://vandenbergmediation.nl/" },
  "https://vandenbergmediation.nl/",
  "https://vandenbergmediation.nl/post-sitemap.xml",
);
assert.equal(goed.ok, true, `het echte Van den Berg-geval hoort groen te zijn: ${goed.uitleg}`);

// www toont de site zelf: dubbel in Google
const dubbel = beoordeelWwwEnCanonical(doel, { status: 200, location: null }, { status: 200, location: null }, "https://vandenbergmediation.nl/", null);
assert.equal(dubbel.ok, false);
assert.ok(dubbel.uitleg.includes("dubbel"), "de dubbel-uitleg ontbreekt");

// canonical wijst naar de verkeerde host
const scheef = beoordeelWwwEnCanonical(doel, { status: 200, location: null }, { status: 301, location: "https://vandenbergmediation.nl/" }, "https://www.vandenbergmediation.nl/", null);
assert.equal(scheef.ok, false);
assert.ok(scheef.uitleg.includes("canonical wijst naar www."), "de canonical-uitleg ontbreekt");

// www verwijst naar een vreemd adres
const vreemd = beoordeelWwwEnCanonical(doel, { status: 200, location: null }, { status: 301, location: "https://anderedomein.nl/" }, "https://vandenbergmediation.nl/", null);
assert.equal(vreemd.ok, false);

// geen canonical, dode www, sitemap op de verkeerde host: alles benoemd
const alles = beoordeelWwwEnCanonical(doel, { status: 200, location: null }, null, null, "https://www.vandenbergmediation.nl/sitemap.xml");
assert.equal(alles.ok, false);
assert.ok(alles.uitleg.includes("geen canonical") && alles.uitleg.includes("www.") && alles.uitleg.includes("sitemap"));

// Met www ingevuld in het domeinveld normaliseren we naar kaal
const metWww = beoordeelWwwEnCanonical("www.vandenbergmediation.nl", { status: 200, location: null }, { status: 301, location: "https://vandenbergmediation.nl/" }, "https://vandenbergmediation.nl/", null);
assert.equal(metWww.ok, true);

// En de checklist gebruikt hem echt
const lg = await readFile("lib/livegang.ts", "utf8");
assert.ok(lg.includes('sleutel: "canoniek"'), "de canoniek-regel zit niet in de checklist");


// Hoofdadres met www (29-09, aanleiding joostmarchal.nl): de rollen draaien om
const wwwGoed = beoordeelWwwEnCanonical("joostmarchal.nl", { status: 301, location: "https://www.joostmarchal.nl/" }, { status: 200, location: null }, "https://www.joostmarchal.nl/", "https://www.joostmarchal.nl/projecten/", true);
assert.ok(wwwGoed.ok, "een site met www als hoofdadres wordt afgekeurd: " + wwwGoed.uitleg);
const wwwMaarKaalIngesteld = beoordeelWwwEnCanonical("joostmarchal.nl", { status: 301, location: "https://www.joostmarchal.nl/" }, { status: 200, location: null }, "https://www.joostmarchal.nl/", null, false);
assert.ok(!wwwMaarKaalIngesteld.ok, "de site draait op www terwijl kaal is ingesteld, en dat valt niet op");
const wwwCanonicalKaal = beoordeelWwwEnCanonical("joostmarchal.nl", { status: 301, location: "https://www.joostmarchal.nl/" }, { status: 200, location: null }, "https://joostmarchal.nl/", null, true);
assert.ok(!wwwCanonicalKaal.ok && wwwCanonicalKaal.uitleg.includes("canonical"), "canonical op het kale adres bij een www-site valt niet op");
const wwwDubbel = beoordeelWwwEnCanonical("joostmarchal.nl", { status: 200, location: null }, { status: 200, location: null }, "https://www.joostmarchal.nl/", null, true);
assert.ok(!wwwDubbel.ok && wwwDubbel.uitleg.includes("dubbel"), "kaal en www tonen allebei de site en dat valt niet op");

console.log("canoniek: ok");
