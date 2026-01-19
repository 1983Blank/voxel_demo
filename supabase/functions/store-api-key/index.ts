// Edge Function for storing API keys in Supabase Vault
// This runs with service_role which has vault permissions

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface StoreKeyRequest {
  provider: 'anthropic' | 'openai' | 'google'
  apiKey: string
  keyName?: string
  model?: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Get JWT from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Missing or invalid authorization header')
    }
    const jwt = authHeader.replace('Bearer ', '')

    // Service client for all operations
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey)

    // Verify user using service client with the JWT
    const { data: { user }, error: userError } = await supabaseService.auth.getUser(jwt)
    if (userError || !user) {
      console.error('[store-api-key] Auth error:', userError)
      throw new Error(`Unauthorized: ${userError?.message || 'Invalid token'}`)
    }
    console.log('[store-api-key] User verified:', user.id)

    // Parse request
    const body: StoreKeyRequest = await req.json()
    const { provider, apiKey, keyName = 'Default', model } = body

    if (!provider || !apiKey) {
      throw new Error('Missing required fields: provider, apiKey')
    }

    // Generate vault secret name
    const vaultSecretName = `api_key_${user.id}_${provider}`

    // Insert into vault using the SQL function (has security definer)
    const { error: vaultError } = await supabaseService.rpc('insert_vault_secret', {
      p_secret: apiKey,
      p_name: vaultSecretName,
      p_description: `API key for ${provider}`
    })

    if (vaultError) {
      console.error('[store-api-key] Vault insert error:', vaultError)
      throw new Error(`Failed to store in vault: ${vaultError.message}`)
    }

    // Store reference using the simplified function
    const { data: refId, error: refError } = await supabaseService.rpc('store_api_key_ref', {
      p_user_id: user.id,
      p_provider: provider,
      p_vault_secret_name: vaultSecretName,
      p_key_name: keyName,
      p_model: model || null,
    })

    if (refError) {
      console.error('[store-api-key] Reference insert error:', refError)
      throw new Error(`Failed to store reference: ${refError.message}`)
    }

    console.log('[store-api-key] Successfully stored API key for', provider)

    return new Response(
      JSON.stringify({ success: true, id: refId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[store-api-key] Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack,
        details: String(error)
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
