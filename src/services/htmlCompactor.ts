/**
 * HTML Compactor Service
 *
 * Provides multiple strategies to reduce HTML size before sending to LLM.
 * Large HTML files (like SingleFile captures) can be 500KB+ which exceeds
 * LLM context limits and Edge Function payload limits.
 */

export type CompactionMethod =
  | 'none'           // No compaction - send as-is
  | 'minify'         // Remove whitespace, comments
  | 'strip-base64'   // Replace base64 images with placeholders
  | 'strip-styles'   // Remove inline styles, keep classes
  | 'extract-body'   // Extract only body content
  | 'aggressive';    // Combine all methods

export interface CompactionResult {
  html: string;
  originalSize: number;
  compactedSize: number;
  reductionPercent: number;
  method: CompactionMethod;
  warnings: string[];
}

export interface CompactionOptions {
  method: CompactionMethod;
  maxSize?: number;  // Target max size in bytes
  preserveIds?: boolean;  // Keep element IDs for reference
}

/**
 * Compact HTML using the specified method
 */
export function compactHtml(html: string, options: CompactionOptions): CompactionResult {
  const originalSize = html.length;
  const warnings: string[] = [];
  let compacted = html;

  console.log(`[Compactor] Starting compaction with method: ${options.method}`);
  console.log(`[Compactor] Original size: ${formatBytes(originalSize)}`);

  switch (options.method) {
    case 'none':
      // No compaction
      break;

    case 'minify':
      compacted = minifyHtml(html);
      break;

    case 'strip-base64':
      compacted = stripBase64Images(html);
      break;

    case 'strip-styles':
      compacted = stripInlineStyles(html);
      break;

    case 'extract-body':
      compacted = extractBodyContent(html);
      break;

    case 'aggressive':
      // Apply all methods in sequence
      compacted = extractBodyContent(html);
      compacted = stripBase64Images(compacted);
      compacted = stripInlineStyles(compacted);
      compacted = minifyHtml(compacted);
      break;
  }

  const compactedSize = compacted.length;
  const reductionPercent = Math.round((1 - compactedSize / originalSize) * 100);

  console.log(`[Compactor] Compacted size: ${formatBytes(compactedSize)}`);
  console.log(`[Compactor] Reduction: ${reductionPercent}%`);

  // Add warnings for large files
  if (compactedSize > 100000) {
    warnings.push(`HTML is still ${formatBytes(compactedSize)} - consider using a more aggressive compaction method`);
  }

  if (compactedSize > 500000) {
    warnings.push('HTML exceeds 500KB - LLM may truncate or fail to process');
  }

  return {
    html: compacted,
    originalSize,
    compactedSize,
    reductionPercent,
    method: options.method,
    warnings,
  };
}

/**
 * Minify HTML - remove whitespace, comments, and unnecessary characters
 */
