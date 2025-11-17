import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { 
  detectChanges, 
  analyzeSourcesForAudit, 
  generateRecommendations,
  scheduleNextAudit,
} from "../services/monitoring";

export const monitoringRouter = router({
  /**
   * Detect changes between current and previous audit
   */
  detectChanges: protectedProcedure
    .input(
      z.object({
        entityId: z.number(),
        auditId: z.number(),
      })
    )
    .query(async ({ input }) => {
      return await detectChanges(input.entityId, input.auditId);
    }),

  /**
   * Analyze sources for an audit
   */
  analyzeSources: protectedProcedure
    .input(z.object({ auditId: z.number() }))
    .query(async ({ input }) => {
      return await analyzeSourcesForAudit(input.auditId);
    }),

  /**
   * Generate recommendations for an entity
   */
  getRecommendations: protectedProcedure
    .input(
      z.object({
        entityId: z.number(),
        auditId: z.number(),
      })
    )
    .query(async ({ input }) => {
      return await generateRecommendations(input.entityId, input.auditId);
    }),

  /**
   * Enable/disable monitoring for an entity
   */
  toggleMonitoring: protectedProcedure
    .input(
      z.object({
        entityId: z.number(),
        enabled: z.boolean(),
        frequency: z.enum(["daily", "weekly", "biweekly", "monthly"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { getDb } = await import("../db");
      const { entities } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const updateData: any = {
        monitoringEnabled: input.enabled ? 1 : 0,
      };

      if (input.enabled && input.frequency) {
        updateData.monitoringFrequency = input.frequency;
        // Schedule first audit
        const now = new Date();
        updateData.nextAuditAt = now;
      }

      await db
        .update(entities)
        .set(updateData)
        .where(eq(entities.id, input.entityId));

      return { success: true };
    }),
});
