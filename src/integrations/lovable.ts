import { supabase } from "@/integrations/supabase/client";

export const lovable = {
  auth: {
    signInWithOAuth: async (provider: "google", options?: { redirect_uri?: string }) => {
      return await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: options?.redirect_uri || window.location.origin },
      });
    },
  },
};
