/** Onder de mails van Jos hoort ons telefoonnummer, als tel-link, uit de ene
 * bron (lib/contactgegevens.ts) zodat het nooit ergens los getypt staat.
 * Draaien: node --import tsx tests/handtekening-telefoon.mts */
import assert from "node:assert/strict";
import { handtekening } from "../lib/mailer";
import { TELEFOON, TELEFOON_LINK } from "../lib/contactgegevens";

const h = handtekening(false);
assert.ok(h.includes(`href="tel:${TELEFOON_LINK}"`), "de handtekening mist de tel-link");
assert.ok(h.includes(`>${TELEFOON}<`), "de handtekening toont het nummer niet");
assert.ok(h.includes("jos@wordswap.nl") && h.includes("wordswap.nl"), "mailadres of site verdwenen uit de handtekening");
console.log("✓ telefoonnummer in de handtekening");
