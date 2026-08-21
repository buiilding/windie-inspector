import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabasePublishableKey = process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY;

/**
 * The hosted Inspector is unavailable until its public Supabase configuration
 * has been supplied at build time. Returning `null` keeps a bad deployment
 * closed instead of accidentally exposing the local-runtime UI without login.
 */
export const supabase =
  supabaseUrl && supabasePublishableKey
    ? createClient(supabaseUrl, supabasePublishableKey)
    : null;
