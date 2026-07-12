import { createClient } from "@supabase/supabase-js";

// Fall back to placeholders so `createClient` doesn't throw at module load
// during Next.js pre-render if env vars aren't set. Runtime queries will
// fail (and the UI degrades gracefully) instead of breaking the build.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

export const supabase = createClient(url, key, {
  auth: { persistSession: false },
});
