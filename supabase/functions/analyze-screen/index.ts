// Supabase Edge Function for screen UI analysis
// Extracts colors, typography, layout, components, accessibility info
// Uses external screenshot API (Edge Functions don't support Puppeteer)
// Deploy with: supabase functions deploy analyze-screen

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AnalyzeRequest {
  screenId: string
  html: string
  screenshotApiKey?: string // Optional: for external screenshot service
}

interface UIMetadata {
  colors: {
    primary: string[]
    secondary: string[]
    background: string[]
    text: string[]
    accent: string[]
  }
  typography: {
    fontFamilies: string[]
    fontSizes: string[]
    fontWeights: string[]
    lineHeights: string[]
  }
  layout: {
    containerWidths: string[]
    gridSystems: string[]
    spacing: string[]
    breakpoints: string[]
  }
  components: Array<{
    type: string
    count: number
    examples: string[]
  }>
  accessibility: {
    hasAriaLabels: boolean
    hasAltText: boolean
    semanticElements: string[]
    contrastIssues: string[]
  }
}

// Extract colors from HTML/CSS
function extractColors(html: string): UIMetadata['colors'] {
  const colors: UIMetadata['colors'] = {
    primary: [],
    secondary: [],
    background: [],
    text: [],
    accent: [],
  }

  // Extract hex colors
  const hexPattern = /#[0-9a-fA-F]{3,8}\b/g
  const hexMatches = html.match(hexPattern) || []

  // Extract rgb/rgba colors
  const rgbPattern = /rgba?\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[\d.]+)?\s*\)/g
  const rgbMatches = html.match(rgbPattern) || []

  // Extract hsl colors
  const hslPattern = /hsla?\s*\(\s*\d+\s*,\s*[\d.]+%?\s*,\s*[\d.]+%?\s*(?:,\s*[\d.]+)?\s*\)/g
  const hslMatches = html.match(hslPattern) || []

  const allColors = [...new Set([...hexMatches, ...rgbMatches, ...hslMatches])]

  // Categorize colors (simplified heuristics)
  allColors.forEach((color) => {
    const lowerColor = color.toLowerCase()

    // Background colors (whites, light grays)
    if (lowerColor.includes('#fff') || lowerColor.includes('#f') || lowerColor.includes('255, 255, 255')) {
      colors.background.push(color)
    }
    // Text colors (blacks, dark grays)
    else if (lowerColor.includes('#000') || lowerColor.includes('#1') || lowerColor.includes('#2') || lowerColor.includes('#3')) {
      colors.text.push(color)
    }
    // Accent colors (bright colors)
    else if (color.length <= 7) {
      colors.accent.push(color)
    }
  })

  // Deduplicate and limit
  colors.primary = [...new Set(colors.accent.slice(0, 3))]
  colors.secondary = [...new Set(colors.accent.slice(3, 6))]
  colors.background = [...new Set(colors.background.slice(0, 5))]
  colors.text = [...new Set(colors.text.slice(0, 5))]
  colors.accent = [...new Set(colors.accent.slice(0, 10))]

  return colors
}

