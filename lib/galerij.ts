/**
 * Fotogalerijen bij de migratie mechanisch bouwen. Een pagina met veel foto's
 * (albums van een fotograaf, projectoverzichten) krijgt zijn grid kant-en-klaar
 * als centraal onderdeel in delen/galerij-<slug>.html; de AI plaatst alleen de
 * marker en bouwt de rest van de pagina eromheen. Zo hoeft de AI nooit zestig
 * img-tags uit te typen en is er geen plafond meer aan het aantal foto's.
 * Zuivere functies, zodat ze los te testen zijn.
 */

export type PaginaBeeld = { src: string; alt: string };
export type GalerijFoto = { bestand: string; alt: string };
export type Galerij = { pad: string; slug: string; fotos: GalerijFoto[] };

/** Vanaf dit aantal foto's op één pagina bouwen we het grid zelf. */
export const GALERIJ_DREMPEL = 12;

export function galerijSlug(pad: string): string {
  const slug = pad
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "home";
}

/**
 * Welke pagina's krijgen een kant-en-klaar grid, en met welke foto's.
 * Achtergronden, iconen (svg/gif) en beelden die op vrijwel elke pagina staan
 * (logo, social-iconen) tellen niet mee — dat is de "chrome" van de site.
 */
export function kiesGalerijPaginas(
  perPagina: Record<string, PaginaBeeld[]>,
  mediaMap: Record<string, string>,
  titels: Record<string, string> = {},
  drempel = GALERIJ_DREMPEL,
): Galerij[] {
  const paginas = Object.keys(perPagina);
  if (paginas.length === 0) return [];

  // Per pagina de gedownloade foto's (op bestand, in volgorde, zonder dubbelen)
  const perPaginaBestanden = new Map<string, GalerijFoto[]>();
  const opAantalPaginas = new Map<string, number>();
  for (const pad of paginas) {
    const gezien = new Set<string>();
    const lijst: GalerijFoto[] = [];
    for (const beeld of perPagina[pad] ?? []) {
      if (beeld.alt === "(achtergrond)") continue;
      if (/\.(svg|gif)([?#]|$)/i.test(beeld.src)) continue;
      const bestand = mediaMap[beeld.src];
      if (!bestand || gezien.has(bestand)) continue;
      gezien.add(bestand);
      const alt = beeld.alt === "(slider/lazy)" ? "" : beeld.alt.trim();
      lijst.push({ bestand, alt });
    }
    perPaginaBestanden.set(pad, lijst);
    for (const f of lijst) opAantalPaginas.set(f.bestand, (opAantalPaginas.get(f.bestand) ?? 0) + 1);
  }

  // Sitebreed beeld = staat op meer dan de helft van de pagina's (en op minstens 3)
  const chromeGrens = Math.max(3, Math.ceil(paginas.length / 2));
  const isChrome = (bestand: string) => paginas.length >= 3 && (opAantalPaginas.get(bestand) ?? 0) >= chromeGrens;

  const galerijen: Galerij[] = [];
  for (const pad of paginas) {
    const titel = titels[pad]?.trim();
    const fotos = (perPaginaBestanden.get(pad) ?? [])
      .filter((f) => !isChrome(f.bestand))
      .map((f, i) => ({ bestand: f.bestand, alt: f.alt || `${titel || "Foto"} ${i + 1}` }));
    if (fotos.length >= drempel) galerijen.push({ pad, slug: galerijSlug(pad), fotos });
  }
  return galerijen;
}

function ontsnap(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Het grid als HTML-fragment: responsief, lazy loading, en klikken opent de
 * foto groot in een <dialog>. Stijl en script zitten in het fragment zelf,
 * zodat het werkt ongeacht wat de AI in stijl.css zet.
 */
export function maakGalerijFragment(fotos: GalerijFoto[]): string {
  const items = fotos
    .map(
      (f) =>
        `<a href="${ontsnap(f.bestand)}" class="ws-galerij-item"><img src="${ontsnap(f.bestand)}" alt="${ontsnap(f.alt)}" loading="lazy" decoding="async"></a>`,
    )
    .join("\n");
  return `<!-- Fotogalerij: automatisch opgebouwd bij de migratie (${fotos.length} foto's uit afbeeldingen/). Foto toevoegen = een regel erbij in het grid. -->
<section class="ws-galerij" aria-label="Fotogalerij">
<style>
.ws-galerij-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}
.ws-galerij-item{display:block;aspect-ratio:3/2;overflow:hidden;border-radius:6px;background:#eee}
.ws-galerij-item img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .3s}
.ws-galerij-item:hover img{transform:scale(1.03)}
.ws-galerij-groot{border:0;padding:0;background:transparent;max-width:min(96vw,1600px);max-height:96vh;cursor:zoom-out}
.ws-galerij-groot::backdrop{background:rgba(0,0,0,.88)}
.ws-galerij-groot img{max-width:96vw;max-height:96vh;display:block;border-radius:4px}
</style>
<div class="ws-galerij-grid">
${items}
</div>
<dialog class="ws-galerij-groot"><img alt=""></dialog>
<script>
(function(){var s=document.currentScript.parentElement,d=s.querySelector('.ws-galerij-groot'),g=d.querySelector('img');
s.querySelectorAll('.ws-galerij-item').forEach(function(a){a.addEventListener('click',function(e){e.preventDefault();g.src=a.getAttribute('href');g.alt=a.querySelector('img').alt;d.showModal();});});
d.addEventListener('click',function(){d.close();});})();
</script>
</section>
`;
}
