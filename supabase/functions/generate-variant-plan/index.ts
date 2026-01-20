// Supabase Edge Function for generating variant plans
// Creates 4 variant concepts from LLM based on user prompt
// Deploy with: supabase functions deploy generate-variant-plan

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GeneratePlanRequest {
  sessionId: string
  prompt: string
  compactedHtml: string
  uiMetadata?: {
    colors: Record<string, string[]>
    typography: Record<string, string[]>
    layout: Record<string, string[]>
    components: Array<{ type: string; count: number }>
  }
  productContext?: string
  provider?: 'anthropic' | 'openai' | 'google'
  model?: string
}

interface VariantPlan {
  variantIndex: number
  title: string
  description: string
  keyChanges: string[]
  styleNotes: string
}

// System prompt for plan generation
const SYSTEM_PROMPT = `You are an expert UI/UX designer tasked with generating creative variant concepts for a web page redesign.

Given a source HTML page and a user's modification request, you must create exactly 4 distinct variant concepts.

CRITICAL REQUIREMENTS:
1. Return ONLY valid JSON - no markdown, no code blocks, no explanations
2. Generate exactly 4 variants with indices 1, 2, 3, 4
3. Each variant must be meaningfully different from the others
4. Each variant must address the user's request in a unique way

The variants should represent a range of approaches:
- Variant 1: Conservative - Minimal changes, stays close to original design
- Variant 2: Modern - Contemporary design trends and patterns
- Variant 3: Bold - More dramatic changes, experimental approach
- Variant 4: Alternative - Different direction that still solves the problem

JSON Schema (MUST follow exactly):
{
  "variants": [
    {
      "variantIndex": 1,
      "title": "Short descriptive title (3-5 words)",
      "description": "2-3 sentence explanation of the variant's approach",
      "keyChanges": ["Change 1", "Change 2", "Change 3"],
      "styleNotes": "Brief notes on colors, typography, or styling approach"
    },
    // ... repeat for indices 2, 3, 4
  ]
}`

function buildPlanPrompt(request: GeneratePlanRequest): string {
  let prompt = `User Request: "${request.prompt}"\n\n`

  if (request.uiMetadata) {
    prompt += `Current UI Analysis:\n`
    prompt += `- Colors used: ${JSON.stringify(request.uiMetadata.colors.primary || [])}\n`
    prompt += `- Font families: ${JSON.stringify(request.uiMetadata.typography.fontFamilies || [])}\n`
    prompt += `- Layout systems: ${JSON.stringify(request.uiMetadata.layout.gridSystems || [])}\n`
    prompt += `- Components found: ${request.uiMetadata.components?.map(c => `${c.type}(${c.count})`).join(', ')}\n\n`
  }

  if (request.productContext) {
    prompt += `Product Context:\n${request.productContext.slice(0, 2000)}\n\n`
  }

  prompt += `Source HTML (compacted):\n${request.compactedHtml.slice(0, 15000)}\n\n`
  prompt += `Generate 4 variant concepts as a JSON object with a "variants" array. Return ONLY the JSON, no other text.`

  return prompt
}

// Parse and validate JSON response
function parseVariantPlans(response: string): VariantPlan[] {
  // Clean response
  let cleaned = response.trim()

  // Remove markdown code blocks if present
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7)
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3)
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3)
  }
  cleaned = cleaned.trim()

  // Parse JSON
  const parsed = JSON.parse(cleaned)

  // Extract variants array
  const variants = parsed.variants || parsed

  if (!Array.isArray(variants) || variants.length !== 4) {
    throw new Error(`Expected 4 variants, got ${Array.isArray(variants) ? variants.length : 'non-array'}`)
  }

  // Validate and normalize each variant
  return variants.map((v, i) => ({
    variantIndex: v.variantIndex || i + 1,
    title: v.title || `Variant ${i + 1}`,
    description: v.description || '',
    keyChanges: Array.isArray(v.keyChanges) ? v.keyChanges : [],
    styleNotes: v.styleNotes || '',
  }))
}

