// Browsertest van het portaal zoals de klant het ziet: de vaste balk met
// tabbladen, de werkweergave eronder en de vier banken. Echte Chromium, echte
// CSS (Tailwind), nagebootste server. Aanleiding 01-10-2026: op dev viel het
// typveld weg onder de balk (eerst half, daarna helemaal), en in de
// documentenbank werd een naam afgekapt tot "rapp...". Zulke dingen zie je
// alleen in een browser, niet in een broncode-test.
// Draaien: node tests/portaal-ui.cjs  (schermafbeeldingen in tests/.uitvoer/)
const { build } = require("esbuild");
const { serverActiesStub } = require("./hulp/server-acties-stub.cjs");
const { chromium } = require("playwright");
const { createServer } = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

// Clerk en next/link bestaan buiten Next niet: vervang ze door eenvoudige stand-ins
const buitenNext = {
  name: "buiten-next",
  setup(b) {
    b.onResolve({ filter: /^@clerk\/nextjs$/ }, () => ({ path: "clerk", namespace: "stub" }));
    b.onResolve({ filter: /^next\/link$/ }, () => ({ path: "link", namespace: "stub" }));
    b.onLoad({ filter: /^clerk$/, namespace: "stub" }, () => ({
      contents: `import React from "react"; export const UserButton = () => React.createElement("span", { "data-test": "account", style: { display: "inline-block", width: 28, height: 28, borderRadius: 14, background: "#999", flexShrink: 0 } });`,
      loader: "jsx",
      resolveDir: process.cwd(),
    }));
    b.onLoad({ filter: /^link$/, namespace: "stub" }, () => ({
      contents: `import React from "react"; export default function Link(p) { return React.createElement("a", p); }`,
      loader: "jsx",
      resolveDir: process.cwd(),
    }));
  },
};

// Het invoerveld van de chat (er is ook een typveld voor een hulpvraag)
const VELD = "textarea.leading-snug";
const LANG = "rapport-mediation-scheiden-met-kinderen-versie-definitief-2025.pdf";
const uitvoer = path.join(__dirname, ".uitvoer");

