-- Additive migration. Apply to the verified DEV database first.
-- No customer records or existing constraints are changed.
CREATE TABLE IF NOT EXISTS operation_leases (
  scope text PRIMARY KEY,
  owner text NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS ai_budget_reservations (
  scope text NOT NULL,
  month text NOT NULL,
  reserved_micro_usd bigint NOT NULL DEFAULT 0,
  requests integer NOT NULL DEFAULT 0,
  PRIMARY KEY (scope, month)
);
