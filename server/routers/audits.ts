import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { eq } from "drizzle-orm";
import { audits } from "../../drizzle/schema";
import { getDb } from "../db";
import { queryAIPlatform, queryAIPlatformWebSearch } from "../services/aiQuery";

export const auditsRouter = router({
  /**
   * Get a single audit by ID
   */
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      const result = await database.select().from(audits).where(eq(audits.id, input.id)).limit(1);
      if (result.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Audit not found" });
      }
      return result[0];
    }),

  /**
   * List all audits for the user's agency
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    // TODO: Get agency ID from user context
    const agencyId = 1;
    return await db.getAuditsByAgency(agencyId);
  }),

  /**
   * Get a single audit by ID with its queries
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const audit = await db.getAuditById(input.id);
      if (!audit) {
        throw new Error("Audit not found");
      }

      const queries = await db.getQueriesByAudit(input.id);

      return {
        ...audit,
        queries,
      };
    }),

  /**
   * Create a new audit and start executing queries
   */
  create: protectedProcedure
    .input(
      z.object({
        entityId: z.number(),
        queries: z.array(z.string()).min(1, "At least one query is required"),
        platforms: z.array(z.enum(["chatgpt", "perplexity", "gemini", "claude", "grok"])).min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // TODO: Get agency ID from user context
      const agencyId = 1;

      // Get entity to verify it exists
      const entity = await db.getEntityById(input.entityId);
      if (!entity) {
        throw new Error("Entity not found");
      }

      // Create audit
      const totalQueries = input.queries.length * input.platforms.length;
      const auditId = await db.createAudit({
        entityId: input.entityId,
        agencyId,
        auditType: "manual",
        status: "pending",
        totalQueries,
        completedQueries: 0,
      });

      // Create query records for each query/platform combination
      // Run BOTH standard LLM and web search queries for comprehensive coverage
      for (const queryText of input.queries) {
        for (const platform of input.platforms) {
          // Standard LLM query (training data)
          await db.createQuery({
            auditId,
            platform,
            queryText,
            status: "pending",
            queryType: "llm",
          });

          // Web search query (current web sources)
          await db.createQuery({
            auditId,
            platform: `${platform}_web` as any,
            queryText,
            status: "pending",
            queryType: "web_search",
          });
        }
      }

      // Update audit status to running
      await db.updateAudit(auditId, {
        status: "running",
        startedAt: new Date(),
      });

      // TODO: Trigger background job to execute queries
      // For now, we'll return the audit ID and execute queries in a separate endpoint

      return { id: auditId };
    }),

  /**
   * Get queries for an audit
   */
  getQueries: protectedProcedure
    .input(z.object({ auditId: z.number() }))
    .query(async ({ input }) => {
      return await db.getQueriesByAudit(input.auditId);
    }),

  /**
   * Execute queries for an audit
   */
  executeQueries: protectedProcedure
    .input(z.object({ auditId: z.number() }))
    .mutation(async ({ input }) => {
      const audit = await db.getAuditById(input.auditId);
      if (!audit) {
        throw new Error("Audit not found");
      }

      const queries = await db.getQueriesByAudit(input.auditId);
      const pendingQueries = queries.filter((q) => q.status === "pending");

      console.log(`[Audit ${input.auditId}] Executing ${pendingQueries.length} pending queries`);

      // Execute queries sequentially to avoid rate limiting
      let completed = 0;
      for (const query of pendingQueries) {
        try {
          // Update query status to running
          await db.updateQuery(query.id, {
            status: "running",
          });

          // Execute the query (use web search for _web platforms)
          let result;
          if (query.platform.endsWith('_web')) {
            const basePlatform = query.platform.replace('_web', '');
            result = await queryAIPlatformWebSearch(basePlatform, query.queryText);
          } else {
            result = await queryAIPlatform(query.platform, query.queryText);
          }

          // Update query with results
          await db.updateQuery(query.id, {
            status: result.error ? "failed" : "completed",
            responseText: result.responseText,
            citations: JSON.stringify(result.citations),
            errorMessage: result.error || null,
            executedAt: new Date(),
          });

          if (!result.error) {
            completed++;
          }

          console.log(
            `[Audit ${input.auditId}] Query ${query.id} (${query.platform}): ${result.error ? "failed" : "completed"}`
          );
        } catch (error: any) {
          console.error(`[Audit ${input.auditId}] Query ${query.id} error:`, error);
          await db.updateQuery(query.id, {
            status: "failed",
            errorMessage: error.message,
            executedAt: new Date(),
          });
        }
      }

      // Update audit status
      const allQueries = await db.getQueriesByAudit(input.auditId);
      const completedCount = allQueries.filter((q) => q.status === "completed").length;
      const allDone = allQueries.every((q) => q.status === "completed" || q.status === "failed");

      await db.updateAudit(input.auditId, {
        completedQueries: completedCount,
        status: allDone ? "completed" : "running",
        completedAt: allDone ? new Date() : null,
      });

      console.log(`[Audit ${input.auditId}] Completed ${completed}/${pendingQueries.length} queries`);

      return {
        completed,
        total: pendingQueries.length,
      };
    }),

  /**
   * Get analysis for an audit
   */
  getAnalysis: protectedProcedure
    .input(z.object({ auditId: z.number() }))
    .query(async ({ input }) => {
      const audit = await db.getAuditById(input.auditId);
      if (!audit) {
        throw new Error("Audit not found");
      }

      const queries = await db.getQueriesByAudit(input.auditId);

      // Calculate basic analysis
      const completedQueries = queries.filter((q) => q.status === "completed");
      const failedQueries = queries.filter((q) => q.status === "failed");

      // Extract all citations
      const allCitations: any[] = [];
      for (const query of completedQueries) {
        if (query.citations) {
          try {
            const citations = JSON.parse(query.citations);
            allCitations.push(...citations);
          } catch (e) {
            // Ignore parse errors
          }
        }
      }

      // Count unique sources
      const uniqueSources = new Set(allCitations.map((c) => c.url || c.source));

      return {
        totalQueries: queries.length,
        completedQueries: completedQueries.length,
        failedQueries: failedQueries.length,
        successRate: queries.length > 0 ? (completedQueries.length / queries.length) * 100 : 0,
        uniqueSources: uniqueSources.size,
        topSources: Array.from(uniqueSources).slice(0, 10),
      };
    }),
});
