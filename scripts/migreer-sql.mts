/**
 * Draait één bestand uit db/migrations op de database uit het env-bestand.
 *   dev:        npx tsx --env-file=.env.development.local scripts/migreer-sql.mts <bestand.sql>
 *   productie:  npx tsx --env-file=.env.local scripts/migreer-sql.mts <bestand.sql>
 * Commentaarregels gaan er eerst uit (een puntkomma in commentaar brak dit eerder).
 */
import { neon } from "@neondatabase/serverless";
import { readFile } from "node:fs/promises";

const bestand = process.argv[2];
const url = process.env.DATABASE_URL;
if (!bestand || !/^[a-z0-9-]+\.sql$/.test(bestand)) throw new Error("Gebruik: migreer-sql.mts <bestand.sql> (alleen de bestandsnaam uit db/migrations)");
if (!url) throw new Error("Geen DATABASE_URL: geef een env-bestand mee met --env-file");
const sql = neon(url);
const ruw = await readFile(new URL(`../db/migrations/${bestand}`, import.meta.url), "utf8");
const statements = ruw.split("\n").filter((r) => !r.trim().startsWith("--")).join("\n").split(";").map((s) => s.trim()).filter(Boolean);
for (const s of statements) {
  await sql.query(s);
  console.log("✓", s.replace(/\s+/g, " ").slice(0, 90));
}
console.log(`Klaar op ${new URL(url).host.split(".")[0]}: ${statements.length} opdracht(en) uit ${bestand}.`);
