/** Onder het inlogscherm van Clerk: we werken met een code per mail, en die belandt soms in spam. */
export default function InlogCodeTip() {
  return (
    <div className="mx-auto mt-4 max-w-[25rem] rounded-2xl border border-stone-200 bg-white px-5 py-4 text-sm leading-relaxed text-stone-600">
      <p className="font-semibold text-stone-800">📩 Je logt in met een code per mail</p>
      <p className="mt-1">
        Een wachtwoord heb je niet nodig. Zie je de code niet binnen een minuut? Kijk dan even in je{" "}
        <strong>spam</strong> of <strong>ongewenste mail</strong>. Nog steeds niets? Bel of mail Jos:{" "}
        <a href="mailto:jos@wordswap.nl" className="font-semibold text-emerald-800 underline underline-offset-2">
          jos@wordswap.nl
        </a>
        .
      </p>
    </div>
  );
}
