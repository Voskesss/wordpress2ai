import {
  boolean,
  pgTable,
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
  netlifySiteId: text("netlify_site_id"),
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
  notificatieEmail: text("notificatie_email"),
  // Uitgenodigde klant die nog geen account heeft; gekoppeld zodra hij inlogt
  uitnodigingEmail: text("uitnodiging_email"),
  // Witlabel-mail: formulier-mails via de eigen mailserver van de klant (SMTP).
  // Wachtwoord versleuteld opgeslagen (AES, sleutel afgeleid van CRON_SECRET).
  smtpHost: text("smtp_host"),
  smtpPoort: integer("smtp_poort"),
  smtpGebruiker: text("smtp_gebruiker"),
  smtpWachtwoord: text("smtp_wachtwoord"),
  smtpAfzender: text("smtp_afzender"),
  chatGeheugen: text("chat_geheugen"),
  isDemo: boolean("is_demo").notNull().default(false),
  aangemaakt: timestamp("aangemaakt").notNull().defaultNow(),
});

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
    enum: ["concept", "gepubliceerd", "afgewezen"],
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
  aangemaakt: timestamp("aangemaakt").notNull().defaultNow(),
  // Afgehandeld: uit het overzicht, wel bewaard (uitklapbaar terug te zien)
  gearchiveerd: boolean("gearchiveerd").notNull().default(false),
});

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
  // nieuw | mail1 | mail2 | mail3 | gereageerd | klant | niet_mailen
  status: text("status").notNull().default("nieuw"),
  mail1Op: timestamp("mail1_op"),
  mail2Op: timestamp("mail2_op"),
  mail3Op: timestamp("mail3_op"),
  aangemaakt: timestamp("aangemaakt").notNull().defaultNow(),
});

// Webinars: door Jos ingeplande sessies waar bezoekers zich voor inschrijven
export const webinars = pgTable("webinars", {
  id: serial("id").primaryKey(),
  titel: text("titel").notNull(),
  wanneer: timestamp("wanneer").notNull(),
  meetLink: text("meet_link"),
  opnameLink: text("opname_link"),
  actief: boolean("actief").notNull().default(true),
  aangemaakt: timestamp("aangemaakt").notNull().defaultNow(),
});
