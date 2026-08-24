import {
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
  aangemaakt: timestamp("aangemaakt").notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id")
    .notNull()
    .references(() => sites.id),
  rol: text("rol", { enum: ["klant", "assistent"] }).notNull(),
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
  aangemaakt: timestamp("aangemaakt").notNull().defaultNow(),
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
