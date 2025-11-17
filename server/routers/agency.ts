import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { agencies } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { storagePut } from "../storage";

export const agencyRouter = router({
  /**
   * Get agency settings
   */
  get: protectedProcedure.query(async () => {
    // TODO: Get agency ID from user context
    const agencyId = 1;
    
    const database = await getDb();
    if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    
    const result = await database.select().from(agencies).where(eq(agencies.id, agencyId)).limit(1);
    if (result.length === 0) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Agency not found" });
    }
    return result[0];
  }),

  /**
   * Update agency settings
   */
  update: protectedProcedure
    .input(z.object({
      name: z.string().optional(),
      email: z.string().email().optional(),
    }))
    .mutation(async ({ input }) => {
      // TODO: Get agency ID from user context
      const agencyId = 1;
      
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      await database.update(agencies)
        .set({
          ...input,
          updatedAt: new Date(),
        })
        .where(eq(agencies.id, agencyId));
      
      return { success: true };
    }),

  /**
   * Upload agency logo
   */
  uploadLogo: protectedProcedure
    .input(z.object({
      fileData: z.string(), // base64 encoded image
      fileName: z.string(),
      mimeType: z.string(),
    }))
    .mutation(async ({ input }) => {
      // TODO: Get agency ID from user context
      const agencyId = 1;
      
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      // Convert base64 to buffer
      const base64Data = input.fileData.split(',')[1] || input.fileData;
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Upload to S3
      const fileKey = `agency-${agencyId}/logo-${Date.now()}-${input.fileName}`;
      const { url } = await storagePut(fileKey, buffer, input.mimeType);
      
      // Update agency with logo URL
      await database.update(agencies)
        .set({
          logoUrl: url,
          updatedAt: new Date(),
        })
        .where(eq(agencies.id, agencyId));
      
      return { url };
    }),
});