// Generate with Anthropic
async function generateWithAnthropic(apiKey: string, model: string, prompt: string): Promise<string> {
  console.log('[generate-variant-plan] Calling Anthropic API')

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model || 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Anthropic API error')
  }

  const data = await response.json()
  return data.content[0]?.text || ''
}

// Generate with OpenAI
async function generateWithOpenAI(apiKey: string, model: string, prompt: string): Promise<string> {
  console.log('[generate-variant-plan] Calling OpenAI API')

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'gpt-4o',
      max_tokens: 4096,
      response_format: { type: 'json_object' },
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
  return data.choices[0]?.message?.content || ''
}

// Generate with Google
async function generateWithGoogle(apiKey: string, model: string, prompt: string): Promise<string> {
  console.log('[generate-variant-plan] Calling Google API')

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-1.5-pro'}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: SYSTEM_PROMPT + '\n\n' + prompt }] }],
        generationConfig: {
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
        },
      }),
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Google AI API error')
  }

  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

Deno.serve(async (req) => {
  console.log('[generate-variant-plan] Request received:', req.method)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

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
    console.log('[generate-variant-plan] User authenticated:', user.id)

    // Parse request
    const body: GeneratePlanRequest = await req.json()
    console.log('[generate-variant-plan] Session:', body.sessionId, 'Prompt:', body.prompt?.slice(0, 100))

    if (!body.sessionId || !body.prompt || !body.compactedHtml) {
      throw new Error('Missing required fields: sessionId, prompt, compactedHtml')
    }

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
    console.log('[generate-variant-plan] Using provider:', keyConfig.provider, 'model:', modelToUse)

    // Get decrypted API key
    const { data: apiKey, error: decryptError } = await supabase
      .rpc('get_api_key', { p_user_id: user.id, p_provider: keyConfig.provider })

    if (decryptError || !apiKey) {
      throw new Error('Failed to retrieve API key')
    }

    // Build prompt
    const prompt = buildPlanPrompt(body)

    // Generate plan based on provider
    let rawResponse: string

    switch (keyConfig.provider) {
      case 'anthropic':
        rawResponse = await generateWithAnthropic(apiKey, modelToUse, prompt)
        break
      case 'openai':
        rawResponse = await generateWithOpenAI(apiKey, modelToUse, prompt)
        break
      case 'google':
        rawResponse = await generateWithGoogle(apiKey, modelToUse, prompt)
        break
      default:
        throw new Error(`Unsupported provider: ${keyConfig.provider}`)
    }

    console.log('[generate-variant-plan] Raw response length:', rawResponse.length)

    // Parse and validate variants
    const variantPlans = parseVariantPlans(rawResponse)
    console.log('[generate-variant-plan] Parsed', variantPlans.length, 'variants')

    // Save plans to database
    console.log('[generate-variant-plan] Saving plans to database...')

    const plansToInsert = variantPlans.map(plan => ({
      session_id: body.sessionId,
      variant_index: plan.variantIndex,
      title: plan.title,
      description: plan.description,
      key_changes: plan.keyChanges,
      style_notes: plan.styleNotes,
    }))

    // Delete existing plans for this session first
    await supabase
      .from('vibe_variant_plans')
      .delete()
      .eq('session_id', body.sessionId)

    const { data: savedPlans, error: saveError } = await supabase
      .from('vibe_variant_plans')
      .insert(plansToInsert)
      .select()

    if (saveError) {
      console.error('[generate-variant-plan] Failed to save plans:', saveError)
      throw new Error('Failed to save variant plans')
    }

    // Update session status
    await supabase
      .from('vibe_sessions')
      .update({ status: 'plan_ready' })
      .eq('id', body.sessionId)

    console.log('[generate-variant-plan] Plan generation complete')

    return new Response(
      JSON.stringify({
        success: true,
        plans: savedPlans,
        model: modelToUse,
        provider: keyConfig.provider,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[generate-variant-plan] Error:', error.message)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
