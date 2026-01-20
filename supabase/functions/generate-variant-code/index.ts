// Supabase Edge Function for generating variant HTML/CSS code
// Generates a single variant based on plan, uploads to Storage
// Deploy with: supabase functions deploy generate-variant-code

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GenerateCodeRequest {
  sessionId: string
  planId: string
  variantIndex: number
  plan: {
    title: string
    description: string
    keyChanges: string[]
    styleNotes: string
  }
  sourceHtml: string
  uiMetadata?: Record<string, unknown>
  productContext?: string
  provider?: 'anthropic' | 'openai' | 'google'
  model?: string
}

// System prompt for code generation
const SYSTEM_PROMPT = `You are an expert front-end developer implementing a UI variant based on a design specification.

Your task is to modify the source HTML according to the variant plan provided. The result should be a complete, self-contained HTML document.

CRITICAL REQUIREMENTS:
1. Return ONLY the complete HTML document - no explanations, no markdown code blocks
2. Preserve all functionality from the original (forms, links, scripts)
3. Use inline styles for all CSS changes (no external stylesheets)
4. Ensure the HTML is valid and renders correctly in modern browsers
5. Implement ALL key changes from the variant plan
6. Maintain responsive design patterns from the original

IMPLEMENTATION GUIDELINES:
- For color changes: Update background-color, color, border-color properties
- For typography changes: Modify font-family, font-size, font-weight, line-height
- For layout changes: Adjust display, flex, grid, padding, margin properties
- For new components: Insert complete HTML with inline styles
- For removal: Delete the elements entirely (don't just hide them)

Start your response directly with <!DOCTYPE html> or <html>.`

function buildCodePrompt(request: GenerateCodeRequest): string {
  let prompt = `Variant Plan to Implement:\n`
  prompt += `Title: ${request.plan.title}\n`
  prompt += `Description: ${request.plan.description}\n`
  prompt += `Key Changes:\n${request.plan.keyChanges.map(c => `- ${c}`).join('\n')}\n`
  prompt += `Style Notes: ${request.plan.styleNotes}\n\n`

  if (request.productContext) {
    prompt += `Product Context:\n${request.productContext.slice(0, 1500)}\n\n`
  }

  if (request.uiMetadata) {
    prompt += `Original UI uses:\n`
    prompt += `${JSON.stringify(request.uiMetadata, null, 2).slice(0, 1000)}\n\n`
  }

  prompt += `Source HTML to Modify:\n${request.sourceHtml}\n\n`
  prompt += `Generate the complete modified HTML document implementing this variant. Return ONLY the HTML.`

  return prompt
}

// Clean HTML response
function cleanHtmlResponse(html: string): string {
  let cleaned = html.trim()

  // Remove markdown code blocks
  if (cleaned.startsWith('```html')) {
    cleaned = cleaned.slice(7)
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3)
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3)
  }

  return cleaned.trim()
}

// Generate with Anthropic
async function generateWithAnthropic(apiKey: string, model: string, prompt: string): Promise<string> {
  console.log('[generate-variant-code] Calling Anthropic API')

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model || 'claude-sonnet-4-20250514',
      max_tokens: 16384,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Anthropic API error')
  }

  const data = await response.json()
  return cleanHtmlResponse(data.content[0]?.text || '')
}

// Generate with OpenAI
async function generateWithOpenAI(apiKey: string, model: string, prompt: string): Promise<string> {
  console.log('[generate-variant-code] Calling OpenAI API')

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'gpt-4o',
      max_tokens: 16384,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'OpenAI API error')
  }

  const data = await response.json()
  return cleanHtmlResponse(data.choices[0]?.message?.content || '')
}

// Generate with Google
async function generateWithGoogle(apiKey: string, model: string, prompt: string): Promise<string> {
  console.log('[generate-variant-code] Calling Google API')

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-1.5-pro'}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: SYSTEM_PROMPT + '\n\n' + prompt }] }],
        generationConfig: { maxOutputTokens: 16384 },
      }),
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Google AI API error')
  }

  const data = await response.json()
  return cleanHtmlResponse(data.candidates?.[0]?.content?.parts?.[0]?.text || '')
}

