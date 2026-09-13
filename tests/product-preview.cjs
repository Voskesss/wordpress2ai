const { build } = require("esbuild");
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const bundle = await build({
    stdin: {
      contents:
        "import React from 'react';import {createRoot} from 'react-dom/client';import ProductPreview from './app/ProductPreview';createRoot(document.getElementById('root')).render(<ProductPreview/>);",
      resolveDir: process.cwd(),
      loader: "tsx",
    },
    bundle: true,
    write: false,
    jsx: "automatic",
    platform: "browser",
    define: { "process.env.NODE_ENV": '"production"' },
  });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.route("**/*", (r) =>
      r.fulfill({ contentType: "text/html", body: '<div id="root"></div>' }),
    );
    for (const consent of ["nee", "ja"]) {
      await page.goto("http://preview.fixture/");
      await page.evaluate(
        (c) => localStorage.setItem("ws-cookie-keuze", c),
        consent,
      );
      await page.addScriptTag({ content: bundle.outputFiles[0].text });
      await page
        .getByRole("button", { name: "Laat de wijziging zien" })
        .waitFor();
      assert.match(
        await page.locator(".demo-site-content").innerText(),
        /Za gesloten/,
      );
      assert.match(await page.locator(".preview-tag").innerText(), /Vóór/);
      await page
        .getByRole("button", { name: "Laat de wijziging zien" })
        .click();
      assert.match(
        await page.locator(".demo-site-content").innerText(),
        /Za 09:00–16:00/,
      );
      assert.match(
        await page.locator(".preview-tag").innerText(),
        /Nog niet live/,
      );
      await page.getByRole("button", { name: "Keur voorbeeld goed" }).click();
      assert.ok(
        await page.getByRole("button", { name: "Goedgekeurd" }).isDisabled(),
      );
      assert.match(
        await page.locator(".preview-tag").innerText(),
        /in dit voorbeeld/,
      );
      // Switching task resets both the draft and approval; it cannot look already published.
      await page
        .getByRole("button", { name: "Contactgegevens", exact: true })
        .click();
      assert.match(
        await page.locator(".demo-site-content").innerText(),
        /info@/,
      );
      await page
        .getByRole("button", { name: "Laat de wijziging zien" })
        .click();
      assert.match(
        await page.locator(".demo-site-content").innerText(),
        /hallo@/,
      );
      assert.match(
        await page.locator(".preview-tag").innerText(),
        /Nog niet live/,
      );
      const events = await page.evaluate(() =>
        Array.from(window.dataLayer ?? [], (x) => Array.from(x)),
      );
      assert.deepEqual(
        events.map((x) => x[1]),
        consent === "ja"
          ? [
              "example_preview",
              "example_approve",
              "example_select",
              "example_preview",
            ]
          : [],
      );
      assert.ok(
        !JSON.stringify(events).includes("@"),
        "No address sent with analytics",
      );
    }
    console.log(
      "PASS: product example shows before → draft → approved; task switch resets; analytics respect consent.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
