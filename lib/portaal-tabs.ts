/** Tabbladen van het portaal. Los van de client-schil (app/portal/PortaalSchil.tsx),
 * zodat ook de serverpagina ?tab= kan lezen. */
export const PORTAAL_TABS = ["website", "berichten", "account"] as const;
export type PortaalTab = (typeof PORTAAL_TABS)[number];

export function leesTab(ruw: string | undefined | null): PortaalTab {
  return (PORTAAL_TABS as readonly string[]).includes(ruw ?? "") ? (ruw as PortaalTab) : "website";
}
