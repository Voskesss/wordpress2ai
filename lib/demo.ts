import { createHash } from "node:crypto";

/** Korte, stabiele code per gebruiker — voor eigen demo-branch en -voorbeeldsite. */
export function demoCode(userId: string): string {
  return createHash("sha256").update(userId).digest("hex").slice(0, 8);
}

/** Persoonlijke werk-branch van een demo-gebruiker in de demo-repo. */
export function demoBranch(userId: string): string {
  return `demo-${demoCode(userId)}`;
}

/** Persoonlijke voorbeeld-worker van een demo-gebruiker (werkversie én "live"). */
export function demoWorker(repo: string, userId: string): string {
  return `wvd-${repo}-${demoCode(userId)}`.slice(0, 54);
}
