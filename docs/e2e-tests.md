# Smoke-tests van het portaal (Playwright)

Doel: vóór elke push zelf controleren dat de kernflow werkt — bericht sturen,
concept, "Klopt het niet? Laat de AI zelf kijken", publiceren — zonder dat Jos
handmatig hoeft te kijken. De tests draaien op de probeer-demo (eigen sandbox per
gebruiker, elk uur opgeruimd), dus geen klantsite wordt geraakt.

## Eenmalige inrichting

1. In het Clerk-dashboard: de app WordSwap → **Development**-instantie → API keys.
   Kopieer `pk_test_…` en `sk_test_…`. (Nooit de live-sleutels: de tests weigeren die.)
2. Maak `.env.test` in de projectmap (staat in .gitignore):

   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_…
   CLERK_SECRET_KEY=sk_test_…
   E2E_CLERK_USER_EMAIL=e2e@wordswap.nl
   E2E_CLERK_USER_PASSWORD=<sterk wachtwoord>
   ```

3. Maak de testgebruiker aan in de Development-instantie (eenmalig):

   ```bash
   npx tsx --env-file=.env.test scripts/e2e-gebruiker.mts
   ```

Database en overige sleutels komen gewoon uit `.env.local`.

## Draaien

```bash
npm run test:e2e
```

Start zelf een dev-server op poort 3100, logt één keer in en draait de scenario's
in `tests/e2e/portaal.spec.ts` (± 2-3 minuten, kleine AI-kosten op het demo-model).
Bij een fout staan trace en schermafbeelding in `test-results/`.