(async () => {
  let server, browser;
  try {
    fs.mkdirSync(uitvoer, { recursive: true });
    const bundle = await build({
      stdin: {
        contents: `
          import React from "react";
          import { createRoot } from "react-dom/client";
          import PortaalSchil from "./app/portal/PortaalSchil";
          import Chat from "./app/portal/Chat";
          import DocumentBank from "./app/portal/DocumentBank";
          import Fotobank from "./app/portal/Fotobank";
          import AudioBank from "./app/portal/AudioBank";
          import VideoBank from "./app/portal/VideoBank";
          const wortel = () => createRoot(document.getElementById("root"));
          window.mountPortaal = (beginTab) => wortel().render(
            <PortaalSchil isDev={false} isAdmin={false} meerdereSites={false} siteNaam="Van den Berg Mediation" metTabs beginTab={beginTab}
              website={<div className="mx-auto max-w-[1500px] px-2 sm:px-6 py-4 sm:py-10"><Chat metBalk siteId={1} previewAccess="fixture" historie={[{ rol: "klant", tekst: "Mijn eerdere vraag" }, { rol: "assistent", tekst: "Gedaan." }]} /></div>}
              berichten={<div id="berichten-inhoud">Berichten en mail</div>}
              account={<div id="account-inhoud">Account</div>} />);
          const bank = (el) => wortel().render(<div style={{ position: "relative", height: "860px" }}>{el}</div>);
          window.mountBank = (soort) => {
            const leeg = () => {};
            if (soort === "document") bank(<DocumentBank siteId={1} previewAccess="fixture" onGebruik={leeg} onSluit={leeg} />);
            if (soort === "foto") bank(<Fotobank siteId={1} magUploaden onOpdracht={leeg} previewAccess="fixture" onKlaar={leeg} onSluit={leeg} onGebruik={leeg} gekozen={[]} />);
            if (soort === "audio") bank(<AudioBank siteId={1} onGebruik={leeg} onSluit={leeg} />);
            if (soort === "video") bank(<VideoBank siteId={1} previewAccess="fixture" onGebruik={leeg} onSluit={leeg} onUpload={leeg} />);
          };`,
        resolveDir: process.cwd(),
        loader: "tsx",
      },
      bundle: true,
      write: false,
      jsx: "automatic",
      platform: "browser",
      define: { "process.env.NODE_ENV": '"production"' },
      plugins: [serverActiesStub, buitenNext],
    });
    const css = (
      await require("postcss")([require("@tailwindcss/postcss")()]).process(fs.readFileSync("app/globals.css", "utf8"), {
        from: path.resolve("app/globals.css"),
      })
    ).css;
    server = createServer((req, res) => {
      res.setHeader("Content-Type", req.url === "/app.js" ? "text/javascript" : "text/html");
      res.end(req.url === "/app.js" ? bundle.outputFiles[0].text : `<style>${css}</style><div id="root"></div><script src="/app.js"></script>`);
    });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    const basis = `http://127.0.0.1:${server.address().port}/`;
    browser = await chromium.launch();

    const nepServer = async (page) => {
      await page.route("**/api/**", (r) => {
        const p = new URL(r.request().url()).pathname;
        const json = (o) => r.fulfill({ contentType: "application/json", body: JSON.stringify(o) });
        if (p === "/api/documentbank")
          return json({
            documenten: [
              { pad: `bestanden/${LANG}`, kb: 1352, inGebruik: true, adres: `https://voorbeeld.nl/bestanden/${LANG}`, live: true, linkTeksten: ["Download het rapport"] },
              { pad: "bestanden/vacature.pdf", kb: 63, inGebruik: false, adres: "https://voorbeeld.nl/bestanden/vacature.pdf", live: false },
            ],
          });
        if (p === "/api/fotobank")
          return json({ afbeeldingen: [{ pad: "afbeeldingen/kantoor-lisse-voorkant.webp", stam: "afbeeldingen/kantoor-lisse-voorkant.webp", grootte: 120000, inGebruik: true, adres: "https://voorbeeld.nl/afbeeldingen/kantoor-lisse-voorkant.webp", live: true, alt: { teksten: ["Kantoor in Lisse, voorkant"], zonder: 1, leeg: 0 } }, { pad: "afbeeldingen/team.webp", stam: "afbeeldingen/team.webp", grootte: 90000, inGebruik: false, adres: "https://voorbeeld.nl/afbeeldingen/team.webp", live: true }] });
        if (p === "/api/audiobank" && !new URL(r.request().url()).searchParams.get("bestand"))
          return json({ audio: ["aflevering-1.mp3", "aflevering-2.mp3"], limiet: 10, links: { "aflevering-1.mp3": { adres: "https://voorbeeld.nl/audio/aflevering-1.mp3", live: true }, "aflevering-2.mp3": { adres: "https://voorbeeld.nl/audio/aflevering-2.mp3", live: false } } });
        if (p === "/api/videobank" && !new URL(r.request().url()).searchParams.get("bestand"))
          return json({ videos: [{ pad: "video/rondleiding.mp4", poster: null, mb: 12, inGebruik: false, bron: "media", adres: "https://voorbeeld.nl/video/rondleiding.mp4", live: true }, { pad: "video/uitleg-mediation.mp4", poster: null, mb: 8, inGebruik: true, bron: "media", adres: "https://voorbeeld.nl/video/uitleg-mediation.mp4", live: false }], gebruikt: 1, limiet: 5 });
        return json({});
      });
      await page.route("**/site-weergave/**", (r) => r.fulfill({ contentType: "text/html", body: "<h1>Voorbeeld</h1>" }));
    };

    const fouten = [];
    const nieuwePagina = async (breedte, hoogte) => {
      const page = await browser.newPage({ viewport: { width: breedte, height: hoogte } });
      page.on("pageerror", (e) => fouten.push(`${breedte}x${hoogte}: ${e.message}`));
      await nepServer(page);
      await page.goto(basis);
      return page;
    };

    /** Meet balk, werkweergave en typveld. */
    const meet = (page) =>
      page.evaluate((sel) => {
        const balk = document.querySelector('nav[aria-label="Portaal"]').getBoundingClientRect();
        const veld = document.querySelector(sel);
        const v = veld.getBoundingClientRect();
        const werk = veld.closest(".fixed");
        const kolom = [...document.querySelectorAll("div")].find((d) => d.className.includes("w-[26rem]"));
        return {
          balkBoven: balk.top,
          balkHoogte: balk.height,
          werkBoven: werk ? werk.getBoundingClientRect().top : null,
          veldBoven: v.top,
          veldOnder: v.bottom,
          veldHoogte: v.height,
          zichtbaar: veld.offsetParent !== null,
          tekst: veld.getAttribute("placeholder"),
          schermHoogte: innerHeight,
          kolomTeBreed: kolom ? kolom.scrollWidth - kolom.clientWidth : 0,
        };
      }, VELD);

    // 1. Breed en laag scherm: werkweergave onder de balk, typveld heel in beeld
    for (const [b, h] of [
      [1440, 900],
      [1280, 720],
      [1366, 640],
    ]) {
      const page = await nieuwePagina(b, h);
      await page.evaluate(() => window.mountPortaal("website"));
      await page.waitForSelector(VELD, { state: "attached" });
      await page.waitForTimeout(300);
      const m = await meet(page);
      const wat = `${b}x${h}`;
      assert.equal(m.balkBoven, 0, `${wat}: de balk staat niet bovenaan`);
      assert.equal(m.balkHoogte, 56, `${wat}: de balk is niet 56 hoog`);
      assert.equal(m.werkBoven, 56, `${wat}: de werkweergave begint niet onder de balk (${m.werkBoven})`);
      assert.ok(m.zichtbaar && m.veldHoogte >= 36, `${wat}: typveld te laag of onzichtbaar (${m.veldHoogte}px)`);
      assert.ok(m.veldBoven >= 56 && m.veldOnder <= m.schermHoogte, `${wat}: typveld valt buiten beeld (${m.veldBoven}-${m.veldOnder} van ${m.schermHoogte})`);
      assert.ok(/Wat wil je aanpassen/.test(m.tekst ?? ""), `${wat}: geen voorbeeldtekst in het typveld`);
      assert.ok(m.kolomTeBreed <= 1, `${wat}: de chatkolom is ${m.kolomTeBreed}px te breed (horizontale schuifbalk)`);
      await page.screenshot({ path: path.join(uitvoer, `portaal-${wat}.png`) });
      await page.close();
    }

    // 2. Beginnen op Berichten, dan naar de website: het typveld mag niet 0 hoog blijven
    {
      const page = await nieuwePagina(1440, 900);
      await page.evaluate(() => window.mountPortaal("berichten"));
      await page.waitForSelector("#berichten-inhoud");
      assert.ok(await page.isVisible("#berichten-inhoud"), "het tabblad Berichten is niet zichtbaar");
      assert.ok(!(await page.isVisible(VELD)), "de chat is zichtbaar terwijl Berichten open staat");
      await page.getByRole("tab", { name: /Website bewerken/ }).click();
      await page.waitForTimeout(300);
      const m = await meet(page);
      assert.ok(m.zichtbaar && m.veldHoogte >= 36, `na wisselen van tabblad is het typveld ${m.veldHoogte}px hoog`);
      assert.ok(!(await page.isVisible("#berichten-inhoud")), "Berichten blijft zichtbaar na wisselen");
      assert.ok(page.url().endsWith("/") || !page.url().includes("tab=berichten"), "het adres houdt tab=berichten na wisselen");
      await page.screenshot({ path: path.join(uitvoer, "portaal-na-wisselen.png") });
      await page.close();
    }

    // 3. Telefoon: balk zichtbaar en past (ook op een smalle 360), werkweergave
    //    eronder, typveld in beeld in de chat
    for (const smal of [360, 390]) {
      const page = await nieuwePagina(smal, 760);
      await page.evaluate(() => window.mountPortaal("website"));
      await page.waitForSelector(VELD, { state: "attached" });
      const balk = await page.evaluate(() => {
        const nav = document.querySelector('nav[aria-label="Portaal"] > div');
        const logo = nav.querySelector("a").getBoundingClientRect();
        const tabs = [...nav.querySelectorAll('[role="tab"]')].map((t) => t.getBoundingClientRect());
        const lijst = nav.querySelector('[role="tablist"]');
        const account = document.querySelector('[data-test="account"]').getBoundingClientRect();
        return {
          teBreed: nav.scrollWidth - nav.clientWidth,
          tabsTeBreed: lijst.scrollWidth - lijst.clientWidth,
          logoRaaktTab: logo.right > tabs[0].left + 1,
          tabRaaktAccount: tabs[tabs.length - 1].right > account.left + 1,
          accountRechts: account.right,
          pagina: document.documentElement.scrollWidth - innerWidth,
        };
      });
      assert.ok(balk.teBreed <= 1 && balk.tabsTeBreed <= 1 && balk.accountRechts <= smal, `${smal}px: de balk loopt over (${JSON.stringify(balk)})`);
      assert.ok(!balk.logoRaaktTab && !balk.tabRaaktAccount, `${smal}px: onderdelen van de balk overlappen (${JSON.stringify(balk)})`);
      assert.ok(balk.pagina <= 1, `${smal}px: de pagina schuift horizontaal (${balk.pagina}px)`);
      await page.screenshot({ path: path.join(uitvoer, `balk-${smal}.png`), clip: { x: 0, y: 0, width: smal, height: 60 } });
      await page.close();
    }
    {
      const page = await nieuwePagina(390, 844);
      await page.evaluate(() => window.mountPortaal("website"));
      await page.waitForSelector(VELD, { state: "attached" });
      const chatKnop = page.getByRole("button", { name: /💬 Chat/ });
      if (await chatKnop.count()) await chatKnop.first().click();
      await page.waitForTimeout(300);
      const m = await meet(page);
      assert.equal(m.werkBoven, 56, `telefoon: werkweergave begint niet onder de balk (${m.werkBoven})`);
      assert.ok(m.zichtbaar && m.veldHoogte >= 36 && m.veldOnder <= m.schermHoogte, `telefoon: typveld niet goed in beeld (${m.veldHoogte}px, onder ${m.veldOnder})`);
      assert.ok(await page.getByRole("tab", { name: /Berichten/ }).isVisible(), "telefoon: tabbladen niet zichtbaar");
      await page.screenshot({ path: path.join(uitvoer, "portaal-telefoon.png") });
      await page.close();
    }

    // 3b. Gewone upload in de chat (paperclip): eerst de naam kiezen, dan gaat
    //     de foto met die naam mee
    {
      const page = await nieuwePagina(1440, 900);
      await page.evaluate(() => window.mountPortaal("website"));
      await page.waitForSelector(VELD, { state: "attached" });
      await page.locator('input[type="file"][accept*="image/*"]').first().setInputFiles({ name: "IMG 2041.JPG", mimeType: "image/jpeg", buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) });
      const naam = page.getByRole("textbox", { name: "Naam voor IMG 2041.JPG" });
      await naam.waitFor();
      assert.equal(await naam.inputValue(), "img-2041", "chat: de naam is niet voorgevuld");
      assert.ok(await page.getByText(".webp").first().isVisible(), "chat: foto's worden webp, dat staat er niet bij");
      await naam.fill("Kantoor Lisse voorkant");
      assert.ok(await page.getByText("Wordt: kantoor-lisse-voorkant.webp").isVisible(), "chat: de schone naam wordt niet getoond");
      await page.screenshot({ path: path.join(uitvoer, "naamkiezer-chat.png") });
      await page.getByRole("button", { name: "Uploaden", exact: true }).click();
      await page.getByRole("button", { name: /kantoor-lisse-voorkant\.jpg verwijderen/ }).waitFor({ timeout: 5000 });
      assert.ok(!(await page.getByRole("textbox", { name: "Naam voor IMG 2041.JPG" }).count()), "chat: de naamkiezer blijft staan na uploaden");
      await page.close();
    }

    // 4. De banken: openbaar-melding, uploadknop, zoeken, link alleen als hij werkt
    for (const soort of ["document", "foto", "audio", "video"]) {
      const page = await nieuwePagina(1280, 900);
      await page.evaluate((s) => window.mountBank(s), soort);
      await page.getByText("alles wat je hier uploadt is openbaar").waitFor();
      assert.ok(await page.getByRole("button", { name: /uploaden/i }).isVisible(), `${soort}: geen uploadknop`);
      assert.ok(await page.getByRole("button", { name: /Link kopiëren/ }).first().isVisible(), `${soort}: geen kopieerknop bij een werkende link`);
      const zoek = page.getByRole("searchbox", { name: "Zoek op naam" });
      assert.ok(await zoek.isVisible(), `${soort}: geen zoekveld`);
      await zoek.fill("bestaat-niet-xyz");
      assert.ok(await page.getByText(/Niets gevonden|Geen foto's gevonden/).first().isVisible(), `${soort}: zoeken filtert niet`);
      await zoek.fill("");
      if (soort === "document" || soort === "audio")
        assert.ok(await page.getByText(/Nog niet live/).first().isVisible(), `${soort}: geen uitleg bij een link die nog niet werkt`);
      if (soort === "document") {
        // De volledige naam is te lezen: niet afgekapt, niet woord voor woord onder elkaar
        const naam = page.getByText(LANG, { exact: true });
        assert.ok(await naam.isVisible(), "documentenbank: de volledige naam staat er niet");
        const maat = await naam.evaluate((el) => ({ breedte: el.getBoundingClientRect().width, hoogte: el.getBoundingClientRect().height, afgekapt: el.scrollWidth > el.clientWidth + 1 }));
        assert.ok(!maat.afgekapt, "documentenbank: de naam wordt afgekapt");
        assert.ok(maat.breedte > 250, `documentenbank: de naam staat in een smal kolommetje (${Math.round(maat.breedte)}px)`);
        const meta = await page.getByText("1352 kB").evaluate((el) => el.getBoundingClientRect().height);
        assert.ok(meta < 40, `documentenbank: de gegevens vallen woord voor woord onder elkaar (${meta}px hoog)`);
      }
      // Wat Google leest, en de naam kiezen vóór het uploaden
      if (soort === "document") assert.ok(await page.getByText(/Linktekst op je site: .Download het rapport/).isVisible(), "documentenbank: linktekst niet zichtbaar");
      if (soort === "foto") {
        assert.ok(await page.getByText(/Google leest: .Kantoor in Lisse, voorkant/).isVisible(), "fotobank: omschrijving niet zichtbaar");
        assert.ok(await page.getByText("Geen omschrijving op 1 plek").isVisible(), "fotobank: ontbrekende omschrijving niet gemeld");
        assert.ok(await page.getByRole("button", { name: "Omschrijving aanpassen" }).first().isVisible(), "fotobank: geen knop om de omschrijving aan te passen");
      }
      if (soort === "audio" || soort === "video") {
        const bestand = soort === "audio" ? { name: "Aflevering 3 (def).MP3", mimeType: "audio/mpeg", buffer: Buffer.from("ID3") } : { name: "Rondleiding Kantoor.MOV", mimeType: "video/quicktime", buffer: Buffer.from([0, 0, 0, 20]) };
        await page.locator('input[type="file"]').setInputFiles(bestand);
        const naam = page.getByRole("textbox", { name: `Naam voor ${bestand.name}` });
        await naam.waitFor();
        assert.equal(await naam.inputValue(), soort === "audio" ? "aflevering-3-def" : "rondleiding-kantoor", `${soort}: naam niet voorgevuld`);
        await naam.fill(soort === "audio" ? "aflevering-1" : "rondleiding");
        assert.ok(await page.getByText("Deze naam bestaat al in je bank").isVisible() || soort === "video", `${soort}: bestaande naam niet geweigerd`);
        await page.getByRole("button", { name: "Annuleren" }).click();
      }
      if (soort === "document" || soort === "foto") {
        const [bestand, bestaand, goed] =
          soort === "document" ? [{ name: "Boekje 2025 (def).pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4") }, "vacature", "boekje-2025"] : [{ name: "IMG 2041.JPG", mimeType: "image/jpeg", buffer: Buffer.from([0xff, 0xd8, 0xff]) }, "team", "kantoor-achterkant"];
        await page.locator('input[type="file"]').setInputFiles(bestand);
        const naam = page.getByRole("textbox", { name: `Naam voor ${bestand.name}` });
        await naam.waitFor();
        assert.equal(await naam.inputValue(), soort === "document" ? "boekje-2025-def" : "img-2041", `${soort}: de naam is niet voorgevuld vanuit het bestand`);
        await naam.fill(bestaand);
        assert.ok(await page.getByText("Deze naam bestaat al in je bank").isVisible(), `${soort}: een bestaande naam wordt niet geweigerd`);
        assert.ok(await page.getByRole("button", { name: "Uploaden", exact: true }).isDisabled(), `${soort}: uploaden kan met een bestaande naam`);
        await naam.fill(`${goed} Nieuw`);
        assert.ok(await page.getByText(`Wordt: ${goed}-nieuw${soort === "document" ? ".pdf" : ".webp"}`).isVisible(), `${soort}: de schone naam wordt niet getoond`);
        assert.ok(await page.getByRole("button", { name: "Uploaden", exact: true }).isEnabled(), `${soort}: uploaden kan niet met een goede naam`);
        await page.screenshot({ path: path.join(uitvoer, `naamkiezer-${soort}.png`) });
        await page.getByRole("button", { name: "Annuleren" }).click();
        assert.ok(await page.getByRole("button", { name: /uploaden/i }).first().isVisible(), `${soort}: na annuleren is de uploadknop er niet terug`);
      }
      await page.screenshot({ path: path.join(uitvoer, `bank-${soort}.png`) });
      await page.close();
    }

    assert.deepEqual(fouten, [], `fouten in de browser: ${fouten.join(" | ")}`);
    console.log("✓ portaal-ui: balk en werkweergave op 3 schermen + telefoon, tabbladen wisselen, vier banken");
  } finally {
    await browser?.close();
    server?.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
