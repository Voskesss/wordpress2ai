// esbuild-plugin voor browsertests: vervangt een bestand dat begint met
// "use server" door stubs met dezelfde exportnamen. Next.js doet in de
// browser hetzelfde (een server-actie wordt daar een netwerkverwijzing),
// maar een kale esbuild-bundel trekt anders alle servercode mee (mail,
// sharp, node:crypto) en faalt. Zo hoeft geen onderdeel om de test heen
// gebouwd te worden als het ergens een server-actie importeert.
const fs = require("node:fs");

const SERVER_DIRECTIEF = /^\s*(?:\/\/[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*["']use server["']/;

function exportNamen(bron) {
  const namen = new Set();
  for (const m of bron.matchAll(/export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g)) namen.add(m[1]);
  for (const m of bron.matchAll(/export\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g)) namen.add(m[1]);
  return [...namen];
}

const serverActiesStub = {
  name: "server-acties-stub",
  setup(build) {
    build.onLoad({ filter: /\.(ts|tsx|js|jsx)$/ }, (args) => {
      if (args.path.includes("node_modules")) return undefined;
      const bron = fs.readFileSync(args.path, "utf8");
      if (!SERVER_DIRECTIEF.test(bron)) return undefined;
      const code = exportNamen(bron)
        .map((n) => `export async function ${n}() { return undefined; }`)
        .join("\n");
      return { contents: code || "export {};", loader: "js" };
    });
  },
};

module.exports = { serverActiesStub, exportNamen, SERVER_DIRECTIEF };
