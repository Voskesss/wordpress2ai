import {
  bigint,
  boolean,
  index,
  pgTable,
  primaryKey,
  unique,
  serial,
  text,
  timestamp,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";

export const sites = pgTable("sites", {
  id: serial("id").primaryKey(),
  clerkUserId: text("clerk_user_id").notNull(),
  naam: text("naam").notNull(),
  githubRepo: text("github_repo").notNull(),
  // De slug van de site: bepaalt o.a. de Cloudflare-workernamen (wv-<slug>).
  // Heette vroeger netlify_site_id, uit de tijd dat er naar Netlify werd gedeployd.
  siteSlug: text("site_slug"),
  domein: text("domein"),
  plan: text("plan", { enum: ["via_ons", "eigen_key"] })
    .notNull()
    .default("via_ons"),
  status: text("status", {
    enum: ["migratie", "actief", "gepauzeerd", "opgezegd"],
  })
    .notNull()
    .default("migratie"),
  richtlijnen: text("richtlijnen"),
  // Onraadbare code voor de deelbare planlink (/afspraak/<code>)
  afspraakToken: text("afspraak_token"),
  // Wanneer de klant de uitnodiging met de voorgestelde dagen kreeg
  afspraakMailOp: timestamp("afspraak_mail_op", { withTimezone: true }),
  // Wanneer het review-/referentieverzoek is gemaild
  reviewMailOp: timestamp("review_mail_op", { withTimezone: true }),
  // YYYY-MM-DD: vanaf wanneer de website offline mag na een opzegging
  // (betaalde periode plus één maand). Leeg = gewoon klant.
  offlineNa: text("offline_na"),
  notificatieEmail: text("notificatie_email"),
  // Handtekening onder formuliermails (bevestiging aan de invuller): regels
  // met adres/telefoon, logo-adres en accentkleur. Leeg = naam + website.
  mailHandtekening: text("mail_handtekening"),
  mailLogoUrl: text("mail_logo_url"),
  mailKleur: text("mail_kleur"),
  // Uitgenodigde klant die nog geen account heeft; gekoppeld zodra hij inlogt
  uitnodigingEmail: text("uitnodiging_email"),
  // Witlabel-mail: formulier-mails via de eigen mailserver van de klant (SMTP).
  // Wachtwoord versleuteld opgeslagen (AES, sleutel afgeleid van CRON_SECRET).
  // Video-uploads via de chat: hoeveel al gebruikt en hoeveel er in het pakket zitten
  videoUploads: integer("video_uploads").notNull().default(0),
  videoLimiet: integer("video_limiet").notNull().default(10),
  // Maandbudget voor AI-gebruik in hele dollars; instelbaar per klant in de admin.
  aiMaandbudgetUsd: integer("ai_maandbudget_usd").notNull().default(5),
  // Eenmalige extra ruimte bovenop het maandbudget, alleen voor de maand
  // hieronder (YYYY-MM). Vervalt daarna vanzelf: zie lib/ai-budget.
  aiExtraUsd: integer("ai_extra_usd").notNull().default(0),
  aiExtraMaand: text("ai_extra_maand"),
  // Fair-use-aantal wijzigingen per maand (pakketbelofte), plus eenmalige
  // extra voor één maand — zelfde model als het AI-budget hierboven.
  wijzigingenLimiet: integer("wijzigingen_limiet").notNull().default(30),
  wijzigingenExtra: integer("wijzigingen_extra").notNull().default(0),
  wijzigingenExtraMaand: text("wijzigingen_extra_maand"),
  smtpHost: text("smtp_host"),
  smtpPoort: integer("smtp_poort"),
  smtpGebruiker: text("smtp_gebruiker"),
  smtpWachtwoord: text("smtp_wachtwoord"),
  smtpAfzender: text("smtp_afzender"),
  // Externe nieuwsfeed (bv. Accountantsportal) waarvan de actualiteiten
  // dagelijks als statische pagina's op de site worden gezet. Leeg = uit.
  nieuwsFeedUrl: text("nieuws_feed_url"),
  chatGeheugen: text("chat_geheugen"),
  // Betaalde extra: de eigenaar kan zijn website via WhatsApp aansturen.
  whatsappActief: boolean("whatsapp_actief").notNull().default(false),
  // Ontwerp-route: mag de klant het ontwerpvoorstel in zijn portaal zien?
  ontwerpZichtbaar: boolean("ontwerp_zichtbaar").notNull().default(false),
  // Workernaam van het ontwerp (ontwerp-<slug>-<willekeur>): onraadbaar adres;
  // verbergen vernieuwt hem zodat een gedeelde link vervalt. Leeg = geen adres.
  ontwerpSlug: text("ontwerp_slug"),
  isDemo: boolean("is_demo").notNull().default(false),
  aangemaakt: timestamp("aangemaakt").notNull().defaultNow(),
});

// WhatsApp-kanaal: welk telefoonnummer bij welke site hoort. Een rij begint
// met alleen een koppelcode (in het portaal getoond); zodra de eigenaar
// "KOPPEL <code>" appt, komt zijn nummer erin en vervalt de code.
export const whatsappKoppelingen = pgTable("whatsapp_koppelingen", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id")
    .notNull()
    .references(() => sites.id),
  // Wie de koppeling maakte; namens deze gebruiker lopen de chatbeurten
  clerkUserId: text("clerk_user_id").notNull(),
  // Internationaal zonder plus, zoals WhatsApp het aanlevert (31612345678)
  telefoon: text("telefoon").unique(),
  koppelcode: text("koppelcode"),
  codeVerloopt: timestamp("code_verloopt"),
  gekoppeldOp: timestamp("gekoppeld_op"),
  aangemaakt: timestamp("aangemaakt").notNull().defaultNow(),
});

