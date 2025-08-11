import { supabase } from "@/lib/supabaseClient";

export async function ensureAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    try {
      await supabase.auth.signInAnonymously();
    } catch (e: any) {
      console.warn("Anonymous sign-ins disabled in Supabase Auth. Enable it or sign in normally.", e?.message);
    }
  }
}
