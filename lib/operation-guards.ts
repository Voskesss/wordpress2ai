import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/db";

/** Database leases work across serverless instances. Kort slot met hartslag:
 * zolang de bewerking echt loopt wordt het elke 30 s verlengd; crasht of
 * verdwijnt de functie, dan valt het slot binnen ±1,5 minuut vanzelf vrij
 * (voorheen stond het tot 6 minuten vast). */
const LEASE_SECONDEN = 90;
/** @param opVerloren wordt aangeroepen als het slot is weggehaald (de eigenaar
 * drukte op stop of verliet de pagina). De lopende bewerking hoort dan te
 * stoppen: zonder slot mag er niet meer geschreven worden. */
export async function claimOperation(
  scope: string,
  opVerloren?: () => void,
) {
  const owner = randomUUID();
  const result = await db.execute(sql`
    INSERT INTO operation_leases (scope, owner, expires_at)
    VALUES (${scope}, ${owner}, now() + make_interval(secs => ${LEASE_SECONDEN}))
    ON CONFLICT (scope) DO UPDATE SET owner = EXCLUDED.owner, expires_at = EXCLUDED.expires_at
    WHERE operation_leases.expires_at < now()
    RETURNING owner
  `);
  if (!result.rows.length) return null;
  let verlorenGemeld = false;
  const hartslag = setInterval(() => {
    void db
      .execute(
        sql`UPDATE operation_leases SET expires_at = now() + make_interval(secs => ${LEASE_SECONDEN}) WHERE scope = ${scope} AND owner = ${owner} RETURNING owner`,
      )
      .then((r) => {
        // Geen rij meer: het slot is weggehaald. Meteen stoppen met werken.
        if (!r.rows.length && !verlorenGemeld) {
          verlorenGemeld = true;
          clearInterval(hartslag);
          opVerloren?.();
        }
      })
      .catch((e) => console.error("Slot verlengen mislukt:", e));
  }, 10_000);
  hartslag.unref?.();
  return async () => {
    clearInterval(hartslag);
    await db.execute(
      sql`DELETE FROM operation_leases WHERE scope = ${scope} AND owner = ${owner}`,
    );
  };
}

/** Hoeveel minuten het lopende slot nog maximaal geldt (voor een eerlijke
 * wachtmelding). Een gecrashte bewerking laat het slot hooguit zo lang staan. */
export async function leaseRestMinuten(scope: string): Promise<number> {
  const result = await db.execute(sql`
    SELECT CEIL(EXTRACT(EPOCH FROM (expires_at - now())) / 60) AS minuten
    FROM operation_leases WHERE scope = ${scope} AND expires_at > now()
  `);
  const m = Number((result.rows[0] as { minuten?: string } | undefined)?.minuten ?? 0);
  return Number.isFinite(m) && m > 0 ? m : 1;
}

/** Zet de reservering gelijk aan wat er écht is uitgegeven deze maand.
 *
 * Elke beurt reserveert vooraf het maximum en verrekent dat na afloop. Wordt
 * een beurt hard afgekapt (platformgrens, crash), dan komt die verrekening er
 * nooit en blijft het verschil als "gebruikt" staan. Zo raakte een testsite
 * op 20-09 zijn ruimte kwijt bij $3,59 werkelijk verbruik van $5: bijna een
 * dollar aan spoken van afgebroken beurten.
 *
 * Omdat er per site maar één beurt tegelijk kan lopen (het slot), is het
 * veilig om bij de start van een nieuwe beurt schoon te beginnen: de
 * reservering wordt het werkelijke verbruik uit het kostenlog. Alleen voor
 * echte sites — bij de demo delen meerdere mensen dezelfde site, daar zegt
 * het kostenlog niets over de ruimte van één bezoeker. */
export async function herijkReservering(
  scope: string,
  siteId: number,
  month = new Date().toISOString().slice(0, 7),
) {
  if (scope !== `site:${siteId}`) return; // demo: eigen scope per bezoeker
  await db
    .execute(
      sql`UPDATE ai_budget_reservations r
          SET reserved_micro_usd = COALESCE(
            (SELECT SUM(k.kosten_micro_usd) FROM ai_kosten k
             WHERE k.site_id = ${siteId} AND k.maand = ${month}), 0)
          WHERE r.scope = ${scope} AND r.month = ${month}`,
    )
    .catch((e) => console.error("Reservering herijken:", e));
}

/** Reserve the full per-request ceiling, including follow-ups, before starting AI.
 * Conservative by design: errors also consume a reservation. Actual spend is recorded separately.
 */
export async function reserveAiBudget(
  scope: string,
  maximumUsd: number,
  monthlyUsd: number,
  month = new Date().toISOString().slice(0, 7),
) {
  const amount = Math.ceil(maximumUsd * 1_000_000);
  const limit = Math.floor(monthlyUsd * 1_000_000);
  if (amount <= 0 || limit < amount) return false;
  const result = await db.execute(sql`
    INSERT INTO ai_budget_reservations (scope, month, reserved_micro_usd, requests)
    VALUES (${scope}, ${month}, ${amount}, 1)
    ON CONFLICT (scope, month) DO UPDATE
    SET reserved_micro_usd = ai_budget_reservations.reserved_micro_usd + EXCLUDED.reserved_micro_usd,
        requests = ai_budget_reservations.requests + 1
    WHERE ai_budget_reservations.reserved_micro_usd + EXCLUDED.reserved_micro_usd <= ${limit}
    RETURNING scope
  `);
  return result.rows.length > 0;
}
export function operationScope(
  site: { id: number; isDemo: boolean },
  userId: string,
) {
  return site.isDemo ? `site:${site.id}:user:${userId}` : `site:${site.id}`;
}

export async function settleAiBudget(
  scope: string,
  month: string,
  reservedUsd: number,
  actualUsd: number,
) {
  if (!Number.isFinite(actualUsd) || actualUsd < 0) return;
  const difference =
    Math.ceil(actualUsd * 1_000_000) - Math.ceil(reservedUsd * 1_000_000);
  await db.execute(
    sql`UPDATE ai_budget_reservations SET reserved_micro_usd = GREATEST(0, reserved_micro_usd + ${difference}) WHERE scope = ${scope} AND month = ${month}`,
  );
}
