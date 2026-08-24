import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Lazy zodat een ontbrekende DATABASE_URL pas faalt bij daadwerkelijk
// databasegebruik, niet al tijdens de build van statische pagina's.
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL ontbreekt");
    _db = drizzle(neon(url), { schema });
  }
  return _db;
}

export const db = new Proxy({} as ReturnType<typeof getDb>, {
  get(_target, prop) {
    return getDb()[prop as keyof ReturnType<typeof getDb>];
  },
});
