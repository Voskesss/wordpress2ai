import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/db";

/** Database leases work across serverless instances. TTL exceeds route maxDuration. */
export async function claimOperation(scope: string) {
  const owner = randomUUID();
  const result = await db.execute(sql`
    INSERT INTO operation_leases (scope, owner, expires_at)
    VALUES (${scope}, ${owner}, now() + interval '6 minutes')
    ON CONFLICT (scope) DO UPDATE SET owner = EXCLUDED.owner, expires_at = EXCLUDED.expires_at
    WHERE operation_leases.expires_at < now()
    RETURNING owner
  `);
  if (!result.rows.length) return null;
  return async () => {
    await db.execute(
      sql`DELETE FROM operation_leases WHERE scope = ${scope} AND owner = ${owner}`,
    );
  };
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
