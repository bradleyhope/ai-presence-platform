import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Agencies table - represents PR/communications agencies using the platform
 */
export const agencies = mysqlTable("agencies", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  email: varchar("email", { length: 320 }),
  planTier: mysqlEnum("planTier", ["pilot", "standard", "premium"]).default("standard").notNull(),
  maxEntities: int("maxEntities").default(25).notNull(),
  status: mysqlEnum("status", ["active", "suspended", "cancelled"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Agency = typeof agencies.$inferSelect;
export type InsertAgency = typeof agencies.$inferInsert;

/**
 * Entities table - clients being monitored (people or companies)
 */
export const entities = mysqlTable("entities", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agencyId").notNull().references(() => agencies.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  entityType: mysqlEnum("entityType", ["person", "company"]).notNull(),
  industry: varchar("industry", { length: 100 }),
  website: varchar("website", { length: 500 }),
  description: text("description"),
  monitoringEnabled: int("monitoringEnabled").default(0).notNull(),
  monitoringFrequency: mysqlEnum("monitoringFrequency", ["weekly", "biweekly", "monthly"]).default("weekly"),
  lastAuditAt: timestamp("lastAuditAt"),
  nextAuditAt: timestamp("nextAuditAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Entity = typeof entities.$inferSelect;
export type InsertEntity = typeof entities.$inferInsert;

/**
 * Audits table - represents a complete AI presence audit
 */
export const audits = mysqlTable("audits", {
  id: int("id").autoincrement().primaryKey(),
  entityId: int("entityId").notNull().references(() => entities.id, { onDelete: "cascade" }),
  agencyId: int("agencyId").notNull().references(() => agencies.id, { onDelete: "cascade" }),
  auditType: mysqlEnum("auditType", ["manual", "scheduled"]).default("manual").notNull(),
  status: mysqlEnum("status", ["pending", "running", "completed", "failed"]).default("pending").notNull(),
  totalQueries: int("totalQueries").default(0).notNull(),
  completedQueries: int("completedQueries").default(0).notNull(),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Audit = typeof audits.$inferSelect;
export type InsertAudit = typeof audits.$inferInsert;

/**
 * Queries table - individual queries within an audit
 */
export const queries = mysqlTable("queries", {
  id: int("id").autoincrement().primaryKey(),
  auditId: int("auditId").notNull().references(() => audits.id, { onDelete: "cascade" }),
  platform: mysqlEnum("platform", [
    "chatgpt", "perplexity", "gemini", "claude", "grok",
    "chatgpt_web", "gemini_web", "claude_web", "grok_web"
  ]).notNull(),
  queryText: text("queryText").notNull(),
  queryType: mysqlEnum("queryType", ["llm", "web_search"]).default("llm").notNull(),
  status: mysqlEnum("status", ["pending", "running", "completed", "failed"]).default("pending").notNull(),
  responseText: text("responseText"),
  citations: text("citations"), // JSON array of citation objects
  errorMessage: text("errorMessage"),
  executedAt: timestamp("executedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Query = typeof queries.$inferSelect;
export type InsertQuery = typeof queries.$inferInsert;

/**
 * Reports table - generated PDF reports
 */
export const reports = mysqlTable("reports", {
  id: int("id").autoincrement().primaryKey(),
  auditId: int("auditId").notNull().references(() => audits.id, { onDelete: "cascade" }),
  agencyId: int("agencyId").notNull().references(() => agencies.id, { onDelete: "cascade" }),
  reportType: mysqlEnum("reportType", ["audit", "monitoring"]).default("audit").notNull(),
  fileUrl: varchar("fileUrl", { length: 500 }),
  fileKey: varchar("fileKey", { length: 500 }),
  status: mysqlEnum("status", ["pending", "generating", "completed", "failed"]).default("pending").notNull(),
  generatedAt: timestamp("generatedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Report = typeof reports.$inferSelect;
export type InsertReport = typeof reports.$inferInsert;

/**
 * Alerts table - monitoring alerts for significant changes
 */
export const alerts = mysqlTable("alerts", {
  id: int("id").autoincrement().primaryKey(),
  entityId: int("entityId").notNull().references(() => entities.id, { onDelete: "cascade" }),
  agencyId: int("agencyId").notNull().references(() => agencies.id, { onDelete: "cascade" }),
  alertType: mysqlEnum("alertType", ["new_mention", "content_change", "source_update", "negative_sentiment"]).notNull(),
  severity: mysqlEnum("severity", ["low", "medium", "high"]).default("medium").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  isRead: int("isRead").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = typeof alerts.$inferInsert;