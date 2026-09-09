import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "../db/index";
import { claimOperation, reserveAiBudget, settleAiBudget } from "../lib/operation-guards";
if (process.env.CONFIRM_SEPARATE_DEV_DATABASE !== "yes" || !process.env.DEV_DATABASE_URL || process.env.DATABASE_URL !== process.env.DEV_DATABASE_URL) throw new Error("Alleen uitvoeren met de expliciete, bevestigde dev-configuratie.");
const scope = `integration-test:${randomUUID()}`;
const month = "2099-01";
try {
  const attempts = await Promise.all(Array.from({length: 8}, () => claimOperation(scope)));
  const winners = attempts.filter((r) => r !== null);
  assert.equal(winners.length, 1, "exactly one concurrent editor may acquire the lease");
  await winners[0]!();
  const old = await claimOperation(scope); assert.ok(old);
  await db.execute(sql`UPDATE operation_leases SET expires_at = now() - interval '1 second' WHERE scope = ${scope}`);
  const replacement = await claimOperation(scope); assert.ok(replacement);
  await old();
  assert.equal(await claimOperation(scope), null, "stale cleanup must not release another owner's lease");
  await replacement();
  const budget = await Promise.all(Array.from({length: 8}, () => reserveAiBudget(scope, 0.4, 1, month)));
  assert.equal(budget.filter(Boolean).length, 2, "concurrent reservations must respect monthly cap");
  await settleAiBudget(scope, month, 0.4, 0.1);
  assert.equal(await reserveAiBudget(scope, 0.4, 1, month), true);
  assert.equal(await reserveAiBudget(scope, 0.4, 1, month), false);
  console.log("PASS on Neon dev: concurrent leases, expiry, ownership-safe release, atomic budget cap and settlement.");
} finally {
  await db.execute(sql`DELETE FROM operation_leases WHERE scope = ${scope}`);
  await db.execute(sql`DELETE FROM ai_budget_reservations WHERE scope = ${scope} AND month = ${month}`);
}
