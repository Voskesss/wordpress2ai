/** "3 dagen geleden", voor lijsten in de admin. Zuiver: nu komt als argument
 * binnen, zodat dit te testen is. Rekent in kalenderdagen, Nederlandse tijd. */
export function geleden(iso: string | null | undefined, nu = new Date()): string {
  if (!iso) return "nooit";
  const toen = new Date(iso);
  if (Number.isNaN(toen.getTime())) return "nooit";
  const dag = (d: Date) => Date.parse(d.toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" }) + "T00:00:00Z");
  const dagen = Math.round((dag(nu) - dag(toen)) / 86_400_000);
  if (dagen <= 0) return "vandaag";
  if (dagen === 1) return "gisteren";
  if (dagen < 14) return `${dagen} dagen geleden`;
  if (dagen < 60) return `${Math.floor(dagen / 7)} weken geleden`;
  if (dagen < 365) return `${Math.floor(dagen / 30)} maanden geleden`;
  const jaren = Math.floor(dagen / 365);
  return `${jaren} jaar geleden`;
}

/** Aantal dagen sinds iso (voor kleur en sortering); null als er niets is. */
export function dagenSinds(iso: string | null | undefined, nu = new Date()): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : Math.max(0, Math.floor((nu.getTime() - t) / 86_400_000));
}