// Elk binnenkomend WhatsApp-bericht, ook om dubbele aflevering door Meta te
// herkennen (wa_message_id) en losse foto's samen te nemen tot één opdracht.
export const whatsappBerichten = pgTable("whatsapp_berichten", {
  id: serial("id").primaryKey(),
  waMessageId: text("wa_message_id").notNull().unique(),
  telefoon: text("telefoon").notNull(),
  siteId: integer("site_id").references(() => sites.id),
  soort: text("soort", {
    enum: ["tekst", "foto", "document", "spraak", "knop", "keuze", "anders"],
  }).notNull(),
  // Tekst, bijschrift, knop-id of (na omzetten) de uitgeschreven spraak
  inhoud: text("inhoud"),
  mediaId: text("media_id"),
  mimeType: text("mime_type"),
  bestandsnaam: text("bestandsnaam"),
  status: text("status", {
    enum: ["wacht", "bezig", "klaar", "genegeerd", "mislukt"],
  })
    .notNull()
    .default("wacht"),
  ontvangen: timestamp("ontvangen", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("whatsapp_berichten_telefoon_status").on(t.telefoon, t.status)]);

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id")
    .notNull()
    .references(() => sites.id),
  rol: text("rol", { enum: ["klant", "assistent"] }).notNull(),
  clerkUserId: text("clerk_user_id"),
  tekst: text("tekst").notNull(),
  aangemaakt: timestamp("aangemaakt").notNull().defaultNow(),
});

export const changes = pgTable("changes", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id")
    .notNull()
    .references(() => sites.id),
  branch: text("branch").notNull(),
  prNumber: integer("pr_number"),
  previewUrl: text("preview_url"),
  status: text("status", {
    enum: [
      "concept",
      "publicatie_mislukt",
      "herstel_mislukt",
      "gepubliceerd",
      "afgewezen",
    ],
  })
    .notNull()
    .default("concept"),
  promptTekst: text("prompt_tekst").notNull(),
  bestanden: jsonb("bestanden").notNull().default([]),
  aangemaakt: timestamp("aangemaakt").notNull().defaultNow(),
  // Demo: wiens wijziging dit is (iedere demo-gebruiker een eigen sandbox)
  clerkUserId: text("clerk_user_id"),
  // Demo: stand van de branch vóór dit concept, zodat Verwijder netjes terugdraait
  baseSha: text("base_sha"),
});

export const usage = pgTable("usage", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id")
    .notNull()
    .references(() => sites.id),
  maand: text("maand").notNull(), // "2026-08"
  wijzigingen: integer("wijzigingen").notNull().default(0),
});

