import { router } from "../trpc";
import { interviewRouter } from "./interview";

export const appRouter = router({
  interview: interviewRouter,
});

export type AppRouter = typeof appRouter;
