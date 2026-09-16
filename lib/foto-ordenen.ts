import { parse, type DefaultTreeAdapterMap } from "parse5";

type Element = DefaultTreeAdapterMap["element"];
type Node = DefaultTreeAdapterMap["node"];

/** Directe acties op een foto in een reeks: weghalen of een plek opschuiven.
 * Bewust zonder AI en zonder de pagina opnieuw op te bouwen: we zoeken met een
 * echte HTML-lezer de exacte tekenposities op en knippen alleen daar. De rest
 * van het bestand blijft letterlijk zoals het was — opmaak, commentaar en
 * volgorde van attributen. */

type Kaart = { start: number; eind: number };

function isElement(n: Node): n is Element {
  return "tagName" in n;
}

function kinderen(n: Node): Element[] {
  return "childNodes" in n && n.childNodes
    ? (n.childNodes.filter(isElement) as Element[])
    : [];
}

function bevatAfbeelding(n: Element): boolean {
  if (n.tagName === "img") return true;
  return kinderen(n).some(bevatAfbeelding);
}

function attribuut(n: Element, naam: string): string | null {
  return n.attrs?.find((a) => a.name === naam)?.value ?? null;
}

/** Zoekt de foto en de "kaart" eromheen: het blok dat in de reeks herhaald
 * wordt (bijvoorbeeld de <figure> of de <a> om de foto). Geeft ook de andere
 * kaarten uit dezelfde reeks terug, op volgorde. */
export function vindFotoInReeks(html: string, src: string) {
  const doc = parse(html, { sourceCodeLocationInfo: true });
  const kaal = src.replace(/^https?:\/\/[^/]+/, "").replace(/^\/+/, "");
  let doel: Element | null = null;
  const ouders = new Map<Element, Element>();

  const loop = (n: Node) => {
    for (const k of kinderen(n)) {
      if (isElement(n)) ouders.set(k, n as Element);
      if (k.tagName === "img" && !doel) {
        const bron = (attribuut(k, "src") ?? "").replace(/^\/+/, "");
        if (bron === kaal || bron.endsWith("/" + kaal) || kaal.endsWith("/" + bron))
          doel = k;
      }
      loop(k);
    }
  };
  loop(doc);
  if (!doel) return null;

  // Omhoog lopen tot de ouder meerdere blokken met een foto bevat: dát is de
  // reeks, en het blok waar wij in zitten is onze kaart.
  let kaart: Element = doel;
  let reeks = ouders.get(kaart) ?? null;
  while (reeks) {
    const broertjes = kinderen(reeks).filter(bevatAfbeelding);
    if (broertjes.length > 1 && broertjes.includes(kaart)) {
      const posities = broertjes
        .map((b) => b.sourceCodeLocation)
        .filter((l): l is NonNullable<typeof l> => Boolean(l))
        .map((l) => ({ start: l.startOffset, eind: l.endOffset }));
      const eigen = kaart.sourceCodeLocation;
      if (!eigen) return null;
      const index = posities.findIndex((p) => p.start === eigen.startOffset);
      if (index === -1) return null;
      return { kaarten: posities, index };
    }
    kaart = reeks;
    reeks = ouders.get(kaart) ?? null;
  }
  // Losse foto zonder reeks: alleen verwijderen is zinvol
  const eigen = (doel as Element).sourceCodeLocation;
  if (!eigen) return null;
  return {
    kaarten: [{ start: eigen.startOffset, eind: eigen.endOffset }],
    index: 0,
  };
}

/** Haalt de kaart weg, inclusief de lege regel die overblijft. */
export function verwijderKaart(html: string, kaart: Kaart): string {
  let start = kaart.start;
  let eind = kaart.eind;
  // Witruimte ervoor meenemen tot aan het begin van de regel
  while (start > 0 && /[ \t]/.test(html[start - 1])) start--;
  if (html[eind] === "\n") eind++;
  else if (start > 0 && html[start - 1] === "\n") start--;
  return html.slice(0, start) + html.slice(eind);
}

/** Wisselt twee kaarten van plek. */
export function wisselKaarten(html: string, a: Kaart, b: Kaart): string {
  const [eerste, tweede] = a.start < b.start ? [a, b] : [b, a];
  return (
    html.slice(0, eerste.start) +
    html.slice(tweede.start, tweede.eind) +
    html.slice(eerste.eind, tweede.start) +
    html.slice(eerste.start, eerste.eind) +
    html.slice(tweede.eind)
  );
}