export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id")
    .notNull()
    .references(() => sites.id),
  provider: text("provider", { enum: ["anthropic", "openai"] }).notNull(),
  encryptedKey: text("encrypted_key").notNull(),
  aangemaakt: timestamp("aangemaakt").notNull().defaultNow(),
});

export const migrations = pgTable("migrations", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id")
    .notNull()
    .references(() => sites.id),
  stap: text("stap", {
    enum: ["intake", "import", "opbouw", "validatie", "live"],
  })
    .notNull()
    .default("intake"),
  checklist: jsonb("checklist").notNull().default({}),
  notities: text("notities"),
  bijgewerkt: timestamp("bijgewerkt").notNull().defaultNow(),
});

export const bouwJobs = pgTable("bouw_jobs", {
  id: serial("id").primaryKey(),
  status: text("status", {
    enum: ["wachtend", "bezig", "klaar", "fout"],
  })
    .notNull()
    .default("wachtend"),
  voortgang: text("voortgang"),
  siteNaam: text("site_naam").notNull(),
  repoNaam: text("repo_naam").notNull(),
  clerkUserId: text("clerk_user_id").notNull(),
  wxr: text("wxr").notNull(),
  aanwijzingen: text("aanwijzingen"),
  resultaat: jsonb("resultaat"),
  aangemaakt: timestamp("aangemaakt").notNull().defaultNow(),
  bijgewerkt: timestamp("bijgewerkt").notNull().defaultNow(),
});

// Werkelijke AI-kosten per site per maand, gesplitst naar bron (chat/bouw).
// Basis voor toekomstige prijsmodellen (pay-per-use i.p.v. vast maandbedrag).
export const aiKosten = pgTable("ai_kosten", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id")
    .notNull()
    .references(() => sites.id),
  maand: text("maand").notNull(), // "2026-08"
  bron: text("bron", { enum: ["chat", "bouw"] }).notNull(),
  beurten: integer("beurten").notNull().default(0), // aantal AI-opdrachten
  tokensIn: integer("tokens_in").notNull().default(0),
  tokensUit: integer("tokens_uit").notNull().default(0),
  kostenMicroUsd: integer("kosten_micro_usd").notNull().default(0), // $ x 1.000.000
});

export const formulierInzendingen = pgTable("formulier_inzendingen", {
  id: serial("id").primaryKey(),
  siteRepo: text("site_repo").notNull(),
  formulier: text("formulier").notNull().default("contact"),
  velden: jsonb("velden").notNull(),
  // Meegestuurde bestanden: [{ naam, url, bytes }]. De url wijst naar onze
  // eigen opslag en blijft server-side — downloaden gaat via een route die
  // eerst controleert of je bij deze site hoort.
  bijlagen: jsonb("bijlagen").notNull().default([]),
  // Afdruk van het IP-adres van de afzender (HMAC, niet terug te rekenen):
  // genoeg om te tellen voor de spamrem, niet om iemand mee te herleiden.
  // Leeg als FORMULIER_IP_SALT niet is ingesteld. Zie lib/formulier-rem.
  ipAfdruk: text("ip_afdruk"),
  aangemaakt: timestamp("aangemaakt").notNull().defaultNow(),
  // Afgehandeld: uit het overzicht, wel bewaard (uitklapbaar terug te zien)
  gearchiveerd: boolean("gearchiveerd").notNull().default(false),
});

// Bevestigingsmail per formulier van een klantsite. Formulieren worden bij publicatie herkend;
// de AI doet één keer een voorstel, daarna passen klant of WordSwap de tekst aan.
// bron: standaard | site (_bevestiging in de HTML) | ai | klant | wordswap
export const formulierBevestigingen = pgTable(
  "formulier_bevestigingen",
  {
    id: serial("id").primaryKey(),
    siteId: integer("site_id").notNull(),
    formulier: text("formulier").notNull(),
    paginas: jsonb("paginas").notNull().default([]),
    velden: jsonb("velden").notNull().default([]),
    onderwerp: text("onderwerp"),
    tekst: text("tekst"),
    bron: text("bron").notNull().default("standaard"),
    aan: boolean("aan").notNull().default(true),
    bijgewerkt: timestamp("bijgewerkt").notNull().defaultNow(),
    aangemaakt: timestamp("aangemaakt").notNull().defaultNow(),
  },
  (t) => [unique("formulier_bevestigingen_site_formulier").on(t.siteId, t.formulier)],
);

