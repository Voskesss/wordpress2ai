/**
 * Live meekijken op de dev-database: nieuwe chatberichten, lopende beurten
 * (operation_leases) en nieuwe concepten. Eén regel per gebeurtenis.
 * Tijdelijk hulpscript — niet committen.
 */
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

let laatsteBericht = new Date();
const bekendeLeases = new Set<string>();
const bekendeChanges = new Set<number>();

for (const r of await sql`select id from changes`) bekendeChanges.add(r.id as number);

const tijd = () => new Date().toLocaleTimeString("nl-NL", { timeZone: "Europe/Amsterdam" });
console.log(`meekijker actief (${tijd()})`);

for (;;) {
  try {
    const berichten = await sql`
      select m.rol, m.tekst, m.aangemaakt, s.naam
      from messages m join sites s on s.id = m.site_id
      where m.aangemaakt > ${laatsteBericht}
      order by m.aangemaakt asc`;
    for (const b of berichten) {
      laatsteBericht = new Date(b.aangemaakt as string);
      const kort = String(b.tekst).replace(/\s+/g, " ").slice(0, 200);
      console.log(`${tijd()} [${b.naam}] ${b.rol}: ${kort}`);
    }

    const leases = await sql`select scope from operation_leases where expires_at > now()`;
    const nu = new Set(leases.map((l) => String(l.scope)));
    for (const s of nu)
      if (!bekendeLeases.has(s)) { bekendeLeases.add(s); console.log(`${tijd()} >> beurt gestart: ${s}`); }
    for (const s of [...bekendeLeases])
      if (!nu.has(s)) { bekendeLeases.delete(s); console.log(`${tijd()} << beurt klaar/gestopt: ${s}`); }

    const changes = await sql`
      select c.id, c.status, c.prompt_tekst, s.naam
      from changes c join sites s on s.id = c.site_id
      order by c.id desc limit 5`;
    for (const c of [...changes].reverse()) {
      if (!bekendeChanges.has(c.id as number)) {
        bekendeChanges.add(c.id as number);
        console.log(`${tijd()} ## nieuw concept op ${c.naam} [${c.status}]: ${String(c.prompt_tekst).slice(0, 140)}`);
      }
    }
  } catch (e) {
    console.error(`(meekijkfout, ga door: ${(e as Error).message.slice(0, 120)})`);
  }
  await new Promise((r) => setTimeout(r, 5000));
}
