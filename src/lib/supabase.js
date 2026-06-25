/**
 * supabase.js — your database connection.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  HOW TO SET THIS UP (one time, ~5 minutes):
 *
 *  1. Go to https://supabase.com  →  sign up (free)  →  "New Project".
 *  2. Wait ~2 min for it to finish setting up.
 *  3. In your project, open  Settings (gear icon) → API.
 *  4. Copy two values into the lines below:
 *       • "Project URL"            →  SUPABASE_URL
 *       • "anon public" API key    →  SUPABASE_ANON_KEY
 *  5. Open the SQL Editor (left sidebar) → "New query" → paste the contents
 *     of  supabase/schema.sql  (included in this project) → click "Run".
 *
 *  That's it. Until you fill these in, the app still works perfectly —
 *  it just won't log visits or papers (logging is silently skipped).
 * ─────────────────────────────────────────────────────────────────────────
 */

import { createClient } from '@supabase/supabase-js'

// ===== PASTE YOUR TWO SUPABASE VALUES BETWEEN THE QUOTES BELOW =====
const SUPABASE_URL      = 'https://fpswwfgqafodmhslcmxp.supabase.co'   // e.g. 'https://abcd1234.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwc3d3ZmdxYWZvZG1oc2xjbXhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4ODc0MzksImV4cCI6MjA5NzQ2MzQzOX0.DjquVLkbR7_ggo9AIbyIYlvm6fJM4vudDZArbZlLXNk'   // the long "anon public" key
// ===================================================================

/** True only when both values above have been filled in. */
export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

/** The Supabase client, or null if not configured yet. */
export const supabase = supabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null
