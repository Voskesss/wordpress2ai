/**
 * Search Console-check bij livegang (les RoelArt 27-09): een vers domein met
 * perfecte techniek kan maandenlang buiten Google blijven als niemand hem
 * aanmeldt. De checklist controleert of er een Google-verificatie aantoonbaar
 * op het domein staat: als TXT-record of als meta-tag, van wie dan ook.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { heeftGoogleVerificatie } from "../lib/livegang";

// 1. TXT-record telt (zoals Google hem uitgeeft, ongeacht wat eromheen staat)
assert.equal(heeftGoogleVerificatie(["v=spf1 include:x -all", "google-site-verification=AbC123"], null), true);
// 2. Meta-tag telt ook, met dubbele én enkele aanhalingstekens (Yoast-les)
assert.equal(heeftGoogleVerificatie([], '<meta name="google-site-verification" content="x">'), true);
assert.equal(heeftGoogleVerificatie([], "<meta name='google-site-verification' content='x'>"), true);
// 3. Niets aantoonbaars = niet geverifieerd; en niet struikelen over een dode site
assert.equal(heeftGoogleVerificatie(["v=spf1 -all"], "<html><head></head></html>"), false);
assert.equal(heeftGoogleVerificatie([], null), false);
// 4. Geen vals alarm op de tekst in een verhaaltje zonder echte tag
assert.equal(heeftGoogleVerificatie([], "<p>over google-site-verification gesproken</p>"), false);

// 5. De checklist gebruikt hem echt, als waarschuwing met eerlijke uitleg
const lg = await readFile("lib/livegang.ts", "utf8");
assert.ok(lg.includes('sleutel: "zoekconsole"'), "de zoekconsole-regel zit niet in de checklist");
assert.ok(lg.includes("mag je dit negeren"), "de eerlijke kanttekening over andere verificatiewegen ontbreekt");

console.log("zoekconsole: ok");
