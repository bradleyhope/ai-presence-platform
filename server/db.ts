import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users, 
  agencies, 
  InsertAgency, 
  entities, 
  InsertEntity, 
  audits, 
  InsertAudit, 
  queries, 
  InsertQuery, 
  reports, 
  InsertReport, 
  alerts, 
  InsertAlert 
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Agency Operations
 */
export async function getAgencyById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(agencies).where(eq(agencies.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createAgency(data: InsertAgency) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(agencies).values(data);
  return result[0].insertId;
}

/**
 * Entity Operations
 */
export async function getEntitiesByAgency(agencyId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(entities).where(eq(entities.agencyId, agencyId)).orderBy(entities.createdAt);
}

export async function getEntityById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(entities).where(eq(entities.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createEntity(data: InsertEntity) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(entities).values(data);
  return result[0].insertId;
}

export async function updateEntity(id: number, data: Partial<InsertEntity>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(entities).set(data).where(eq(entities.id, id));
}

export async function deleteEntity(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(entities).where(eq(entities.id, id));
}

/**
 * Audit Operations
 */
export async function getAuditsByAgency(agencyId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(audits).where(eq(audits.agencyId, agencyId)).orderBy(audits.createdAt);
}

export async function getAuditById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(audits).where(eq(audits.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createAudit(data: InsertAudit) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(audits).values(data);
  return result[0].insertId;
}

export async function updateAudit(id: number, data: Partial<InsertAudit>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(audits).set(data).where(eq(audits.id, id));
}

/**
 * Query Operations
 */
export async function getQueriesByAudit(auditId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(queries).where(eq(queries.auditId, auditId)).orderBy(queries.createdAt);
}

export async function createQuery(data: InsertQuery) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(queries).values(data);
  return result[0].insertId;
}

export async function updateQuery(id: number, data: Partial<InsertQuery>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(queries).set(data).where(eq(queries.id, id));
}

/**
 * Report Operations
 */
export async function getReportsByAgency(agencyId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(reports).where(eq(reports.agencyId, agencyId)).orderBy(reports.createdAt);
}

export async function createReport(data: InsertReport) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(reports).values(data);
  return result[0].insertId;
}

export async function updateReport(id: number, data: Partial<InsertReport>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(reports).set(data).where(eq(reports.id, id));
}

/**
 * Alert Operations
 */
export async function getAlertsByAgency(agencyId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(alerts).where(eq(alerts.agencyId, agencyId)).orderBy(alerts.createdAt);
}

export async function createAlert(data: InsertAlert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(alerts).values(data);
  return result[0].insertId;
}
