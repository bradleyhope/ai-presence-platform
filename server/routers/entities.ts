import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

export const entitiesRouter = router({
  /**
   * List all entities for the user's agency
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    // For now, we'll use a default agency ID
    // TODO: Get agency ID from user context
    const agencyId = 1;
    return await db.getEntitiesByAgency(agencyId);
  }),

  /**
   * Get a single entity by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const entity = await db.getEntityById(input.id);
      if (!entity) {
        throw new Error("Entity not found");
      }
      return entity;
    }),

  /**
   * Create a new entity
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        entityType: z.enum(["person", "company"]),
        industry: z.string().optional(),
        website: z.string().url().optional().or(z.literal("")),
        description: z.string().optional(),
        monitoringEnabled: z.boolean().optional(),
        monitoringFrequency: z.enum(["weekly", "biweekly", "monthly"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // TODO: Get agency ID from user context
      const agencyId = 1;

      const entityId = await db.createEntity({
        agencyId,
        name: input.name,
        entityType: input.entityType,
        industry: input.industry || null,
        website: input.website || null,
        description: input.description || null,
        monitoringEnabled: input.monitoringEnabled ? 1 : 0,
        monitoringFrequency: input.monitoringFrequency || "weekly",
      });

      return { id: entityId };
    }),

  /**
   * Update an existing entity
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        entityType: z.enum(["person", "company"]).optional(),
        industry: z.string().optional(),
        website: z.string().url().optional().or(z.literal("")),
        description: z.string().optional(),
        monitoringEnabled: z.boolean().optional(),
        monitoringFrequency: z.enum(["weekly", "biweekly", "monthly"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input;

      // Convert boolean to int for database
      const dbData: any = { ...updateData };
      if (updateData.monitoringEnabled !== undefined) {
        dbData.monitoringEnabled = updateData.monitoringEnabled ? 1 : 0;
      }

      await db.updateEntity(id, dbData);
      return { success: true };
    }),

  /**
   * Delete an entity
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteEntity(input.id);
      return { success: true };
    }),

  /**
   * Toggle monitoring for an entity
   */
  toggleMonitoring: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        enabled: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      await db.updateEntity(input.id, {
        monitoringEnabled: input.enabled ? 1 : 0,
        nextAuditAt: input.enabled ? new Date() : null,
      });
      return { success: true };
    }),
});
