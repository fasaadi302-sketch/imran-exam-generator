/**
 * aiGenerate.js
 * Calls the `generate-mcqs` Supabase Edge Function, which securely talks to
 * z.ai's GLM-4.7-Flash model server-side (API key never touches the browser).
 */

import { supabase, supabaseConfigured } from '../lib/supabase'

/**
 * Ask the AI to draft MCQs from a topic or extracted source text.
 *
 * @param {{ topic?: string, count?: number, sourceText?: string }} params
 * @returns {Promise<string>} formatted MCQ text, ready for the parser
 * @throws {Error} with a user-friendly message if generation fails
 */
export async function generateMCQsWithAI({ topic, count = 5, sourceText }) {
  if (!supabaseConfigured) {
    throw new Error(
      'AI generation isn\'t set up yet. Add your Supabase URL and key in src/lib/supabase.js first.'
    )
  }

  const { data, error } = await supabase.functions.invoke('generate-mcqs', {
    body: { topic, count, sourceText },
  })

  if (error) {
    // Try to surface the function's own error message if it sent one.
    const detail = error?.context?.body
      ? await tryParseErrorBody(error.context.body)
      : null
    throw new Error(detail || error.message || 'Failed to generate questions. Please try again.')
  }

  if (data?.error) {
    throw new Error(data.error)
  }

  if (!data?.text) {
    throw new Error('The AI did not return any questions. Please try again.')
  }

  return data.text
}

async function tryParseErrorBody(body) {
  try {
    const text = typeof body === 'string' ? body : await new Response(body).text()
    const parsed = JSON.parse(text)
    return parsed?.error || null
  } catch {
    return null
  }
}
