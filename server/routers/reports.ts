import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { eq } from "drizzle-orm";
import { reports } from "../../drizzle/schema";

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
});
