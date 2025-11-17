import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { entitiesRouter } from "./routers/entities";
import { auditsRouter } from "./routers/audits";
import { reportsRouter } from "./routers/reports";
import { monitoringRouter } from "./routers/monitoring";
import { analyticsRouter } from "./routers/analytics";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  entities: entitiesRouter,
  audits: auditsRouter,
  reports: reportsRouter,
  monitoring: monitoringRouter,
  analytics: analyticsRouter,
});

export type AppRouter = typeof appRouter;
