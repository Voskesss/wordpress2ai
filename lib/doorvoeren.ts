/**
 * "Overal doorvoeren" als mechanische handeling: de vondsten van het
 * dubbeling-vangnet (oud → nieuw + plekken) letterlijk toepassen op de
 * genoemde bestanden, zonder AI-zoektocht die kan missen.
 *
 * De vangnet-fragmenten zijn GENORMALISEERDE tekst (witruimte samengevouwen,
 * rechte aanhalingstekens, gewone streepjes). In de ruwe HTML kan hetzelfde
 * fragment er nét anders staan (&nbsp;, regelovergang, &amp;). Daarom zoeken
 * we met een tolerant patroon dat die varianten als gelijk behandelt. Wat we
 * invoegen is de genormaliseerde nieuwe tekst — platte tekst, dus veilig.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { VangnetVondst } from "./consistentie";

/** Regex-patroon voor één genormaliseerd tekstfragment, tolerant voor de
 * varianten die kaleTekst() gelijktrekt. Exported voor de tests. */
export function tolerantPatroon(fragment: string): RegExp {
  const stukken = fragment.split(/\s+/).map((woord) =>
    [...woord]
      .map((teken) => {
        if (teken === "'") return "(?:['’‘]|&#39;|&apos;)";
        if (teken === '"') return '(?:["“”„]|&quot;)';
        if (teken === "-") return "[-–—]";
        if (teken === "&") return "(?:&(?!amp;)|&amp;)";
        return teken.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      })
      .join(""),
  );
  // Witruimte in het fragment mag in de HTML ook een regelovergang of
  // &nbsp; zijn (meerdere tegelijk), maar géén tags: we vervangen alleen
  // tekst die als één stuk in de bron staat.
  return new RegExp(stukken.join("(?:\\s|&nbsp;|&#160;)+"), "gu");
}

export type DoorvoerUitkomst = {
  /** Per gelukte vervanging: wat, waar en hoe vaak */
  gedaan: { oud: string; nieuw: string; pad: string; keer: number }[];
  /** Vondsten (of plekken) die mechanisch niet konden: geen nieuwe
   * tegenhanger bekend, of het fragment stond niet letterlijk in de bron */
  rest: { vondst: VangnetVondst; pad: string; reden: "geen-nieuw" | "niet-gevonden" }[];
};

export async function voerVondstenDoor(
  werkmap: string,
  vondsten: VangnetVondst[],
): Promise<DoorvoerUitkomst> {
  const uit: DoorvoerUitkomst = { gedaan: [], rest: [] };
  for (const vondst of vondsten) {
    for (const pad of vondst.paden) {
      if (!vondst.nieuw) {
        uit.rest.push({ vondst, pad, reden: "geen-nieuw" });
        continue;
      }
      const abs = path.join(werkmap, pad);
      const bron = await readFile(abs, "utf8").catch(() => null);
      if (bron === null) {
        uit.rest.push({ vondst, pad, reden: "niet-gevonden" });
        continue;
      }
      const patroon = tolerantPatroon(vondst.oud);
      const keer = (bron.match(patroon) ?? []).length;
      if (keer === 0) {
        uit.rest.push({ vondst, pad, reden: "niet-gevonden" });
        continue;
      }
      await writeFile(abs, bron.replace(patroon, () => vondst.nieuw!));
      uit.gedaan.push({ oud: vondst.oud, nieuw: vondst.nieuw, pad, keer });
    }
  }
  return uit;
}
