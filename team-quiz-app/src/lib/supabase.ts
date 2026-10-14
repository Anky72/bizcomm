import { createClient } from "@supabase/supabase-js";

export function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Server database configuration is missing.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
export const totalSeconds = () => Math.max(60, Number(process.env.QUIZ_TOTAL_SECONDS || 600));
export const questionSeconds = () => Math.max(10, Number(process.env.QUESTION_SECONDS || 45));