export const kennisDocumenten = pgTable("kennis_documenten", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id")
    .notNull()
    .references(() => sites.id),
  naam: text("naam").notNull(),
  inhoud: text("inhoud").notNull(),
  aangemaakt: timestamp("aangemaakt").notNull().defaultNow(),
});

// Outreach: prospects die we (netjes, max 3 mails) benaderen
export const prospects = pgTable("prospects", {
  id: serial("id").primaryKey(),
  bedrijf: text("bedrijf").notNull(),
  website: text("website").notNull(),
  email: text("email").notNull(),
  // Jos' persoonlijke observatie over de site — wordt in de mail verweven
  observatie: text("observatie"),
  // Kenmerken voor doelgroep-analyse: waar kwam hij vandaan en wat zag de scan?
  branche: text("branche"),
  plaats: text("plaats"),
  score: integer("score"),
  laadMs: integer("laad_ms"),
  kenmerken: text("kenmerken"),
  // Concreet prijsvoorstel in de mail (optioneel; leeg = "vanaf €250")
  prijs: text("prijs"),
  // Naam van de sjabloonversie waarmee mail 1 is verstuurd (voor de analyse)
  mailVersie: text("mail_versie"),
  // nieuw | mail1 | mail2 | mail3 | gereageerd | klant | niet_mailen
  status: text("status").notNull().default("nieuw"),
  mail1Op: timestamp("mail1_op"),
  mail2Op: timestamp("mail2_op"),
  mail3Op: timestamp("mail3_op"),
  aangemaakt: timestamp("aangemaakt").notNull().defaultNow(),
});

// Mailsjablonen: de basisteksten van de outreach-mails, met meerdere
// versies per mailnummer; per nummer is er precies één actief.
export const mailSjablonen = pgTable("mail_sjablonen", {
  id: serial("id").primaryKey(),
  nummer: integer("nummer").notNull(), // 1 | 2 | 3
  naam: text("naam").notNull(),
  onderwerp: text("onderwerp").notNull(),
  tekst: text("tekst").notNull(), // platte tekst met {{invulvelden}}
  actief: boolean("actief").notNull().default(false),
  aangemaakt: timestamp("aangemaakt").notNull().defaultNow(),
});

// Persoonlijke versie van een mail voor één prospect (overschrijft de basis)
export const prospectMails = pgTable("prospect_mails", {
  id: serial("id").primaryKey(),
  prospectId: integer("prospect_id").notNull(),
  nummer: integer("nummer").notNull(),
  onderwerp: text("onderwerp").notNull(),
  tekst: text("tekst").notNull(),
  bijgewerkt: timestamp("bijgewerkt").notNull().defaultNow(),
});

// Verzonden losse mails uit de admin-Mailer: zodat Jos kan terugzien wat er
// precies is verstuurd (aan wie, wanneer, welke tekst)
export const verzondenMails = pgTable("verzonden_mails", {
  id: serial("id").primaryKey(),
  aan: text("aan").notNull(),
  onderwerp: text("onderwerp").notNull(),
  tekst: text("tekst").notNull(),
  verzonden: timestamp("verzonden").notNull().defaultNow(),
  resendId: text("resend_id"), // voor de bezorgstatus (afgeleverd/gebounced)
});

// Feedback op de chatbeleving: duimpjes bij AI-antwoorden en algemene
// opmerkingen, zodat Jos de chat gericht kan verbeteren
export const chatFeedback = pgTable("chat_feedback", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id").notNull(),
  clerkUserId: text("clerk_user_id"),
  oordeel: text("oordeel", { enum: ["goed", "slecht", "algemeen"] }).notNull(),
  reden: text("reden"),
  antwoord: text("antwoord"), // het AI-antwoord waar het duimpje bij hoort
  aangemaakt: timestamp("aangemaakt").notNull().defaultNow(),
});

