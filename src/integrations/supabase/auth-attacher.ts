import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "./client";

/**
 * Client-side function middleware registered in `src/start.ts`.
 * Retrieves the current authenticated session or active user session
 * and attaches `Authorization: Bearer <token>` to serverFn RPC HTTP requests.
 */
export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    let token: string | undefined;

    try {
      const { data } = await supabase.auth.getSession();
      token = data.session?.access_token;
    } catch {
      // Ignore auth retrieval errors
    }

    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
);
