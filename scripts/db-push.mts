/**
 * Veilige schema-push. `drizzle-kit push` gooit tabellen weg die niet in
 * db/schema.ts staan — zo verdwenen op 13-09-2026 twee tabellen en faalden
 * publiceren en concept weggooien. Dit script weigert te pushen zolang er
 * tabellen in de database staan die het schema niet kent.
 *
 *   npx tsx --env-file=.env.local scripts/db-push.mts        (= npm run db:push)
 *
 * Gebruik NOOIT rechtstreeks `npx drizzle-kit push`.
 */
import { spawnSync } from "node:child_process";
import { sql } from "drizzle-orm";
import { getTableName, is } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import { db } from "../db";
import * as schema from "../db/schema";

const inSchema = new Set<string>(
  Object.values(schema)
    .filter((v): v is PgTable => is(v, PgTable))
    .map((t) => getTableName(t)),
);
const r = await db.execute(
  sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY 1`,
);
const inDb = (r.rows as { table_name: string }[]).map((x) => x.table_name);
const onbekend = inDb.filter((t) => !inSchema.has(t));

if (onbekend.length > 0) {
  console.error(
    `STOP: deze tabellen staan in de database maar niet in db/schema.ts — een push zou ze WEGGOOIEN:\n  ${onbekend.join("\n  ")}\nNeem ze eerst op in db/schema.ts (of verwijder ze bewust met de hand).`,
  );
  process.exit(1);
}
console.log(`Schema-check ok: ${inDb.length} tabellen, allemaal bekend. Push start...`);
const uit = spawnSync("npx", ["drizzle-kit", "push", "--force"], {
  stdio: "inherit",
  env: process.env,
});
process.exit(uit.status ?? 1);
