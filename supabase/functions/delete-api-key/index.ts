// Edge Function for deleting API keys from Supabase Vault

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DeleteKeyRequest {
  provider: 'anthropic' | 'openai' | 'google'
}

Deno.serve(async (req) => {
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
      console.error('[delete-api-key] Auth error:', userError)
      throw new Error(`Unauthorized: ${userError?.message || 'Invalid token'}`)
    }

    const body: DeleteKeyRequest = await req.json()
    const { provider } = body

    if (!provider) {
      throw new Error('Missing required field: provider')
    }

    const vaultSecretName = `api_key_${user.id}_${provider}`

    // Delete from vault using the SQL function
    const { error: vaultError } = await supabaseService.rpc('delete_vault_secret', {
      p_name: vaultSecretName
    })

    if (vaultError) {
      console.log('[delete-api-key] Vault delete warning:', vaultError.message)
    }

    // Delete reference
    const { error: refError } = await supabaseService
      .from('user_api_key_refs')
      .delete()
      .eq('user_id', user.id)
      .eq('provider', provider)

    if (refError) {
      console.error('[delete-api-key] Reference delete error:', refError)
      throw new Error(`Failed to delete reference: ${refError.message}`)
    }

    console.log('[delete-api-key] Successfully deleted API key for', provider)

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[delete-api-key] Error:', error.message)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