// Webinars: door Jos ingeplande sessies waar bezoekers zich voor inschrijven
export const webinars = pgTable("webinars", {
  id: serial("id").primaryKey(),
  titel: text("titel").notNull(),
  wanneer: timestamp("wanneer").notNull(),
  meetLink: text("meet_link"),
  opnameLink: text("opname_link"),
  demoVideoLink: text("demo_video_link"), // voorbeeldvideo voor de mailreeks (optioneel)
  actief: boolean("actief").notNull().default(true),
  aangemaakt: timestamp("aangemaakt").notNull().defaultNow(),
});

// Vergrendeling en AI-budget (lib/operation-guards.ts werkt met ruwe SQL).
// Hier in het schema opgenomen zodat `drizzle-kit push` ze kent: push gooit
// tabellen weg die niet in dit bestand staan — dat gebeurde op 13-09-2026,
// waardoor publiceren en concept weggooien faalden.
export const operationLeases = pgTable("operation_leases", {
  scope: text("scope").primaryKey(),
  owner: text("owner").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const aiBudgetReservations = pgTable(
  "ai_budget_reservations",
  {
    scope: text("scope").notNull(),
    month: text("month").notNull(),
    reservedMicroUsd: bigint("reserved_micro_usd", { mode: "number" }).notNull().default(0),
    requests: integer("requests").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.scope, t.month] })]
);

// Aankondigingen: berichten van Jos voor ingelogde klanten in het portaal
// (wegklikbaar per bezoeker, onthouden in de browser).
export const aankondigingen = pgTable("aankondigingen", {
  id: serial("id").primaryKey(),
  titel: text("titel").notNull(),
  tekst: text("tekst").notNull(),
  link: text("link"),
  actief: boolean("actief").notNull().default(true),
  aangemaakt: timestamp("aangemaakt").notNull().defaultNow(),
});

// Maandabonnementen via Mollie (eerste betaling iDEAL → machtiging → maandelijkse SEPA-incasso)
export const abonnementen = pgTable("abonnementen", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id").notNull().unique(),
  email: text("email").notNull(),
  naam: text("naam").notNull(),
  maandbedragCent: integer("maandbedrag_cent").notNull(), // exclusief btw
  eenmaligCent: integer("eenmalig_cent").notNull().default(0), // omzetting, exclusief btw, zit in de eerste betaling
  klantBedrijf: text("klant_bedrijf"),
  klantAdres: text("klant_adres"), // meerdere regels: straat, postcode en plaats
  klantBtw: text("klant_btw"),
  klantKvk: text("klant_kvk"),
  // Vrije tekst met afwijkende afspraken (bv. domeinregistratie of e-mail via ons,
  // uitsplitsing van het maandbedrag); komt als eigen kopje in de opdrachtbevestiging
  afspraken: text("afspraken"),
  stoptOp: text("stopt_op"), // YYYY-MM-DD: geplande opzegging, uitgevoerd door de dagelijkse cron
  betaaldTot: text("betaald_tot"), // YYYY-MM-DD: t/m wanneer is er betaald (vastgelegd bij opzeggen)
  nieuwBedragCent: integer("nieuw_bedrag_cent"), // geplande wijziging van het maandbedrag, excl. btw
  nieuwBedragVanaf: text("nieuw_bedrag_vanaf"), // YYYY-MM-DD
  status: text("status", {
    enum: ["wacht_op_eerste", "actief", "mislukt", "gestopt"],
  })
    .notNull()
    .default("wacht_op_eerste"),
  mollieCustomerId: text("mollie_customer_id"),
  mollieMandateId: text("mollie_mandate_id"),
  mollieSubscriptionId: text("mollie_subscription_id"),
  betaallink: text("betaallink"),
  aangemaakt: timestamp("aangemaakt").notNull().defaultNow(),
  bijgewerkt: timestamp("bijgewerkt").notNull().defaultNow(),
});

export const betalingen = pgTable("betalingen", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id").notNull(),
  molliePaymentId: text("mollie_payment_id").notNull().unique(),
  soort: text("soort", { enum: ["eerste", "maand", "los"] }).notNull(),
  bedragCent: integer("bedrag_cent").notNull(), // inclusief btw, zoals afgeschreven
  status: text("status").notNull(),
  omschrijving: text("omschrijving"),
  aangemaakt: timestamp("aangemaakt").notNull().defaultNow(),
  bijgewerkt: timestamp("bijgewerkt").notNull().defaultNow(),
});

