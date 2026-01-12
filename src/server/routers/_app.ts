import { router } from "../trpc";
import { interviewRouter } from "./interview";
import { chatRouter } from "./chat";

export const appRouter = router({
  interview: interviewRouter,
  chat: chatRouter,
});

export type AppRouter = typeof appRouter;
