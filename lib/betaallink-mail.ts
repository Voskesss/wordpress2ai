import { handtekening } from "@/lib/mailer";
import { euroTekst, inclBtwCent } from "@/lib/mollie";
import { ontsnap } from "@/lib/wordswap-mail";

/** De betaallink-mail zoals de klant hem krijgt; ook gebruikt voor het voorbeeld in de admin. */
export function bouwBetaallinkMail(o: {
  naam: string;
  maandbedragCent: number;
  eenmaligCent: number;
  betaallink: string;
}): { onderwerp: string; html: string } {
  const eersteIncl = inclBtwCent(o.maandbedragCent + o.eenmaligCent);
  const uitleg =
    o.eenmaligCent > 0
      ? `<p>Via de knop hieronder betaal je in één keer de omzetting van je website (${euroTekst(o.eenmaligCent)}) en je eerste maand hosting, beheer en AI-portaal (${euroTekst(o.maandbedragCent)}). Samen is dat <strong>${euroTekst(eersteIncl)} inclusief btw</strong>.</p>
<p>Daarna wordt alleen het maandbedrag van ${euroTekst(o.maandbedragCent)} (${euroTekst(inclBtwCent(o.maandbedragCent))} inclusief btw) automatisch afgeschreven.</p>`
      : `<p>Via de knop hieronder start je je maandbedrag van <strong>${euroTekst(o.maandbedragCent)} per maand</strong> (${euroTekst(eersteIncl)} inclusief btw) voor hosting, beheer en het AI-portaal.</p>`;
  return {
    onderwerp: "Je betaling voor WordSwap, opdrachtbevestiging bijgesloten",
    html: `<p>Beste ${ontsnap(o.naam.split(" ")[0])},</p>
<p>Fijn dat je gebruik wilt maken van WordSwap!</p>
${uitleg}
<p><a href="${o.betaallink}" style="display:inline-block;background:#31956B;color:#fff !important;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:600"><span style="color:#fff !important;text-decoration:none">Betalen via iDEAL</span></a></p>
<p>In de bijlage vind je de opdrachtbevestiging: wat we leveren, wat het kost en welke afspraken erbij horen. Door te betalen ga je daarmee akkoord, en met de <a href="https://wordswap.nl/voorwaarden">algemene voorwaarden</a> en de <a href="https://wordswap.nl/verwerkersovereenkomst">verwerkersovereenkomst</a>.</p>
<p>Met deze betaling geef je ook toestemming om het maandbedrag voortaan automatisch af te schrijven, zodat je er verder niet meer aan hoeft te denken. Je krijgt bij elke betaling automatisch een factuur. Opzeggen kan altijd per maand: een mailtje is genoeg.</p>
<p>Met vriendelijke groet,</p>${handtekening(false)}`,
  };
}
