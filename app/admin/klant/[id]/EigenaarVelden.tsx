/**
 * De verborgen velden die de afspraak-acties vertellen bij wie een blok of
 * afspraak hoort: een klant (siteId) of een potentiële klant uit de leadlijst
 * (leadId). Precies een van de twee, zoals de database het ook eist.
 */
export type Eigenaarschap = { siteId?: number; leadId?: number };

export default function EigenaarVelden({ siteId, leadId }: Eigenaarschap) {
  return (
    <>
      {siteId ? <input type="hidden" name="siteId" value={siteId} /> : null}
      {leadId ? <input type="hidden" name="leadId" value={leadId} /> : null}
    </>
  );
}
