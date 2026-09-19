/** Draait de twee WhatsApp-migraties van 18-09 op de DEV-database (na de
 * merge van main naar dev miste dev deze, waardoor de admin een kolomfout
 * gaf). Explicit DEV_DATABASE_URL only; never falls back to production. */
import { neon } from "@neondatabase/serverless";
import { readFile } from "node:fs/promises";

const target = process.env.DEV_DATABASE_URL;
if (!target || process.env.CONFIRM_SEPARATE_DEV_DATABASE !== "yes") {
  throw new Error(
    "Stel DEV_DATABASE_URL en CONFIRM_SEPARATE_DEV_DATABASE=yes in nadat de aparte dev-database is gecontroleerd.",
  );
}
if (!target.includes("gentle-pond")) {
  throw new Error("DEV_DATABASE_URL wijst niet naar de bekende dev-database (gentle-pond) — gestopt.");
}
const sql = neon(target);
// meerdere-sites is bij de eerste run al toegepast (unieke naam-constraint is
// niet idempotent), dus die staat hier niet meer in
for (const bestand of ["20260918-whatsapp-nummers.sql"]) {
  const migration = await readFile(
    new URL(`../db/migrations/${bestand}`, import.meta.url),
    "utf8",
  );
  await sql.transaction(
    migration
      // Commentaarregels eerst weg: een puntkomma ín een comment ("vervalt; in
      // plaats daarvan") zou anders de statement-splitsing breken
      .split("\n")
      .filter((r) => !r.trim().startsWith("--"))
      .join("\n")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((statement) => sql.query(statement)),
  );
  console.log(`OK: ${bestand}`);
}
console.log("Dev-WhatsApp-migraties gedraaid. Geen bestaande klantgegevens gewijzigd.");
