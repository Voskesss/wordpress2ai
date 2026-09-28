/**
 * Draait db/migrations/20260928-mail-naam-verbergen.sql op de database uit
 * het meegegeven env-bestand. Eén kolom erbij, geen bestaande gegevens geraakt.
 *   dev:        npx tsx --env-file=.env.development.local scripts/migreer-mail-naam.mts
 *   productie:  npx tsx --env-file=.env.local scripts/migreer-mail-naam.mts
 */
import { neon } from "@neondatabase/serverless";
import { readFile } from "node:fs/promises";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("Geen DATABASE_URL: geef een env-bestand mee met --env-file");
const sql = neon(url);
const ruw = await readFile(new URL("../db/migrations/20260928-mail-naam-verbergen.sql", import.meta.url), "utf8");
const statements = ruw
  .split("\n")
  .filter((r) => !r.trim().startsWith("--"))
  .join("\n")
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean);
for (const s of statements) await sql.query(s);
const [rij] = await sql`select count(*)::int as sites, count(*) filter (where mail_naam_verbergen)::int as verborgen from sites`;
console.log(`Klaar op ${new URL(url).host.split(".")[0]}: kolom mail_naam_verbergen aanwezig (${rij.sites} sites, ${rij.verborgen} met verborgen naam).`);
