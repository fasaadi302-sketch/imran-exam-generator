// ============================================================================
//  generate-mcqs — Supabase Edge Function
//
//  Receives a topic (or extracted source text) and calls z.ai's GLM-4.7-Flash
//  model to draft nursing-exam-style MCQs in the exact format this app's
//  parser already understands.
//
//  WHY THIS LIVES HERE AND NOT IN THE BROWSER:
//  Your z.ai API key must never be visible in frontend code — anyone could
//  open dev tools and steal it. This function runs on Supabase's servers,
//  keeps the key in a server-side secret, and only ever returns the
//  generated text to your app.
//
//  ── ONE-TIME SETUP ──────────────────────────────────────────────────────
//  1. Install the Supabase CLI if you haven't:  npm install -g supabase
//  2. From your project root, log in:           supabase login
//  3. Link this project:                         supabase link --project-ref <your-project-ref>
//     (find <your-project-ref> in your Supabase dashboard URL)
//  4. Set your z.ai key as a secret (never commit it to git):
//       supabase secrets set ZAI_API_KEY=your_real_key_here
//  5. Deploy this function:
//       supabase functions deploy generate-mcqs
//
//  That's it — your frontend calls this function by name, the key never
//  leaves Supabase's servers.
// ============================================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const ZAI_API_URL = 'https://api.z.ai/api/paas/v4/chat/completions'
const ZAI_MODEL = 'glm-4.7-flash'

// CORS headers so your deployed app (any origin) can call this function.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { topic, count, sourceText } = await req.json()

    if (!topic && !sourceText) {
      return jsonResponse({ error: 'Please provide a topic or source text.' }, 400)
    }

    const numQuestions = Math.min(Math.max(Number(count) || 5, 1), 10)
    const apiKey = Deno.env.get('ZAI_API_KEY')

    if (!apiKey) {
      return jsonResponse(
        { error: 'Server is not configured with a z.ai API key yet. Set the ZAI_API_KEY secret in Supabase.' },
        500
      )
    }

    // ── Build the prompt ──────────────────────────────────────────────────
    const basis = sourceText
      ? `the following source material (these are study notes — do NOT copy the Q&A structure from the notes, instead write FRESH multiple-choice questions based on the TOPICS and FACTS in these notes):\n\n"""\n${sourceText.slice(0, 12000)}\n"""`
      : `the topic: "${topic}"`

    const prompt = `You are writing multiple-choice exam questions for a nursing college exam (Maternal & Child Health / General Nursing curriculum). Write exactly ${numQuestions} MCQs based on ${basis}.

CRITICAL RULES — follow exactly:
- Write FRESH multiple-choice questions. Do NOT copy or reuse any Q&A pairs from the source notes as-is.
- Each MCQ must have ONE question and EXACTLY 4 options labeled a) b) c) d)
- Format every question like this EXACT pattern (all on related lines, options inline):
  1.  Question text here? a) Option one. b) Option two. c) Option three. d) Option four.
- Leave one blank line between questions.
- Number questions starting from 1.
- Do NOT include the correct answer, answer key, or explanation.
- Distractor options must be clinically plausible — not silly or obviously wrong.
- Use clear exam-appropriate English. Be clinically precise and factually accurate.
- Output ONLY the numbered questions — no preamble, no title, no commentary.`

    // ── Call z.ai ────────────────────────────────────────────────────────
    const zaiRes = await fetch(ZAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: ZAI_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.6,
        max_tokens: 2000,
      }),
    })

    if (!zaiRes.ok) {
      const errText = await zaiRes.text()
      console.error('z.ai error:', zaiRes.status, errText)
      return jsonResponse(
        { error: `The AI service returned an error (${zaiRes.status}). Please try again in a moment.` },
        502
      )
    }

    const zaiData = await zaiRes.json()
    const generatedText = zaiData?.choices?.[0]?.message?.content?.trim()

    if (!generatedText) {
      return jsonResponse({ error: 'The AI service returned an empty response. Please try again.' }, 502)
    }

    return jsonResponse({ text: generatedText }, 200)

  } catch (err) {
    console.error('generate-mcqs error:', err)
    return jsonResponse({ error: 'Something went wrong generating questions. Please try again.' }, 500)
  }
})

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