// Leadlijst: iedereen die zelf contact zocht, met status en de volgende actie voor Jos
export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  naam: text("naam").notNull(),
  email: text("email"),
  telefoon: text("telefoon"),
  website: text("website"),
  bron: text("bron"), // bijv. Meta-advertentie, Website (/ai-website)
  soort: text("soort").notNull().default("klant"), // klant | partner
  status: text("status").notNull().default("nieuw"), // zie LEAD_STATUSSEN in lib/leads.ts
  volgendeActie: text("volgende_actie"),
  actieDatum: text("actie_datum"), // YYYY-MM-DD
  notities: text("notities"),
  aangemaakt: timestamp("aangemaakt").notNull().defaultNow(),
  bijgewerkt: timestamp("bijgewerkt").notNull().defaultNow(),
});

// Acties per lead: Jos voegt ze toe en vinkt ze af; afgevinkte blijven zichtbaar
export const leadActies = pgTable("lead_acties", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").notNull(),
  tekst: text("tekst").notNull(),
  datum: text("datum"), // YYYY-MM-DD, optioneel
  gedaan: boolean("gedaan").notNull().default(false),
  gedaanOp: timestamp("gedaan_op"),
  aangemaakt: timestamp("aangemaakt").notNull().defaultNow(),
});

// Facturen van WordSwap-abonnementen: automatisch bij elke betaalde Mollie-betaling.
// Het nummer (WS-JJJJ-NNNN) wordt pas toegekend nadat de betaling geclaimd is, zodat
// een dubbel webhookverzoek nooit een nummer verbrandt.
export const facturen = pgTable("facturen", {
  id: serial("id").primaryKey(),
  nummer: text("nummer").unique(),
  siteId: integer("site_id").notNull(),
  molliePaymentId: text("mollie_payment_id").notNull().unique(),
  klantNaam: text("klant_naam").notNull(),
  klantBedrijf: text("klant_bedrijf"),
  klantAdres: text("klant_adres"),
  klantEmail: text("klant_email").notNull(),
  regels: jsonb("regels").$type<{ omschrijving: string; bedragCent: number }[]>().notNull(),
  subtotaalCent: integer("subtotaal_cent").notNull(),
  btwCent: integer("btw_cent").notNull(),
  totaalCent: integer("totaal_cent").notNull(),
  betaalwijze: text("betaalwijze").notNull(),
  soort: text("soort", { enum: ["factuur", "credit"] }).notNull().default("factuur"),
  creditVoorId: integer("credit_voor_id"),
  creditVoorNummer: text("credit_voor_nummer"),
  klantBtw: text("klant_btw"),
  klantKvk: text("klant_kvk"),
  // De pdf zoals hij verstuurd is; nooit opnieuw opbouwen, zodat een oude factuur niet verandert
  pdfBase64: text("pdf_base64"),
  verstuurd: boolean("verstuurd").notNull().default(false),
  datum: timestamp("datum").notNull().defaultNow(),
});

export const factuurTeller = pgTable("factuur_teller", {
  jaar: integer("jaar").primaryKey(),
  laatste: integer("laatste").notNull(),
});

// Betaalverzoeken: onze eigen betaallink (/betalen/<token>) maakt pas bij het klikken een
// verse Mollie-betaling, zodat een gemailde link nooit verloopt. Ook voor losse opdrachten.
export const betaalverzoeken = pgTable("betaalverzoeken", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  siteId: integer("site_id").notNull(),
  soort: text("soort", { enum: ["eerste", "los"] }).notNull(),
  wijze: text("wijze", { enum: ["link", "incasso"] }).notNull().default("link"),
  omschrijving: text("omschrijving").notNull(),
  bedragExclCent: integer("bedrag_excl_cent").notNull(),
  klantNaam: text("klant_naam").notNull(),
  klantEmail: text("klant_email").notNull(),
  klantBedrijf: text("klant_bedrijf"),
  klantAdres: text("klant_adres"),
  klantBtw: text("klant_btw"),
  klantKvk: text("klant_kvk"),
  status: text("status", { enum: ["open", "betaald", "mislukt", "geannuleerd"] }).notNull().default("open"),
  molliePaymentId: text("mollie_payment_id"),
  betaaldOp: timestamp("betaald_op"),
  aangemaakt: timestamp("aangemaakt").notNull().defaultNow(),
});

