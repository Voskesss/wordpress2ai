/** Rem tegen schrijven naar échte klantsites vanaf de testomgeving.
 *
 * Dev en productie wijzen voor een klantsite naar dezelfde echte bestanden
 * (zelfde GitHub-repo, zelfde mediaopslag). Chatwijzigingen zijn veilig, die
 * blijven een concept tot er gepubliceerd wordt. Maar uploaden en opruimen in
 * de banken gaat direct live: een testupload op dev stond zo op de echte site
 * van Vakbeursonline (elkaar.pdf, 02-10). Buiten productie mag dat dus alleen
 * nog bij testsites. */

type SiteVoorRem = { isDemo: boolean; githubRepo: string };

/** Alleen de productie-uitrol op Vercel; dev, preview en lokaal tellen niet. */
export function isProductie(): boolean {
  return process.env.VERCEL_ENV === "production";
}

/** Eigen sites van WordSwap (geen klanten): daar test Jos bewust ook op dev,
 * omdat alleen een site met eigen domein een bestandslink geeft. Een repo
 * hier alleen toevoegen als Jos bevestigt dat het zijn eigen site is. */
export const EIGEN_SITES = new Set(["vakbeursonline"]);

/** Sites waar vanaf de testomgeving live geschreven mag worden: de demo,
 * repo's die op naam als test herkenbaar zijn (test-groene-golf,
 * test-infacilities, proefballon-test) en de eigen sites van WordSwap. */
export function isTestsite(site: SiteVoorRem): boolean {
  return site.isDemo || /^test-|-test$/.test(site.githubRepo) || EIGEN_SITES.has(site.githubRepo);
}

/** Mag deze actie direct naar de live site schrijven of daar iets wissen? */
export function magLiveSchrijven(site: SiteVoorRem): boolean {
  return isProductie() || isTestsite(site);
}

export const REM_MELDING =
  "Dit is de testomgeving. Uploaden of opruimen in een bank gaat hier niet door voor een echte klantsite, want dat zou meteen op zijn live website staan. Test dit op een testsite (bijvoorbeeld test-groene-golf) of doe het op productie.";