// Extract typography from HTML/CSS
function extractTypography(html: string): UIMetadata['typography'] {
  const typography: UIMetadata['typography'] = {
    fontFamilies: [],
    fontSizes: [],
    fontWeights: [],
    lineHeights: [],
  }

  // Font families
  const fontFamilyPattern = /font-family\s*:\s*([^;"}]+)/gi
  let match
  while ((match = fontFamilyPattern.exec(html)) !== null) {
    const fonts = match[1].split(',').map(f => f.trim().replace(/['"]/g, ''))
    typography.fontFamilies.push(...fonts)
  }

  // Font sizes
  const fontSizePattern = /font-size\s*:\s*([^;"}]+)/gi
  while ((match = fontSizePattern.exec(html)) !== null) {
    typography.fontSizes.push(match[1].trim())
  }

  // Font weights
  const fontWeightPattern = /font-weight\s*:\s*([^;"}]+)/gi
  while ((match = fontWeightPattern.exec(html)) !== null) {
    typography.fontWeights.push(match[1].trim())
  }

  // Line heights
  const lineHeightPattern = /line-height\s*:\s*([^;"}]+)/gi
  while ((match = lineHeightPattern.exec(html)) !== null) {
    typography.lineHeights.push(match[1].trim())
  }

  // Deduplicate
  typography.fontFamilies = [...new Set(typography.fontFamilies)].slice(0, 10)
  typography.fontSizes = [...new Set(typography.fontSizes)].slice(0, 15)
  typography.fontWeights = [...new Set(typography.fontWeights)]
  typography.lineHeights = [...new Set(typography.lineHeights)].slice(0, 10)

  return typography
}

// Extract layout information
function extractLayout(html: string): UIMetadata['layout'] {
  const layout: UIMetadata['layout'] = {
    containerWidths: [],
    gridSystems: [],
    spacing: [],
    breakpoints: [],
  }

  // Container widths
  const widthPattern = /(?:max-width|width)\s*:\s*(\d+(?:px|rem|em|%|vw))/gi
  let match
  while ((match = widthPattern.exec(html)) !== null) {
    layout.containerWidths.push(match[1])
  }

  // Grid systems
  if (html.includes('display: grid') || html.includes('display:grid')) {
    layout.gridSystems.push('CSS Grid')
  }
  if (html.includes('display: flex') || html.includes('display:flex')) {
    layout.gridSystems.push('Flexbox')
  }
  if (html.includes('class="container"') || html.includes('class="row"') || html.includes('class="col')) {
    layout.gridSystems.push('Bootstrap-style')
  }

  // Spacing (padding/margin)
  const spacingPattern = /(?:padding|margin|gap)\s*:\s*([^;"}]+)/gi
  while ((match = spacingPattern.exec(html)) !== null) {
    layout.spacing.push(match[1].trim())
  }

  // Media query breakpoints
  const breakpointPattern = /@media[^{]*\(\s*(?:min|max)-width\s*:\s*(\d+(?:px|em|rem))/gi
  while ((match = breakpointPattern.exec(html)) !== null) {
    layout.breakpoints.push(match[1])
  }

  // Deduplicate
  layout.containerWidths = [...new Set(layout.containerWidths)].slice(0, 10)
  layout.gridSystems = [...new Set(layout.gridSystems)]
  layout.spacing = [...new Set(layout.spacing)].slice(0, 20)
  layout.breakpoints = [...new Set(layout.breakpoints)]

  return layout
}

// Extract component inventory
function extractComponents(html: string): UIMetadata['components'] {
  const components: UIMetadata['components'] = []

  // Count common component patterns
  const componentPatterns = [
    { type: 'button', patterns: [/<button/gi, /class="[^"]*btn[^"]*"/gi, /type="submit"/gi] },
    { type: 'input', patterns: [/<input/gi, /<textarea/gi] },
    { type: 'form', patterns: [/<form/gi] },
    { type: 'card', patterns: [/class="[^"]*card[^"]*"/gi] },
    { type: 'navbar', patterns: [/<nav/gi, /class="[^"]*nav[^"]*"/gi, /class="[^"]*header[^"]*"/gi] },
    { type: 'footer', patterns: [/<footer/gi] },
    { type: 'modal', patterns: [/class="[^"]*modal[^"]*"/gi, /class="[^"]*dialog[^"]*"/gi] },
    { type: 'dropdown', patterns: [/class="[^"]*dropdown[^"]*"/gi, /class="[^"]*select[^"]*"/gi, /<select/gi] },
    { type: 'table', patterns: [/<table/gi] },
    { type: 'list', patterns: [/<ul/gi, /<ol/gi] },
    { type: 'image', patterns: [/<img/gi] },
    { type: 'link', patterns: [/<a\s/gi] },
    { type: 'heading', patterns: [/<h[1-6]/gi] },
    { type: 'icon', patterns: [/class="[^"]*icon[^"]*"/gi, /<svg/gi] },
    { type: 'badge', patterns: [/class="[^"]*badge[^"]*"/gi, /class="[^"]*tag[^"]*"/gi] },
  ]

  componentPatterns.forEach(({ type, patterns }) => {
    let count = 0
    patterns.forEach(pattern => {
      const matches = html.match(pattern)
      if (matches) count += matches.length
    })

    if (count > 0) {
      components.push({
        type,
        count,
        examples: [], // Could extract sample markup later
      })
    }
  })

  return components.sort((a, b) => b.count - a.count)
}

// Extract accessibility information
function extractAccessibility(html: string): UIMetadata['accessibility'] {
  const accessibility: UIMetadata['accessibility'] = {
    hasAriaLabels: false,
    hasAltText: false,
    semanticElements: [],
    contrastIssues: [],
  }

  // Check for ARIA labels
  accessibility.hasAriaLabels = /aria-label/i.test(html) || /aria-labelledby/i.test(html)

  // Check for alt text on images
  const imgCount = (html.match(/<img/gi) || []).length
  const altCount = (html.match(/<img[^>]*alt=/gi) || []).length
  accessibility.hasAltText = imgCount > 0 && altCount >= imgCount * 0.8 // 80% threshold

  // Semantic elements used
  const semanticElements = ['header', 'nav', 'main', 'article', 'section', 'aside', 'footer', 'figure', 'figcaption']
  semanticElements.forEach(element => {
    if (new RegExp(`<${element}`, 'i').test(html)) {
      accessibility.semanticElements.push(element)
    }
  })

  // Note: Real contrast analysis would require rendering
  // This is a placeholder for potential issues
  accessibility.contrastIssues = []

  return accessibility
}

// Capture screenshot using external API
async function captureScreenshot(
  html: string,
  userId: string,
  sessionId: string,
  supabase: ReturnType<typeof createClient>,
  screenshotApiKey?: string
): Promise<string | null> {
  // Skip screenshot if no API key configured
  if (!screenshotApiKey) {
    console.log('[analyze-screen] No screenshot API key, skipping capture')
    return null
  }

  try {
    // Create a data URL from HTML for screenshot service
    // Using screenshotlayer as example (can swap for urlbox, etc.)
    const encodedHtml = encodeURIComponent(html)
    const screenshotUrl = `https://api.screenshotlayer.com/api/capture?access_key=${screenshotApiKey}&viewport=1920x1080&width=1920&format=png&url=data:text/html;charset=utf-8,${encodedHtml.slice(0, 8000)}` // URL length limit

    // Note: Real implementation would:
    // 1. Upload HTML to storage first
    // 2. Use that public URL for screenshot
    // 3. Or use a service that accepts HTML directly (urlbox)

    // For now, we'll use a simpler approach:
    // Store the HTML, then use a service to render it
    const htmlPath = `${userId}/${sessionId}/source.html`
    const { error: uploadError } = await supabase.storage
      .from('vibe-files')
      .upload(htmlPath, new Blob([html], { type: 'text/html' }), {
        contentType: 'text/html',
        upsert: true,
      })

    if (uploadError) {
      console.log('[analyze-screen] Failed to upload HTML for screenshot:', uploadError)
      return null
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('vibe-files')
      .getPublicUrl(htmlPath)

    console.log('[analyze-screen] HTML uploaded for screenshot, URL:', urlData.publicUrl)

    // Return the HTML URL - actual screenshot capture would use this with a screenshot API
    // For MVP, we can skip screenshot or use a placeholder
    return urlData.publicUrl

  } catch (error) {
    console.error('[analyze-screen] Screenshot capture error:', error)
    return null
  }
}

Deno.serve(async (req) => {
  console.log('[analyze-screen] Request received:', req.method)

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
    console.log('[analyze-screen] User authenticated:', user.id)

    // Parse request
    const body: AnalyzeRequest = await req.json()
    console.log('[analyze-screen] Analyzing screen:', body.screenId, 'HTML length:', body.html?.length)

    if (!body.screenId || !body.html) {
      throw new Error('Missing required fields: screenId and html')
    }

    // Extract UI metadata
    console.log('[analyze-screen] Extracting colors...')
    const colors = extractColors(body.html)

    console.log('[analyze-screen] Extracting typography...')
    const typography = extractTypography(body.html)

    console.log('[analyze-screen] Extracting layout...')
    const layout = extractLayout(body.html)

    console.log('[analyze-screen] Extracting components...')
    const components = extractComponents(body.html)

    console.log('[analyze-screen] Extracting accessibility...')
    const accessibility = extractAccessibility(body.html)

    // Capture screenshot (optional)
    console.log('[analyze-screen] Capturing screenshot...')
    const screenshotUrl = await captureScreenshot(
      body.html,
      user.id,
      body.screenId,
      supabase,
      body.screenshotApiKey
    )

    // Build metadata object
    const metadata: UIMetadata = {
      colors,
      typography,
      layout,
      components,
      accessibility,
    }

    // Store in database
    console.log('[analyze-screen] Saving metadata to database...')
    const { data: savedMetadata, error: saveError } = await supabase
      .from('screen_ui_metadata')
      .upsert({
        screen_id: body.screenId,
        colors,
        typography,
        layout,
        components,
        accessibility,
        screenshot_url: screenshotUrl,
        html_size_bytes: body.html.length,
        analyzed_at: new Date().toISOString(),
      }, {
        onConflict: 'screen_id',
      })
      .select()
      .single()

    if (saveError) {
      console.error('[analyze-screen] Failed to save metadata:', saveError)
      // Continue anyway, return metadata
    }

    console.log('[analyze-screen] Analysis complete')

    return new Response(
      JSON.stringify({
        success: true,
        metadata,
        screenshotUrl,
        savedId: savedMetadata?.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[analyze-screen] Error:', error.message)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
