/** Explicit DEV_DATABASE_URL only; never falls back to production DATABASE_URL. */
import { neon } from "@neondatabase/serverless";
import { readFile } from "node:fs/promises";
const target = process.env.DEV_DATABASE_URL;
if (!target || process.env.CONFIRM_SEPARATE_DEV_DATABASE !== "yes") {
  throw new Error(
    "Stel DEV_DATABASE_URL en CONFIRM_SEPARATE_DEV_DATABASE=yes in nadat de aparte dev-database is gecontroleerd.",
  );
}
const sql = neon(target);
const migration = await readFile(
  new URL("../db/migrations/20260908-operation-guards.sql", import.meta.url),
  "utf8",
);
await sql.transaction(
  migration
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((statement) => sql.query(statement)),
);
console.log(
  "Dev-operation-guards gemigreerd. Geen bestaande klantgegevens gewijzigd.",
);
