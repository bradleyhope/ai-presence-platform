import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { eq } from "drizzle-orm";
import { reports, audits, entities, agencies, queries } from "../../drizzle/schema";
import { generatePDFReport } from "../services/pdfReport";
import { analyzeAudit } from "../services/analytics";
import { storagePut } from "../storage";
import { TRPCError } from "@trpc/server";

export const reportsRouter = router({
  /**
   * List all reports for the user's agency
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    // TODO: Get agency ID from user context
    const agencyId = 1;
    return await db.getReportsByAgency(agencyId);
  }),

  /**
   * Generate a new report for an audit
   */
  generate: protectedProcedure
    .input(
      z.object({
        auditId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // TODO: Get agency ID from user context
      const agencyId = 1;

      // Verify audit exists
      const audit = await db.getAuditById(input.auditId);
      if (!audit) {
        throw new Error("Audit not found");
      }

      // Create report record
      const reportId = await db.createReport({
        auditId: input.auditId,
        agencyId,
        reportType: "audit",
        status: "pending",
      });

      // TODO: Trigger background job to generate PDF report
      // For now, we'll return the report ID

      return { id: reportId };
    }),

  /**
   * Get download URL for a report
   */
  getDownloadUrl: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db_instance = await db.getDb();
      if (!db_instance) {
        throw new Error("Database not available");
      }

      const result = await db_instance
        .select()
        .from(reports)
        .where(eq(reports.id, input.id))
        .limit(1);

      if (result.length === 0) {
        throw new Error("Report not found");
      }

      const report = result[0];

      if (report.status !== "completed" || !report.fileUrl) {
        throw new Error("Report not ready");
      }

      return { url: report.fileUrl };
    }),

  /**
   * Generate PDF report for an audit
   */
  generatePDF: protectedProcedure
    .input(z.object({ auditId: z.number() }))
    .mutation(async ({ input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Get audit
      const auditResult = await database.select().from(audits).where(eq(audits.id, input.auditId)).limit(1);
      if (auditResult.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Audit not found" });
      }
      const audit = auditResult[0];

      // Get entity
      const entityResult = await database.select().from(entities).where(eq(entities.id, audit.entityId)).limit(1);
      if (entityResult.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Entity not found" });
      }
      const entity = entityResult[0];

      // Get agency
      const agencyResult = await database.select().from(agencies).where(eq(agencies.id, entity.agencyId)).limit(1);
      if (agencyResult.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Agency not found" });
      }
      const agency = agencyResult[0];

      // Get queries
      const queriesResult = await database.select().from(queries).where(eq(queries.auditId, input.auditId));

      // Generate analytics
      const analytics = analyzeAudit(queriesResult, entity.entityType, entity.industry || 'general');

      // Generate PDF
      const pdfBuffer = await generatePDFReport({
        audit,
        entity,
        agency,
        queries: queriesResult,
        analytics,
      });

      // Upload to S3
      const fileKey = `reports/audit-${input.auditId}-${Date.now()}.pdf`;
      const { url } = await storagePut(fileKey, pdfBuffer, 'application/pdf');

      // Save report record
      await database.insert(reports).values({
        auditId: input.auditId,
        agencyId: entity.agencyId,
        reportType: 'audit',
        fileUrl: url,
        status: 'completed',
        generatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return { url };
    }),
});
