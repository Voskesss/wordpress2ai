/** Hoe samenwerken werkt. Bewust kort en overal hetzelfde: bij de eigenaar
 * in het teamblok én bij elk teamlid (Jos 04-10-2026: "dit moeten mensen
 * wel weten en snappen"). */
export default function TeamUitleg() {
  return (
    <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50/60 p-4 text-sm leading-relaxed text-violet-950">
      <p className="font-semibold">Zo werkt samenwerken</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>Iedereen werkt in <strong>hetzelfde concept</strong>. Vraagt Lisa iets en jij ook, dan staat het allebei in het concept.</li>
        <li><strong>Publiceren zet alles live</strong>, ook wat anderen vroegen. Zit er werk van een ander in, dan krijg je dat eerst te zien.</li>
        <li>Mag iemand niet zelf publiceren, dan vraagt hij of zij de eigenaar met één klik om het live te zetten.</li>
        <li>Alles staat met naam in het <strong>logboek</strong> hieronder.</li>
      </ul>
    </div>
  );
}
