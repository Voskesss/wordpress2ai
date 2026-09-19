/**
 * Afspraken die vroeger alleen als prompttekst bestonden, hier afgedwongen in
 * code — na élke chatbeurt, op de bestanden die deze beurt aanraakte. Een
 * regel in tekst is een hoop; dezelfde regel hier is een garantie, en mag
 * daarna uit de instructie (korter én strenger tegelijk).
 *
 * Twee smaken:
 * - herstelAfspraken: wat mechanisch te repareren is, wordt stil gerepareerd
 *   (formulier-adres, verplichte verborgen velden, honeypot, enctype, lazy
 *   loading). De AI hoeft het niet perfect te doen; wij maken het af.
 * - afsprakenMeldingen: wat niet te verzinnen valt (alt-teksten, de naam van
 *   een formulier, een verwijzing naar een onbestaand deel) gaat als één
 *   herstelbeurt terug naar de AI — zelfde patroon als de mobielcontrole.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const FORMULIER_ADRES = "https://wordswap.nl/api/formulier";

function formulieren(html: string): { heel: string; start: number }[] {
  const uit: { heel: string; start: number }[] = [];
  const re = /<form\b[\s\S]*?<\/form>/gi;
  for (const m of html.matchAll(re)) uit.push({ heel: m[0], start: m.index ?? 0 });
  return uit;
}

/** Stil te repareren afspraken. Geeft terug wat er is rechtgezet. */
export async function herstelAfspraken(
  werkmap: string,
  gewijzigd: string[],
  siteCode: string,
): Promise<string[]> {
  const gedaan: string[] = [];
  for (const rel of gewijzigd) {
    if (!/\.html?$/i.test(rel)) continue;
    const abs = path.join(werkmap, rel);
    let html = await readFile(abs, "utf8").catch(() => null);
    if (html === null) continue;
    const voor = html;

    for (const f of formulieren(html)) {
      // Alleen formulieren die (bedoeld) op ons systeem posten
      if (!/api\/formulier/.test(f.heel) && !/_formulier/.test(f.heel)) continue;
      let nieuw = f.heel;

      // 1. Verzendadres: altijd het volledige adres (een verkort pad komt bij
      //    de site van de klant terecht en geeft "methode niet toegestaan")
      const actie = nieuw.match(/action=["']([^"']*)["']/);
      if (actie && actie[1] !== FORMULIER_ADRES && /api\/formulier/.test(actie[1])) {
        nieuw = nieuw.replace(actie[0], `action="${FORMULIER_ADRES}"`);
        gedaan.push(`formulier-adres rechtgezet op ${rel}`);
      }

      // 2. Verplicht verborgen veld _site (waarde kennen wij, de AI soms niet)
      if (!/name=["']_site["']/.test(nieuw)) {
        nieuw = nieuw.replace(
          /<\/form>/i,
          `  <input type="hidden" name="_site" value="${siteCode}">\n</form>`,
        );
        gedaan.push(`veld _site toegevoegd op ${rel}`);
      }

      // 3. Honeypot tegen spam
      if (!/name=["']_extra["']/.test(nieuw)) {
        nieuw = nieuw.replace(
          /<\/form>/i,
          `  <input type="text" name="_extra" value="" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true">\n</form>`,
        );
        gedaan.push(`honeypot toegevoegd op ${rel}`);
      }

      // 4. Bestandsveld zonder enctype: upload komt anders leeg aan
      if (/type=["']file["']/i.test(nieuw) && !/enctype=/i.test(nieuw)) {
        nieuw = nieuw.replace(/<form\b/i, '<form enctype="multipart/form-data"');
        gedaan.push(`enctype toegevoegd op ${rel}`);
      }

      if (nieuw !== f.heel) html = html.replace(f.heel, nieuw);
    }

    // 5. Nieuwe afbeeldingen lui laden, behalve de eerste (hero) van de pagina
    let eersteGezien = false;
    html = html.replace(/<img\b[^>]*>/gi, (tag) => {
      const isEerste = !eersteGezien;
      eersteGezien = true;
      if (isEerste || /\bloading=/.test(tag)) return tag;
      gedaan.push(`lazy loading toegevoegd op ${rel}`);
      return tag.replace(/^<img/i, '<img loading="lazy" decoding="async"');
    });

    if (html !== voor) await writeFile(abs, html);
  }
  return gedaan;
}

/** Niet te verzinnen: dit gaat als één herstelbeurt terug naar de AI. */
export async function afsprakenMeldingen(
  werkmap: string,
  gewijzigd: string[],
): Promise<string[]> {
  const meldingen: string[] = [];
  const { access } = await import("node:fs/promises");
  for (const rel of gewijzigd) {
    if (!/\.html?$/i.test(rel)) continue;
    const html = await readFile(path.join(werkmap, rel), "utf8").catch(() => null);
    if (html === null) continue;

    // Afbeeldingen zonder alt-tekst (of met een leeg alt op een inhoudsfoto)
    for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
      if (!/\balt=["'][^"']+["']/.test(m[0])) {
        const src = m[0].match(/src=["']([^"']+)["']/)?.[1] ?? "(onbekend)";
        meldingen.push(`${rel}: de afbeelding ${src} heeft geen alt-tekst — beschrijf kort wat erop staat`);
      }
    }

    // Formulieren zonder _formulier of _bedankt: daar hangt de bevestigingsmail aan
    for (const f of formulieren(html)) {
      if (!/api\/formulier|_formulier/.test(f.heel)) continue;
      if (!/name=["']_formulier["']/.test(f.heel))
        meldingen.push(`${rel}: het formulier mist het verborgen veld _formulier (korte kebab-naam voor het doel, bv. "offerte")`);
      if (!/name=["']_bedankt["']/.test(f.heel))
        meldingen.push(`${rel}: het formulier mist het verborgen veld _bedankt (pad van de bedankt-pagina, bv. "/bedankt/")`);
    }

    // Invoeg-markers die naar een onbestaand deel wijzen
    for (const m of html.matchAll(/<!--\s*invoeg:([a-z0-9-]+)\s*-->/gi)) {
      const deel = path.join(werkmap, "delen", `${m[1]}.html`);
      const bestaat = await access(deel).then(() => true, () => false);
      if (!bestaat)
        meldingen.push(`${rel}: de marker invoeg:${m[1]} wijst naar delen/${m[1]}.html, maar dat bestand bestaat niet`);
    }
  }
  return meldingen;
}
