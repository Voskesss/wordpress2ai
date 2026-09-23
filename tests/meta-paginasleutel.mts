import assert from "node:assert/strict";

/**
 * Meta kent twee soorten sleutels en /leadgen_forms accepteert er maar één.
 *
 * Wat er gebeurde (23-09-2026): Jos zette zijn systeemgebruiker-sleutel in
 * META_LEADS_TOKEN, met alle juiste rechten, en kreeg "(#190) This method must
 * be called with a Page Access Token". Een bedrijfssleutel mag geen
 * leadformulieren lezen; daar hoort een paginasleutel bij, afgeleid uit de
 * eerste.
 *
 * Deze test draait het echte pad (haalMetaLeads) met een nagemaakte Meta
 * ervoor, zodat we kunnen bewijzen welke sleutel waar gebruikt wordt zonder de
 * echte sleutel te hebben.
 */

process.env.META_LEADS_TOKEN = "BEDRIJFSSLEUTEL";

const echteFetch = globalThis.fetch;
let aanroepen: { pad: string; sleutel: string | null }[] = [];

function zetMetaNeer(o: { geeftPaginaSleutel: boolean }) {
  aanroepen = [];
  globalThis.fetch = (async (url: string | URL) => {
    const u = new URL(String(url));
    aanroepen.push({ pad: u.pathname, sleutel: u.searchParams.get("access_token") });

    if (u.searchParams.get("fields") === "access_token") {
      return new Response(
        JSON.stringify(
          o.geeftPaginaSleutel
            ? { access_token: "PAGINASLEUTEL" }
            : { error: { message: "mag niet" } }
        ),
        { status: o.geeftPaginaSleutel ? 200 : 400 }
      );
    }
    if (u.pathname.endsWith("/leadgen_forms")) {
      return new Response(JSON.stringify({ data: [{ id: "form1" }] }), { status: 200 });
    }
    return new Response(
      JSON.stringify({
        data: [
          {
            id: "lead1",
            created_time: "2026-09-23T09:57:00+0000",
            field_data: [
              { name: "full_name", values: ["Ron Woering"] },
              { name: "email", values: ["ron@voorbeeld.nl"] },
            ],
          },
        ],
      }),
      { status: 200 }
    );
  }) as typeof fetch;
}

// 1. Normale gang: de bedrijfssleutel wordt omgewisseld en daarna wordt
//    ÚITSLUITEND de paginasleutel gebruikt. Gebeurt dat niet, dan krijg je
//    weer fout 190 en komt er geen enkele lead binnen.
process.env.META_PAGE_ID = "111";
zetMetaNeer({ geeftPaginaSleutel: true });
const { haalMetaLeads } = await import("../lib/meta-leads");
const leads = await haalMetaLeads();

assert.equal(leads.length, 1, "geen leads opgehaald");
assert.equal(leads[0].naam, "Ron Woering");

const omwisseling = aanroepen[0];
assert.equal(omwisseling.sleutel, "BEDRIJFSSLEUTEL", "de omwisseling gebruikt niet de bedrijfssleutel");
const rest = aanroepen.slice(1);
assert.ok(rest.length > 0, "er is niets opgehaald na de omwisseling");
for (const a of rest) {
  assert.equal(a.sleutel, "PAGINASLEUTEL", `${a.pad} gebruikt de verkeerde sleutel: ${a.sleutel}`);
}

// 2. Lukt de omwisseling niet, dan werken we door met de sleutel zoals hij is.
//    Zet iemand er later rechtstreeks een paginasleutel in, dan is die al goed
//    en zou struikelen over de omwisseling onnodig alles stilzetten.
process.env.META_PAGE_ID = "222";
zetMetaNeer({ geeftPaginaSleutel: false });
const leads2 = await haalMetaLeads();
assert.equal(leads2.length, 1, "bij een mislukte omwisseling komt er niets meer binnen");
for (const a of aanroepen.slice(1)) {
  assert.equal(a.sleutel, "BEDRIJFSSLEUTEL", "er wordt niet teruggevallen op de sleutel zelf");
}

globalThis.fetch = echteFetch;

// 3. De rechten staan in de code, want dit kostte een avond uitzoeken.
const { readFile } = await import("node:fs/promises");
const bron = await readFile(new URL("../lib/meta-leads.ts", import.meta.url), "utf8");
for (const recht of ["leads_retrieval", "pages_manage_ads", "business_management"]) {
  assert.ok(bron.includes(recht), `${recht} staat niet genoemd in de code`);
}

console.log("meta-paginasleutel: ok");