// Vastgelegde akkoorden: wie ging wanneer akkoord met welke versie (bewijs voor de AVG)
export const akkoorden = pgTable("akkoorden", {
  id: serial("id").primaryKey(),
  clerkUserId: text("clerk_user_id").notNull(),
  email: text("email"),
  soort: text("soort").notNull(), // bijv. "verwerkersovereenkomst"
  versie: text("versie").notNull(),
  aangemaakt: timestamp("aangemaakt").notNull().defaultNow(),
});

// Terugweg-garantie: WordPress-kopieën die Jos per klant klaarzet in de (EU-)Blob-opslag.
// De url is een onvindbaar Blob-adres; hij staat nooit in de pagina en is alleen
// bereikbaar via de ingelogde downloadroute van de eigenaar.
export const wpBackups = pgTable("wp_backups", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id").notNull(),
  url: text("url").notNull(),
  bestandsnaam: text("bestandsnaam").notNull(),
  grootteBytes: bigint("grootte_bytes", { mode: "number" }),
  omschrijving: text("omschrijving"),
  aangemaakt: timestamp("aangemaakt").notNull().defaultNow(),
});

// Webinar-mailreeks: welke mails aanstaan (alles standaard uit) en wat er per inschrijving verstuurd is.
// soort "afgemeld" in webinar_mails betekent: deze inschrijver wil geen reeksmails meer.
export const webinarMailInstellingen = pgTable("webinar_mail_instellingen", {
  soort: text("soort").primaryKey(),
  aan: boolean("aan").notNull().default(false),
  bijgewerkt: timestamp("bijgewerkt").notNull().defaultNow(),
});

export const webinarMails = pgTable(
  "webinar_mails",
  {
    id: serial("id").primaryKey(),
    inschrijvingId: integer("inschrijving_id").notNull(),
    webinarId: integer("webinar_id").notNull(),
    soort: text("soort").notNull(),
    verzondenOp: timestamp("verzonden_op").notNull().defaultNow(),
  },
  (t) => [unique("webinar_mails_inschrijving_soort").on(t.inschrijvingId, t.soort)],
);

/** Dagen die Jos per klant klaarzet om een afspraak op te maken. */
export const afspraakBlokken = pgTable("afspraak_blokken", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id").notNull(),
  datum: text("datum").notNull(), // YYYY-MM-DD, Nederlandse tijd
  van: text("van").notNull(), // HH:MM
  tot: text("tot").notNull(), // HH:MM
  duurMinuten: integer("duur_minuten").notNull().default(30),
  aangemaakt: timestamp("aangemaakt", { withTimezone: true }).notNull().defaultNow(),
});

/** Gekozen afspraken. Een bevestigde afspraak blokkeert die tijd bij alle klanten. */
export const afspraken = pgTable("afspraken", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id").notNull(),
  start: timestamp("start", { withTimezone: true }).notNull(),
  duurMinuten: integer("duur_minuten").notNull(),
  status: text("status", { enum: ["aangevraagd", "bevestigd", "geannuleerd"] })
    .notNull()
    .default("aangevraagd"),
  naam: text("naam"),
  email: text("email"),
  telefoon: text("telefoon"),
  opmerking: text("opmerking"),
  onderwerp: text("onderwerp"),
  /** Aanvraag van een ingelogde klant (dan kloppen naam en e-mail zeker) */
  ingelogd: boolean("ingelogd").notNull().default(false),
  clerkUserId: text("clerk_user_id"),
  /** Reden die de klant opgaf bij het afzeggen */
  afzegReden: text("afzeg_reden"),
  aangemaakt: timestamp("aangemaakt", { withTimezone: true }).notNull().defaultNow(),
  bevestigdOp: timestamp("bevestigd_op", { withTimezone: true }),
});
