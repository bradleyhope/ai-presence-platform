import { drizzle } from "drizzle-orm/mysql2";
import { agencies } from "../drizzle/schema.js";

const db = drizzle(process.env.DATABASE_URL);

async function seed() {
  console.log("Seeding database...");

  // Create demo agency
  const result = await db.insert(agencies).values({
    name: "Tancredi Communications",
    slug: "tancredi",
    email: "hello@tancredi.com",
    planTier: "pilot",
    maxEntities: 25,
    status: "active",
  });

  console.log("Created demo agency with ID:", result[0].insertId);
  console.log("Seed complete!");
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
