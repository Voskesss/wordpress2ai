import ActieKnop from "@/app/admin/klant/[id]/ActieKnop";
import { zetMeelezen } from "./acties";

/** Klein privacyregeltje onderin het portaal: meelezen aan- of uitzetten. */
export default function MeelezenRegel({ siteId, meelezenUit }: { siteId: number; meelezenUit: boolean }) {
  return (
    <form action={zetMeelezen} className="mt-3 flex flex-wrap items-center gap-2 text-xs text-stone-500">
      <input type="hidden" name="siteId" value={siteId} />
      <input type="hidden" name="uit" value={meelezenUit ? "0" : "1"} />
      <span>
        {meelezenUit
          ? "Meelezen door Jos om de hulp te verbeteren staat uit; bij een storing of supportvraag kan hij wel meekijken om je te helpen."
          : "Jos kan gesprekken meelezen om de hulp te verbeteren."}
      </span>
      <ActieKnop
        label={meelezenUit ? "Weer aanzetten" : "Meelezen uitzetten"}
        bezigLabel="Bezig..."
        klaarLabel="✓ Aangepast"
        className="font-semibold underline cursor-pointer"
      />
    </form>
  );
}
