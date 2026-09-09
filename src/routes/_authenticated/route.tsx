import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { FiltersProvider } from "@/lib/analytics/store";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        throw redirect({ to: "/auth" });
      }

      return { user: data.user };
    } catch (error) {
      if (error instanceof Error && "to" in (error as any)) {
        throw error;
      }

      throw redirect({ to: "/auth" });
    }
  },
  component: () => (
    <FiltersProvider>
      <Outlet />
    </FiltersProvider>
  ),
});