// Upload files to storage
async function uploadVariantFiles(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  sessionId: string,
  variantIndex: number,
  html: string
): Promise<{ htmlPath: string; htmlUrl: string }> {
  const htmlPath = `${userId}/${sessionId}/variant_${variantIndex}.html`

  // Upload HTML
  const { error: uploadError } = await supabase.storage
    .from('vibe-files')
    .upload(htmlPath, new Blob([html], { type: 'text/html' }), {
      contentType: 'text/html',
      upsert: true,
    })

  if (uploadError) {
    console.error('[generate-variant-code] Storage upload error:', uploadError)
    throw new Error(`Failed to upload HTML to storage: ${uploadError.message}. Ensure the 'vibe-files' bucket exists and has proper permissions.`)
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('vibe-files')
    .getPublicUrl(htmlPath)

  return {
    htmlPath,
    htmlUrl: urlData.publicUrl,
  }
}

Deno.serve(async (req) => {
  console.log('[generate-variant-code] Request received:', req.method)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()

  // Store parsed body for error handling
  let parsedBody: GenerateCodeRequest | null = null

  try {
    // Environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }

    // Verify authorization
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('Missing or invalid authorization header')
    }
    const jwt = authHeader.replace('Bearer ', '')

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify user
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt)
    if (userError || !user) {
      throw new Error(`Unauthorized: ${userError?.message || 'Invalid token'}`)
    }
    console.log('[generate-variant-code] User authenticated:', user.id)

    // Parse request and store for error handling
    parsedBody = await req.json()
    const body = parsedBody
    console.log('[generate-variant-code] Generating variant', body.variantIndex, 'for session:', body.sessionId)

    if (!body.sessionId || !body.planId || !body.variantIndex || !body.plan || !body.sourceHtml) {
      throw new Error('Missing required fields')
    }

    // Update variant status to generating
    await supabase
      .from('vibe_variants')
      .upsert({
        session_id: body.sessionId,
        plan_id: body.planId,
        variant_index: body.variantIndex,
        html_path: '',
        html_url: '',
        status: 'generating',
      }, {
        onConflict: 'session_id,variant_index',
      })

    // Get user's API key
    const requestedProvider = body.provider
    let keyQuery = supabase
      .from('user_api_key_refs')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (requestedProvider) {
      keyQuery = keyQuery.eq('provider', requestedProvider)
    }

    const { data: keyConfigs, error: keyError } = await keyQuery.limit(1)
    const keyConfig = keyConfigs?.[0]

    if (keyError || !keyConfig) {
      throw new Error('No API key configured. Please add your API key in Settings.')
    }

    const modelToUse = body.model || keyConfig.model
    console.log('[generate-variant-code] Using provider:', keyConfig.provider, 'model:', modelToUse)

    // Get decrypted API key
    const { data: apiKey, error: decryptError } = await supabase
      .rpc('get_api_key', { p_user_id: user.id, p_provider: keyConfig.provider })

    if (decryptError || !apiKey) {
      throw new Error('Failed to retrieve API key')
    }

    // Build prompt
    const prompt = buildCodePrompt(body)

    // Generate code based on provider
    let generatedHtml: string

    switch (keyConfig.provider) {
      case 'anthropic':
        generatedHtml = await generateWithAnthropic(apiKey, modelToUse, prompt)
        break
      case 'openai':
        generatedHtml = await generateWithOpenAI(apiKey, modelToUse, prompt)
        break
      case 'google':
        generatedHtml = await generateWithGoogle(apiKey, modelToUse, prompt)
        break
      default:
        throw new Error(`Unsupported provider: ${keyConfig.provider}`)
    }

    console.log('[generate-variant-code] Generated HTML length:', generatedHtml.length)

    // Validate generated HTML has content
    if (!generatedHtml || generatedHtml.length < 100) {
      throw new Error('Generated HTML is too short or empty')
    }

    // Upload to storage
    console.log('[generate-variant-code] Uploading to storage...')
    const { htmlPath, htmlUrl } = await uploadVariantFiles(
      supabase,
      user.id,
      body.sessionId,
      body.variantIndex,
      generatedHtml
    )

    const duration = Date.now() - startTime

    // Update variant record
    const { data: savedVariant, error: saveError } = await supabase
      .from('vibe_variants')
      .upsert({
        session_id: body.sessionId,
        plan_id: body.planId,
        variant_index: body.variantIndex,
        html_path: htmlPath,
        html_url: htmlUrl,
        generation_model: modelToUse,
        generation_duration_ms: duration,
        status: 'complete',
      }, {
        onConflict: 'session_id,variant_index',
      })
      .select()
      .single()

    if (saveError) {
      console.error('[generate-variant-code] Failed to save variant:', saveError)
      throw new Error(`Failed to save variant to database: ${saveError.message}`)
    }

    if (!savedVariant) {
      throw new Error('Variant saved but no data returned')
    }

    // Check if all variants are complete
    const { data: allVariants } = await supabase
      .from('vibe_variants')
      .select('status')
      .eq('session_id', body.sessionId)

    const allComplete = allVariants?.length === 4 && allVariants.every(v => v.status === 'complete')

    if (allComplete) {
      await supabase
        .from('vibe_sessions')
        .update({ status: 'complete' })
        .eq('id', body.sessionId)
      console.log('[generate-variant-code] All variants complete, session marked complete')
    }

    console.log('[generate-variant-code] Variant', body.variantIndex, 'complete in', duration, 'ms')

    return new Response(
      JSON.stringify({
        success: true,
        variant: savedVariant,
        htmlUrl,
        htmlPath,
        generatedHtmlLength: generatedHtml.length,
        durationMs: duration,
        model: modelToUse,
        provider: keyConfig.provider,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[generate-variant-code] Error:', errorMessage)

    // Try to update variant status to failed using the already-parsed body
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      if (supabaseUrl && supabaseServiceKey && parsedBody?.sessionId && parsedBody?.variantIndex) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        const { error: updateError } = await supabase
          .from('vibe_variants')
          .update({ status: 'failed', error_message: errorMessage })
          .eq('session_id', parsedBody.sessionId)
          .eq('variant_index', parsedBody.variantIndex)

        if (updateError) {
          console.error('[generate-variant-code] Failed to update variant status:', updateError)
        } else {
          console.log('[generate-variant-code] Variant status updated to failed')
        }
      }
    } catch (cleanupError) {
      console.error('[generate-variant-code] Error during cleanup:', cleanupError)
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        variantIndex: parsedBody?.variantIndex,
        sessionId: parsedBody?.sessionId,
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
