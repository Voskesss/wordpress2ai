const { build } = require("esbuild");
const { serverActiesStub } = require("./hulp/server-acties-stub.cjs");
const { chromium } = require("playwright");
const { createServer } = require("node:http");
const fs = require("node:fs");
const assert = require("node:assert/strict");
(async () => {
  let server, browser;
  try {
    const bundle = await build({
      stdin: {
        contents: `import React from 'react';import {createRoot} from 'react-dom/client';import Chat from './app/portal/Chat';window.mountChat=(props)=>createRoot(document.getElementById('root')).render(<Chat {...props}/>);`,
        resolveDir: process.cwd(),
        loader: "tsx",
      },
      bundle: true,
      write: false,
      jsx: "automatic",
      platform: "browser",
      define: { "process.env.NODE_ENV": '"production"' },
      plugins: [serverActiesStub],
    });
    const css = (
      await require("postcss")([require("@tailwindcss/postcss")()]).process(
        fs.readFileSync("app/globals.css", "utf8"),
        { from: require("node:path").resolve("app/globals.css") },
      )
    ).css;
    server = createServer((req, res) => {
      res.setHeader(
        "Content-Type",
        req.url === "/app.js" ? "text/javascript" : "text/html",
      );
      res.end(
        req.url === "/app.js"
          ? bundle.outputFiles[0].text
          : "<style>" +
              css +
              '</style><div id="root"></div><script src="/app.js"></script>',
      );
    });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    browser = await chromium.launch();
    const page = await browser.newPage({
      viewport: { width: 390, height: 950 },
    });
    const handlers = {};
    const calls = [];
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("dialog", (d) => d.accept());
    await page.route("**/api/**", async (r) => {
      const path = new URL(r.request().url()).pathname;
      calls.push({ path, body: r.request().postData() });
      if (handlers[path]) return handlers[path](r);
      return r.fulfill({ contentType: "application/json", body: "{}" });
    });
    await page.route("**/site-weergave/**", (r) =>
      r.fulfill({ contentType: "text/html", body: "<h1>Voorbeeld</h1>" }),
    );
    const input = () =>
      page.getByRole("textbox", {
        name: "Beschrijf wat je op je website wilt aanpassen",
      });
    const alert = () => page.getByRole("alert");
    async function mount(extra = {}) {
      await page.goto("http://127.0.0.1:" + server.address().port);
      await page.evaluate((props) => window.mountChat(props), {
        siteId: 1,
        previewAccess: "fixture",
        historie: [{ rol: "klant", tekst: "Mijn eerdere vraag" }],
        ...extra,
      });
      await page
        .getByRole("button", { name: /Site aanpassen|Concept klaar — bekijk/ })
        .click();
    }
    await mount();
    handlers["/api/gesprek-nieuw"] = (r) =>
      r.fulfill({
        status: 503,
        contentType: "application/json",
        body: '{"error":"Opslaan mislukt"}',
      });
    await page
      .getByRole("button", { name: "🧹 Nieuw gesprek", exact: true })
      .click();
    await alert()
      .getByText(/Opslaan mislukt/)
      .waitFor();
    assert.equal(
      await page.getByText("Mijn eerdere vraag", { exact: true }).count(),
      1,
    );
    handlers["/api/gesprek-nieuw"] = (r) => r.abort("failed");
    await alert().getByRole("button", { name: "Opnieuw proberen" }).click();
    await alert()
      .getByText(/gesprek blijft hier zichtbaar/)
      .waitFor();
    assert.equal(
      await page.getByText("Mijn eerdere vraag", { exact: true }).count(),
      1,
    );
    handlers["/api/gesprek-nieuw"] = (r) =>
      r.fulfill({ contentType: "application/json", body: '{"ok":true}' });
    await alert().getByRole("button", { name: "Opnieuw proberen" }).click();
    await page.getByText(/Je nieuwe gesprek is gestart/).waitFor();
    assert.equal(
      await page.getByText("Mijn eerdere vraag", { exact: true }).count(),
      0,
    );
    // JSON errors are visible and the request is restored without auto-sending.
    handlers["/api/chat"] = (r) =>
      r.fulfill({
        status: 429,
        contentType: "application/json",
        body: '{"reply":"Je daglimiet is bereikt"}',
      });
    await input().fill("Verander de zaterdag naar 9 tot 16 uur");
    await page.getByRole("button", { name: "Verstuur", exact: true }).click();
    await alert()
      .getByText(/Je daglimiet is bereikt/)
      .waitFor();
    const before = calls.filter((c) => c.path === "/api/chat").length;
    await alert().getByRole("button", { name: "Opdracht terugzetten" }).click();
    assert.equal(
      await input().inputValue(),
      "Verander de zaterdag naar 9 tot 16 uur",
    );
    assert.equal(calls.filter((c) => c.path === "/api/chat").length, before);
    // Streaming failure pauses a queued request; uploaded photo is restored too.
    let release;
    handlers["/api/chat"] = (r) =>
      new Promise((resolve) => {
        release = async () => {
          await r.fulfill({
            contentType: "application/x-ndjson",
            body: '{"type":"klaar","failed":true,"reply":"Concept opslaan mislukt"}\n',
          });
          resolve();
        };
      });
    await page
      .locator("input[type=file]")
      .first()
      .setInputFiles({
        name: "voorbeeld.png",
        mimeType: "image/png",
        buffer: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jp1sAAAAASUVORK5CYII=",
          "base64",
        ),
      });
    // Sinds 02-10 kies je eerst de naam (naamkiezer); de voorgevulde naam is goed
    await page.getByRole("button", { name: "Uploaden", exact: true }).click();
    await page.getByRole("button", { name: /voorbeeld\.png verwijderen/ }).waitFor();
    await page.getByRole("button", { name: "Verstuur", exact: true }).click();
    await page
      .getByRole("button", { name: "Stop de wijziging", exact: true })
      .waitFor();
    await input().fill("Maak daarna de kop korter");
    await input().press("Enter");
    while (!release) await new Promise((r) => setTimeout(r, 10));
    await release();
    await alert()
      .getByText(/vervolgopdracht wacht/)
      .waitFor();
    const afterFailure = calls.filter((c) => c.path === "/api/chat").length;
    await alert().getByRole("button", { name: "Opdracht terugzetten" }).click();
    assert.equal(
      calls.filter((c) => c.path === "/api/chat").length,
      afterFailure,
    );
    const bodies = [];
    handlers["/api/chat"] = (r) => {
      bodies.push(r.request().postData());
      return r.fulfill({
        contentType: "application/x-ndjson",
        body: '{"type":"klaar","reply":"Wijziging ontvangen"}',
      });
    };
    await page.getByRole("button", { name: "Verstuur", exact: true }).click();
    await page
      .getByText("Wijziging ontvangen", { exact: true })
      .first()
      .waitFor();
    await page.waitForFunction(
      () => document.body.textContent.split("Wijziging ontvangen").length === 3,
    );
    assert.match(bodies[0], /filename="voorbeeld.png"/);
    assert.match(bodies[1], /Maak daarna de kop korter/);
    // Publication retry targets the same concept; a network error is not success.
    await mount({
      openConcept: {
        changeId: 42,
        previewUrl: "/site-weergave/fixture/",
        prompt: "Test",
        paginas: ["contact.html"],
      },
    });
    handlers["/api/publiceer"] = (r) => r.abort("failed");
    await page.getByRole("button", { name: "Publiceer", exact: true }).click();
    await alert()
      .getByText(/Geen bevestiging/)
      .waitFor();
    // Het concept staat nog open (niet als gepubliceerd behandeld). Op dit
    // telefoonformaat is dat de compacte conceptbalk (sinds 1.24.0); sinds
    // 05-10 staat weggooien daar onder de drie puntjes.
    await page
      .getByRole("button", { name: "Waar bestaat dit concept uit?" })
      .first()
      .waitFor();
    handlers["/api/publiceer"] = (r) =>
      r.fulfill({ contentType: "application/json", body: '{"ok":true}' });
    await alert().getByRole("button", { name: "Opnieuw proberen" }).click();
    await page.getByText(/Gepubliceerd! Je wijziging staat nu live, voor iedereen/).waitFor();
    assert.deepEqual(
      calls
        .filter((c) => c.path === "/api/publiceer")
        .map((c) => JSON.parse(c.body).changeId),
      [42, 42],
    );
    // Teamleden (04-10-2026): werkte een ander ook aan het concept, dan eerst
    // een waarschuwing; pas na "Alles publiceren" gaat het verzoek de deur uit.
    const concept = { changeId: 43, previewUrl: "/site-weergave/fixture/", prompt: "Test", paginas: ["contact.html"] };
    const publicaties = () => calls.filter((c) => c.path === "/api/publiceer").length;
    handlers["/api/concept-bijdragers"] = (r) =>
      r.fulfill({ contentType: "application/json", body: JSON.stringify({ anderen: [{ naam: "Lisa de Vries", wat: ["Zet de openingstijden op zaterdag tot 17:00"] }] }) });
    await mount({ openConcept: concept, metTeam: true });
    const voor = publicaties();
    await page.getByRole("button", { name: "Publiceer", exact: true }).click();
    const waarschuwing = page.getByRole("dialog", { name: "Let op: ook werk van anderen" });
    await waarschuwing.getByText("Lisa de Vries").waitFor();
    assert.ok(await waarschuwing.getByText(/openingstijden op zaterdag/).isVisible(), "team: wat de ander vroeg staat er niet bij");
    assert.equal(publicaties(), voor, "team: er werd al gepubliceerd vóór de bevestiging");
    await waarschuwing.getByRole("button", { name: "Nog niet" }).click();
    assert.equal(await waarschuwing.count(), 0, "team: Nog niet sluit de waarschuwing niet");
    assert.equal(publicaties(), voor, "team: Nog niet publiceerde toch");
    await page.getByRole("button", { name: "Publiceer", exact: true }).click();
    await waarschuwing.getByRole("button", { name: "Alles publiceren" }).click();
    await page.getByText(/Gepubliceerd!/).first().waitFor();
    assert.equal(publicaties(), voor + 1, "team: na Alles publiceren ging er niets de deur uit");
    // Niemand anders in het concept: gewoon meteen publiceren, geen vraag
    handlers["/api/concept-bijdragers"] = (r) => r.fulfill({ contentType: "application/json", body: '{"anderen":[]}' });
    await mount({ openConcept: concept, metTeam: true });
    const voor2 = publicaties();
    await page.getByRole("button", { name: "Publiceer", exact: true }).click();
    await page.getByText(/Gepubliceerd!/).first().waitFor();
    assert.equal(await page.getByRole("dialog", { name: "Let op: ook werk van anderen" }).count(), 0);
    assert.equal(publicaties(), voor2 + 1);
    // "Waar bestaat dit concept uit?" (05-10-2026): vanuit de gele strook een
    // venster met per stap wie, wat en welke pagina, dat op de telefoon scrolt
    const stappen = Array.from({ length: 12 }, (_, i) => ({
      naam: i % 2 ? "Piet" : "Lisa de Vries",
      jij: i % 2 === 1,
      wat: i === 0 ? "Zet de openingstijden op zaterdag tot 17:00" : `Stap ${i + 1}: maak de tekst over onderhoud wat korter en vriendelijker`,
      paginas: i === 0 ? ["contact.html", "afbeeldingen/x.webp"] : ["index.html"],
      tijd: "2026-10-05T09:00:00Z",
    }));
    handlers["/api/concept-bijdragers"] = (r) =>
      r.fulfill({ contentType: "application/json", body: JSON.stringify({ anderen: [], stappen }) });
    await mount({ openConcept: concept, magPubliceren: false, verbruik: { procent: 8 } });
    // Telefoon (05-10-2026): de gele strook blijft één compacte regel, ook met
    // de lange knop "Vraag eigenaar", en de kop van het gesprek loopt niet over
    const strook = page.getByRole("button", { name: "Waar bestaat dit concept uit?" }).first().locator("xpath=ancestor::div[contains(@class,'border-amber-400')][1]");
    const strookHoogte = await strook.evaluate((el) => el.getBoundingClientRect().height);
    assert.ok(strookHoogte <= 64, `telefoon: gele strook is ${strookHoogte}px hoog (max 64)`);
    for (const naam of ["🛟 Hulp", "🧹 Nieuw gesprek", "💬 Feedback"]) {
      const h = await page.getByRole("button", { name: naam, exact: true }).evaluate((el) => el.getBoundingClientRect().height);
      assert.ok(h <= 30, `telefoon: knop ${naam} loopt over twee regels (${h}px)`);
    }
    await page.screenshot({ path: "tests/.uitvoer/telefoon-strook.png" });
    await mount({ openConcept: concept });
    await page.getByRole("button", { name: "Waar bestaat dit concept uit?" }).first().click();
    const venster = page.getByRole("dialog", { name: "Waar bestaat dit concept uit?" });
    await venster.getByText("Lisa de Vries").first().waitFor();
    assert.ok(await venster.getByText("Jij", { exact: true }).first().isVisible(), "conceptvenster: eigen stap staat er niet als Jij");
    assert.ok(await venster.getByText(/openingstijden op zaterdag/).isVisible(), "conceptvenster: wat Lisa vroeg ontbreekt");
    assert.ok(await venster.getByText(/1 bestand/).isVisible(), "conceptvenster: bestanden die geen pagina zijn worden niet geteld");
    // Scrolt binnen het scherm: past niet, maar de laatste stap is bereikbaar
    const kader = venster.locator("> div");
    const maat = await kader.evaluate((el) => ({ scroll: el.scrollHeight, zicht: el.clientHeight, onder: el.getBoundingClientRect().bottom, scherm: window.innerHeight }));
    assert.ok(maat.scroll > maat.zicht, `conceptvenster: test heeft te weinig stappen om te scrollen (${maat.scroll}/${maat.zicht})`);
    assert.ok(maat.onder <= maat.scherm, "conceptvenster: loopt onder het scherm uit");
    await venster.getByText("Stap 12:").scrollIntoViewIfNeeded();
    assert.ok(await venster.getByText("Stap 12:", { exact: false }).isVisible(), "conceptvenster: laatste stap niet bereikbaar door te scrollen");
    assert.ok(await venster.getByRole("button", { name: "Sluiten", exact: true }).isVisible(), "conceptvenster: Sluiten niet bereikbaar");
    // Het kruisje bovenin blijft staan, ook na het scrollen
    assert.ok(await venster.getByRole("button", { name: "Venster sluiten" }).isVisible(), "conceptvenster: sluitkruisje scrolt weg");
    await page.screenshot({ path: "tests/.uitvoer/conceptvenster-gescrold.png" });
    await kader.evaluate((el) => el.scrollTo(0, 0));
    await page.screenshot({ path: "tests/.uitvoer/conceptvenster.png" });
    await venster.getByRole("button", { name: "contact" }).click();
    assert.equal(await venster.count(), 0, "conceptvenster: klik op een pagina sluit het venster niet");
    await page.waitForFunction(() => [...document.querySelectorAll("iframe")].some((f) => (f.getAttribute("src") || "").includes("contact.html")));
    // Ouder concept zonder stappen: dan de aangepaste pagina's van het concept
    handlers["/api/concept-bijdragers"] = (r) => r.fulfill({ contentType: "application/json", body: '{"anderen":[],"stappen":[]}' });
    await mount({ openConcept: concept });
    await page.getByRole("button", { name: "Waar bestaat dit concept uit?" }).first().click();
    await venster.getByText(/ouder dan het logboek/).waitFor();
    assert.ok(await venster.getByRole("button", { name: "contact" }).isVisible(), "conceptvenster: pagina's van een ouder concept ontbreken");
    await venster.getByRole("button", { name: "Venster sluiten" }).click();
    assert.equal(await venster.count(), 0, "conceptvenster: kruisje sluit niet");

    // Teamlid zonder publiceerrecht: de knop vraagt de eigenaar, publiceert nooit
    await mount({ openConcept: concept, metTeam: true, magPubliceren: false });
    const voor3 = publicaties();
    await page.getByRole("button", { name: "Vraag eigenaar", exact: true }).click();
    await page.getByText(/Laat het de eigenaar zelf even weten|eigenaar gevraagd/).first().waitFor();
    assert.equal(publicaties(), voor3, "teamlid zonder recht kon toch publiceren");
    await page.getByRole("button", { name: "Uitleg bij deze knoppen" }).click();
    await page.getByRole("button", { name: "Concept weggooien" }).first().click();
    await page.getByText(/weggooien kan alleen iemand die mag publiceren/).first().waitFor();
    assert.equal(calls.filter((c) => c.path === "/api/verwerp").length, 0, "teamlid zonder recht kon het concept weggooien");
    assert.deepEqual(errors, []);
    console.log(
      "PASS: failed new conversation preserves history; reset success; HTTP chat error; photo and draft recovery; queued edits pause after failure; publication retries the same concept; team warning before publishing others' work; teammate without rights asks the owner; concept window shows who changed which page and scrolls on a phone. No real APIs called.",
    );
  } finally {
    if (browser) await browser.close();
    if (server) await new Promise((r) => server.close(r));
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
