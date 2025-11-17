import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { queries, entities } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { analyzeAudit } from "../services/analytics";

export const analyticsRouter = router({
  /**
   * Get comprehensive analytics for an audit
   */
  getAuditAnalytics: protectedProcedure
    .input(z.object({ auditId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get all queries for this audit
      const auditQueries = await db
        .select()
        .from(queries)
        .where(eq(queries.auditId, input.auditId));

      if (auditQueries.length === 0) {
        throw new Error("No queries found for this audit");
      }

      // Get entity info to determine type and industry
      const { audits } = await import("../../drizzle/schema");
      const auditResult = await db
        .select()
        .from(audits)
        .where(eq(audits.id, input.auditId))
        .limit(1);

      if (auditResult.length === 0) throw new Error("Audit not found");
      const audit = auditResult[0];

      const entity = await db
        .select()
        .from(entities)
        .where(eq(entities.id, audit.entityId))
        .limit(1);

      if (entity.length === 0) {
        throw new Error("Entity not found");
      }

      const entityData = entity[0];

      // Run comprehensive analytics
      const analytics = analyzeAudit(
        auditQueries,
        entityData.entityType,
        entityData.industry || "default"
      );

      return analytics;
    }),

  /**
   * Get platform comparison for an audit
   */
  getPlatformComparison: protectedProcedure
    .input(z.object({ auditId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const auditQueries = await db
        .select()
        .from(queries)
        .where(eq(queries.auditId, input.auditId));

      if (auditQueries.length === 0) {
        return [];
      }

      // Recreate platform comparison logic
      const platforms = ['chatgpt', 'perplexity', 'gemini', 'claude', 'grok'];
      const comparison = [];

      for (const platform of platforms) {
        const platformQueries = auditQueries.filter(q => q.platform === platform);
        
        if (platformQueries.length === 0) continue;

        // Simple metrics for now
        const completedQueries = platformQueries.filter(q => q.status === 'completed');
        const avgResponseLength = completedQueries.reduce((sum, q) => 
          sum + (q.responseText?.length || 0), 0) / (completedQueries.length || 1);

        comparison.push({
          platform,
          queryCount: platformQueries.length,
          completedCount: completedQueries.length,
          avgResponseLength,
          successRate: (completedQueries.length / platformQueries.length) * 100
        });
      }

      return comparison;
    }),
});
