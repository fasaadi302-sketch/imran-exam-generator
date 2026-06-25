/**
 * normalize-notes — Supabase Edge Function
 *
 * Takes ANY raw notes text (no matter how messy or inconsistently formatted)
 * and uses z.ai GLM-4.7-Flash to normalize it into a clean, consistently
 * numbered Q&A format that the notes parser can reliably process.
 *
 * Deploy: supabase functions deploy normalize-notes
 * Secret: same ZAI_API_KEY used by generate-mcqs
 */

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const ZAI_API_URL = 'https://api.z.ai/api/paas/v4/chat/completions'
const ZAI_MODEL   = 'glm-4.7-flash'

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { rawText } = await req.json()
    if (!rawText?.trim()) return jsonResp({ error: 'No text provided.' }, 400)

    const apiKey = Deno.env.get('ZAI_API_KEY')
    if (!apiKey) return jsonResp({ error: 'ZAI_API_KEY not configured on server.' }, 500)

    const prompt = `You are a note formatting assistant. The user has given you raw study notes in ANY format — it could be messy, inconsistent, in Urdu, English, or mixed, with no clear structure.

Your job: convert it into a clean, numbered Q&A format. Follow these EXACT rules:

1. Each question-answer pair must be on its own numbered item starting with "1.", "2.", etc.
2. Format: number, two spaces, question text on the first line. Then the answer on the next line(s), indented with 4 spaces.
3. If the text has headings or topic names (not Q&A), format them as: ## Heading Text
4. Do NOT change the language — if the notes are in Urdu, keep them in Urdu. If mixed, keep them mixed.
5. Do NOT add, invent, or remove any information. Only reformat what is already there.
6. Do NOT add any preamble, explanation, or commentary — output ONLY the formatted notes.
7. If something is clearly a question, make it the question. Everything that answers it is the answer.
8. If the input is already clean and structured, return it as-is in the correct format.

Here are the raw notes to format:

"""
${rawText.slice(0, 15000)}
"""`

    const res = await fetch(ZAI_API_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model:       ZAI_MODEL,
        messages:    [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens:  4000,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('z.ai error:', res.status, err)
      return jsonResp({ error: `AI service error (${res.status}). Please try again.` }, 502)
    }

    const zaiData = await res.json()
    const text    = zaiData?.choices?.[0]?.message?.content?.trim()
    if (!text) return jsonResp({ error: 'AI returned empty response.' }, 502)

    return jsonResp({ text }, 200)

  } catch (err) {
    console.error('normalize-notes error:', err)
    return jsonResp({ error: 'Something went wrong. Please try again.' }, 500)
  }
})

function jsonResp(body: object, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
