import assert from "node:assert/strict";
import { conceptAchterhaald } from "../lib/lead-opvolging";

/**
 * Een klaarstaande mail moet verdwijnen zodra hij verstuurd is — óók als Jos
 * hem zelf vanuit zijn eigen postvak stuurde in plaats van via de Mailer.
 * Anders blijft er een kaartje staan voor werk dat al gedaan is.
 */

const klaargezet = new Date("2026-09-20T12:47:00Z");

// Ná het klaarzetten gemaild → het kaartje is achterhaald
assert.equal(conceptAchterhaald(klaargezet, new Date("2026-09-20T13:30:00Z")), true);

// Vóór het klaarzetten gemaild (bv. de vorige ronde) → het kaartje blijft staan
assert.equal(conceptAchterhaald(klaargezet, new Date("2026-09-19T09:00:00Z")), false);

// Exact hetzelfde moment telt niet als "daarna verstuurd"
assert.equal(conceptAchterhaald(klaargezet, new Date(klaargezet)), false);

// Nog nooit gemaild, of er staat niets klaar → niets op te ruimen
assert.equal(conceptAchterhaald(klaargezet, null), false);
assert.equal(conceptAchterhaald(null, new Date()), false);
assert.equal(conceptAchterhaald(null, null), false);

console.log("concept-opruimen: alle checks geslaagd");
