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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Client for user auth
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    // Service client for vault operations
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey)

    // Verify user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Parse request
    const body: StoreKeyRequest = await req.json()
    const { provider, apiKey, keyName = 'Default', model } = body

    if (!provider || !apiKey) {
      throw new Error('Missing required fields: provider, apiKey')
    }

    // Generate vault secret name
    const vaultSecretName = `api_key_${user.id}_${provider}`

    // Delete existing vault secret if exists (using service role)
    await supabaseService
      .from('vault.secrets')
      .delete()
      .eq('name', vaultSecretName)

    // Try direct SQL for vault insert since it needs special handling
    const { error: vaultError } = await supabaseService.rpc('exec_sql', {
      query: `
        DELETE FROM vault.secrets WHERE name = '${vaultSecretName}';
        INSERT INTO vault.secrets (secret, name, description)
        VALUES ('${apiKey}', '${vaultSecretName}', 'API key for ${provider}');
      `
    }).maybeSingle()

    // If exec_sql doesn't exist, try direct insert
    if (vaultError) {
      console.log('[store-api-key] exec_sql failed, trying direct insert:', vaultError.message)

      // Direct SQL execution via service role
      const { error: insertError } = await supabaseService
        .schema('vault')
        .from('secrets')
        .insert({
          secret: apiKey,
          name: vaultSecretName,
          description: `API key for ${provider}`
        })

      if (insertError) {
        console.error('[store-api-key] Vault insert error:', insertError)
        throw new Error(`Failed to store in vault: ${insertError.message}`)
      }
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
    console.error('[store-api-key] Error:', error.message)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
