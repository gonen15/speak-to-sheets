import { supabase } from "@/lib/supabaseClient";

export async function ensureAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    try {
      await supabase.auth.signInAnonymously();
    } catch (e) {
      console.error("Anonymous sign-in failed", e);
    }
  }
}