function minifyHtml(html: string): string {
  let result = html;

  // Remove HTML comments (but keep conditional comments for IE)
  result = result.replace(/<!--(?!\[if)[\s\S]*?-->/gi, '');

  // Remove whitespace between tags
  result = result.replace(/>\s+</g, '><');

  // Collapse multiple whitespaces to single space
  result = result.replace(/\s{2,}/g, ' ');

  // Remove whitespace around = in attributes
  result = result.replace(/\s*=\s*/g, '=');

  // Trim leading/trailing whitespace
  result = result.trim();

  return result;
}

/**
 * Strip base64 encoded images and replace with placeholders
 */
function stripBase64Images(html: string): string {
  let imageCount = 0;

  // Replace base64 data URLs in src attributes
  let result = html.replace(
    /src=["']data:image\/[^;]+;base64,[^"']+["']/gi,
    () => {
      imageCount++;
      return `src="[BASE64_IMAGE_${imageCount}]"`;
    }
  );

  // Replace base64 in CSS background-image
  result = result.replace(
    /url\(["']?data:image\/[^;]+;base64,[^)"']+["']?\)/gi,
    () => {
      imageCount++;
      return `url([BASE64_IMAGE_${imageCount}])`;
    }
  );

  // Replace base64 in srcset
  result = result.replace(
    /srcset=["'][^"']*data:image\/[^;]+;base64,[^"']+["']/gi,
    () => {
      imageCount++;
      return `srcset="[BASE64_IMAGE_${imageCount}]"`;
    }
  );

  if (imageCount > 0) {
    console.log(`[Compactor] Replaced ${imageCount} base64 images`);
  }

  return result;
}

/**
 * Strip inline styles - remove style attributes and style tags
 */
function stripInlineStyles(html: string): string {
  let result = html;

  // Remove style attributes
  result = result.replace(/\s+style=["'][^"']*["']/gi, '');

  // Remove <style> tags and their content
  result = result.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // Remove CSS in <link> tags (referenced stylesheets stay as references)
  // We keep <link> tags as they're just references

  return result;
}

/**
 * Extract only the body content, removing head and scripts
 */
function extractBodyContent(html: string): string {
  // Try to extract body content
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);

  if (bodyMatch) {
    let body = bodyMatch[1];

    // Remove script tags
    body = body.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

    // Remove noscript tags
    body = body.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');

    // Remove link tags (stylesheets)
    body = body.replace(/<link[^>]*>/gi, '');

    // Remove meta tags that might be in body
    body = body.replace(/<meta[^>]*>/gi, '');

    // Wrap in minimal HTML structure
    return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Compacted</title></head>
<body>
${body.trim()}
</body>
</html>`;
  }

  // If no body tag found, return as-is
  return html;
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Get recommended compaction method based on HTML size
 */
export function getRecommendedMethod(htmlSize: number): CompactionMethod {
  if (htmlSize < 50000) return 'none';           // Under 50KB - no compaction needed
  if (htmlSize < 100000) return 'minify';        // 50-100KB - just minify
  if (htmlSize < 200000) return 'strip-base64';  // 100-200KB - strip images
  if (htmlSize < 500000) return 'extract-body';  // 200-500KB - extract body
  return 'aggressive';                            // Over 500KB - aggressive
}

/**
 * Get human-readable description of compaction method
 */
export function getMethodDescription(method: CompactionMethod): string {
  switch (method) {
    case 'none':
      return 'No compaction - send HTML as-is';
    case 'minify':
      return 'Remove whitespace and comments';
    case 'strip-base64':
      return 'Replace base64 images with placeholders';
    case 'strip-styles':
      return 'Remove inline styles and style tags';
    case 'extract-body':
      return 'Extract body content, remove scripts';
    case 'aggressive':
      return 'All methods combined (maximum reduction)';
    default:
      return 'Unknown method';
  }
}

/**
 * Estimate token count (rough approximation)
 * GPT-4/Claude: ~4 chars per token on average for HTML
 */
export function estimateTokens(html: string): number {
  return Math.ceil(html.length / 4);
}

/**
 * Get all available compaction methods with metadata
 */
export function getAvailableMethods(): Array<{
  value: CompactionMethod;
  label: string;
  description: string;
}> {
  return [
    { value: 'none', label: 'None', description: 'Send HTML as-is (best for small files)' },
    { value: 'minify', label: 'Minify', description: 'Remove whitespace and comments (~10-20% reduction)' },
    { value: 'strip-base64', label: 'Strip Images', description: 'Replace base64 images with placeholders (~50-80% for image-heavy pages)' },
    { value: 'strip-styles', label: 'Strip Styles', description: 'Remove inline styles and CSS (~20-40% reduction)' },
    { value: 'extract-body', label: 'Body Only', description: 'Extract body content, remove head/scripts (~30-50% reduction)' },
    { value: 'aggressive', label: 'Aggressive', description: 'All methods combined (maximum reduction, may affect layout)' },
  ];
}
