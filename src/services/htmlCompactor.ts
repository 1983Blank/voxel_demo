/**
 * HTML Compactor Service
 *
 * Provides multiple strategies to reduce HTML size before sending to LLM.
 * Includes both custom regex-based methods and library-based methods.
 *
 * Libraries used:
 * - sanitize-html: HTML sanitization with configurable tag/attribute stripping
 * - DOMParser: Native browser API for DOM manipulation
 *
 * Note: html-minifier-terser was removed as it depends on clean-css which
 * requires Node.js process global and doesn't work in browsers.
 */

import sanitizeHtml from 'sanitize-html';

// ============================================
// COMPACTION METHOD TYPES
// ============================================

export type CompactionMethod =
  // Custom regex-based methods
  | 'none'                    // No compaction - send as-is
  | 'regex-minify'            // Regex: Remove whitespace, comments
  | 'regex-strip-base64'      // Regex: Replace base64 images with placeholders
  | 'regex-strip-styles'      // Regex: Remove inline styles
  | 'regex-extract-body'      // Regex: Extract only body content
  | 'regex-aggressive'        // Regex: All custom methods combined
  // Library-based methods (browser-compatible only)
  | 'lib-sanitize'            // sanitize-html: Strip dangerous/unnecessary tags
  | 'lib-sanitize-strict'     // sanitize-html: Very strict, text-focused
  | 'dom-extract-text'        // DOMParser: Extract text content only
  | 'dom-extract-structure'   // DOMParser: Keep structure, strip attributes
  // Combined methods
  | 'combined-optimal'        // Best combination for LLM processing
  | 'combined-maximum';       // Maximum possible reduction

export interface CompactionResult {
  html: string;
  originalSize: number;
  compactedSize: number;
  reductionPercent: number;
  method: CompactionMethod;
  warnings: string[];
  processingTime: number;  // milliseconds
}

export interface CompactionOptions {
  method: CompactionMethod;
  maxSize?: number;
  preserveIds?: boolean;
}

// ============================================
// MAIN COMPACTION FUNCTION
// ============================================

export async function compactHtml(html: string, options: CompactionOptions): Promise<CompactionResult> {
  const startTime = performance.now();
  const originalSize = html.length;
  const warnings: string[] = [];
  let compacted = html;

  console.log(`[Compactor] Starting compaction with method: ${options.method}`);
  console.log(`[Compactor] Original size: ${formatBytes(originalSize)}`);

  try {
    switch (options.method) {
      // ---- Custom Regex Methods ----
      case 'none':
        break;

      case 'regex-minify':
        compacted = regexMinify(html);
        break;

      case 'regex-strip-base64':
        compacted = regexStripBase64(html);
        break;

      case 'regex-strip-styles':
        compacted = regexStripStyles(html);
        break;

      case 'regex-extract-body':
        compacted = regexExtractBody(html);
        break;

      case 'regex-aggressive':
        compacted = regexExtractBody(html);
        compacted = regexStripBase64(compacted);
        compacted = regexStripStyles(compacted);
        compacted = regexMinify(compacted);
        break;

      // ---- Library Methods ----
      case 'lib-sanitize':
        compacted = libSanitize(html);
        break;

      case 'lib-sanitize-strict':
        compacted = libSanitizeStrict(html);
        break;

      case 'dom-extract-text':
        compacted = domExtractText(html);
        break;

      case 'dom-extract-structure':
        compacted = domExtractStructure(html);
        break;

      // ---- Combined Methods ----
      case 'combined-optimal':
        // Best for LLM: sanitize + strip base64 + minify (using regex)
        compacted = regexStripBase64(html);
        compacted = libSanitize(compacted);
        compacted = regexMinify(compacted);
        break;

      case 'combined-maximum':
        // Maximum reduction: everything (using regex methods)
        compacted = regexExtractBody(html);
        compacted = regexStripBase64(compacted);
        compacted = regexStripStyles(compacted);
        compacted = libSanitizeStrict(compacted);
        compacted = regexMinify(compacted);
        break;

      default:
        warnings.push(`Unknown method: ${options.method}, using none`);
    }
  } catch (error) {
    console.error(`[Compactor] Error with method ${options.method}:`, error);
    warnings.push(`Method ${options.method} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    // Fall back to original
    compacted = html;
  }

  const processingTime = performance.now() - startTime;
  const compactedSize = compacted.length;
  const reductionPercent = Math.round((1 - compactedSize / originalSize) * 100);

  console.log(`[Compactor] Compacted size: ${formatBytes(compactedSize)}`);
  console.log(`[Compactor] Reduction: ${reductionPercent}%`);
  console.log(`[Compactor] Processing time: ${processingTime.toFixed(0)}ms`);

  // Add size warnings
  if (compactedSize > 100000) {
    warnings.push(`HTML is still ${formatBytes(compactedSize)} - may be too large for some models`);
  }
  if (compactedSize > 500000) {
    warnings.push('HTML exceeds 500KB - LLM will likely truncate or fail');
  }

  return {
    html: compacted,
    originalSize,
    compactedSize,
    reductionPercent,
    method: options.method,
    warnings,
    processingTime,
  };
}

// ============================================
// REGEX-BASED METHODS (Custom)
// ============================================

function regexMinify(html: string): string {
  let result = html;
  // Remove HTML comments (preserve IE conditionals)
  result = result.replace(/<!--(?!\[if)[\s\S]*?-->/gi, '');
  // Remove whitespace between tags
  result = result.replace(/>\s+</g, '><');
  // Collapse multiple whitespaces
  result = result.replace(/\s{2,}/g, ' ');
  // Remove whitespace around =
  result = result.replace(/\s*=\s*/g, '=');
  return result.trim();
}

function regexStripBase64(html: string): string {
  let count = 0;
  let result = html;

  // src attributes
  result = result.replace(/src=["']data:image\/[^;]+;base64,[^"']+["']/gi, () => {
    count++;
    return `src="[IMG_${count}]"`;
  });

  // CSS background-image
  result = result.replace(/url\(["']?data:image\/[^;]+;base64,[^)"']+["']?\)/gi, () => {
    count++;
    return `url([IMG_${count}])`;
  });

  // srcset
  result = result.replace(/srcset=["'][^"']*data:image\/[^;]+;base64,[^"']+["']/gi, () => {
    count++;
    return `srcset="[IMG_${count}]"`;
  });

  // Also strip data URLs for other types (fonts, etc)
  result = result.replace(/url\(["']?data:[^)]+["']?\)/gi, () => {
    count++;
    return `url([DATA_${count}])`;
  });

  if (count > 0) {
    console.log(`[Compactor] Replaced ${count} data URLs`);
  }
  return result;
}

function regexStripStyles(html: string): string {
  let result = html;
  // Remove style attributes
  result = result.replace(/\s+style=["'][^"']*["']/gi, '');
  // Remove <style> tags
  result = result.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  return result;
}

function regexExtractBody(html: string): string {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!bodyMatch) return html;

  let body = bodyMatch[1];
  // Remove scripts
  body = body.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  // Remove noscript
  body = body.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');
  // Remove link tags
  body = body.replace(/<link[^>]*>/gi, '');
  // Remove meta tags
  body = body.replace(/<meta[^>]*>/gi, '');
  // Remove SVG (often large)
  body = body.replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '[SVG]');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>${body.trim()}</body></html>`;
}

// ============================================
// SANITIZE-HTML METHODS
// ============================================

function libSanitize(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      'html', 'head', 'body', 'title', 'meta',
      'div', 'span', 'p', 'a', 'img', 'br', 'hr',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'dl', 'dt', 'dd',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'form', 'input', 'button', 'select', 'option', 'textarea', 'label',
      'header', 'footer', 'nav', 'main', 'section', 'article', 'aside',
      'strong', 'em', 'b', 'i', 'u', 'small', 'mark', 'code', 'pre',
      'blockquote', 'figure', 'figcaption', 'video', 'audio', 'source',
    ],
    allowedAttributes: {
      '*': ['id', 'class', 'title', 'role', 'aria-*', 'data-*'],
      'a': ['href', 'target', 'rel'],
      'img': ['src', 'alt', 'width', 'height'],
      'input': ['type', 'name', 'value', 'placeholder', 'required', 'disabled'],
      'button': ['type', 'name', 'value', 'disabled'],
      'select': ['name', 'required', 'disabled'],
      'option': ['value', 'selected'],
      'textarea': ['name', 'placeholder', 'required', 'disabled', 'rows', 'cols'],
      'form': ['action', 'method'],
      'meta': ['charset', 'name', 'content'],
      'video': ['src', 'controls', 'width', 'height'],
      'audio': ['src', 'controls'],
      'source': ['src', 'type'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesByTag: {
      img: ['http', 'https', 'data'],
    },
  });
}

function libSanitizeStrict(html: string): string {
  // Very strict - mainly text content with basic structure
  return sanitizeHtml(html, {
    allowedTags: [
      'html', 'head', 'body', 'title',
      'div', 'span', 'p', 'a', 'br',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'table', 'tr', 'th', 'td',
      'strong', 'em', 'b', 'i',
      'header', 'footer', 'nav', 'main', 'section',
    ],
    allowedAttributes: {
      'a': ['href'],
      '*': ['id', 'class'],
    },
    allowedSchemes: ['http', 'https'],
  });
}

// ============================================
// DOM-BASED METHODS (Native Browser API)
// ============================================

function domExtractText(html: string): string {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Remove scripts and styles
    doc.querySelectorAll('script, style, noscript, link').forEach(el => el.remove());

    // Get text content with basic structure
    const extractTextWithStructure = (element: Element, depth = 0): string => {
      const lines: string[] = [];
      const indent = '  '.repeat(depth);

      for (const child of Array.from(element.childNodes)) {
        if (child.nodeType === Node.TEXT_NODE) {
          const text = child.textContent?.trim();
          if (text) {
            lines.push(indent + text);
          }
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          const el = child as Element;
          const tag = el.tagName.toLowerCase();

          // Skip hidden elements
          if (tag === 'script' || tag === 'style' || tag === 'noscript') continue;

          // Add structure markers for important elements
          if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
            lines.push(`\n${indent}## ${el.textContent?.trim() || ''}`);
          } else if (tag === 'p' || tag === 'div' || tag === 'section' || tag === 'article') {
            const content = extractTextWithStructure(el, depth);
            if (content.trim()) {
              lines.push(content);
            }
          } else if (tag === 'li') {
            lines.push(`${indent}- ${el.textContent?.trim() || ''}`);
          } else if (tag === 'a') {
            const href = el.getAttribute('href');
            lines.push(`${indent}[${el.textContent?.trim()}](${href || '#'})`);
          } else {
            const content = extractTextWithStructure(el, depth);
            if (content.trim()) {
              lines.push(content);
            }
          }
        }
      }

      return lines.join('\n');
    };

    const body = doc.body;
    const textContent = extractTextWithStructure(body);

    // Wrap in minimal HTML
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body><pre>${textContent}</pre></body></html>`;
  } catch (error) {
    console.warn('[Compactor] DOM text extraction failed:', error);
    return html;
  }
}

function domExtractStructure(html: string): string {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Remove all attributes except essential ones
    const keepAttributes = ['id', 'class', 'href', 'src', 'alt', 'type', 'name', 'value'];

    const cleanElement = (element: Element) => {
      // Remove unwanted elements
      if (['script', 'style', 'noscript', 'link', 'meta', 'svg'].includes(element.tagName.toLowerCase())) {
        element.remove();
        return;
      }

      // Clean attributes
      const attrsToRemove: string[] = [];
      for (const attr of Array.from(element.attributes)) {
        if (!keepAttributes.includes(attr.name) && !attr.name.startsWith('aria-')) {
          attrsToRemove.push(attr.name);
        }
        // Replace base64 images
        if (attr.name === 'src' && attr.value.startsWith('data:')) {
          element.setAttribute('src', '[IMG]');
        }
      }
      attrsToRemove.forEach(attr => element.removeAttribute(attr));

      // Recurse
      for (const child of Array.from(element.children)) {
        cleanElement(child);
      }
    };

    cleanElement(doc.documentElement);

    return doc.documentElement.outerHTML;
  } catch (error) {
    console.warn('[Compactor] DOM structure extraction failed:', error);
    return html;
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getRecommendedMethod(htmlSize: number): CompactionMethod {
  if (htmlSize < 30000) return 'none';
  if (htmlSize < 50000) return 'regex-minify';
  if (htmlSize < 100000) return 'lib-sanitize';
  if (htmlSize < 200000) return 'regex-strip-base64';
  if (htmlSize < 500000) return 'combined-optimal';
  return 'combined-maximum';
}

export function estimateTokens(html: string): number {
  // ~4 chars per token for HTML on average
  return Math.ceil(html.length / 4);
}

export interface MethodInfo {
  value: CompactionMethod;
  label: string;
  description: string;
  category: 'regex' | 'library' | 'dom' | 'combined';
  expectedReduction: string;
}

export function getAvailableMethods(): MethodInfo[] {
  return [
    // Regex methods
    { value: 'none', label: 'None', description: 'No compaction - send as-is', category: 'regex', expectedReduction: '0%' },
    { value: 'regex-minify', label: 'Regex: Minify', description: 'Remove whitespace and comments', category: 'regex', expectedReduction: '10-20%' },
    { value: 'regex-strip-base64', label: 'Regex: Strip Base64', description: 'Replace base64 data URLs with placeholders', category: 'regex', expectedReduction: '50-90%' },
    { value: 'regex-strip-styles', label: 'Regex: Strip Styles', description: 'Remove inline styles and style tags', category: 'regex', expectedReduction: '20-40%' },
    { value: 'regex-extract-body', label: 'Regex: Body Only', description: 'Extract body, remove scripts/head', category: 'regex', expectedReduction: '30-50%' },
    { value: 'regex-aggressive', label: 'Regex: Aggressive', description: 'All regex methods combined', category: 'regex', expectedReduction: '60-80%' },

    // Library methods (browser-compatible only)
    { value: 'lib-sanitize', label: 'Lib: Sanitize', description: 'sanitize-html with safe defaults', category: 'library', expectedReduction: '20-40%' },
    { value: 'lib-sanitize-strict', label: 'Lib: Sanitize Strict', description: 'sanitize-html with minimal tags', category: 'library', expectedReduction: '40-60%' },

    // DOM methods
    { value: 'dom-extract-text', label: 'DOM: Text Only', description: 'Extract text content with structure markers', category: 'dom', expectedReduction: '70-90%' },
    { value: 'dom-extract-structure', label: 'DOM: Clean Structure', description: 'Keep structure, strip most attributes', category: 'dom', expectedReduction: '40-60%' },

    // Combined methods
    { value: 'combined-optimal', label: 'Combined: Optimal', description: 'Best for LLM (sanitize + strip base64 + minify)', category: 'combined', expectedReduction: '60-85%' },
    { value: 'combined-maximum', label: 'Combined: Maximum', description: 'Maximum reduction (may lose layout)', category: 'combined', expectedReduction: '80-95%' },
  ];
}

// For backwards compatibility - sync wrapper (uses async internally)
export function compactHtmlSync(html: string, options: CompactionOptions): CompactionResult {
  // For sync methods, call directly
  const syncMethods: CompactionMethod[] = [
    'none', 'regex-minify', 'regex-strip-base64', 'regex-strip-styles',
    'regex-extract-body', 'regex-aggressive',
    'lib-sanitize', 'lib-sanitize-strict',
    'dom-extract-text', 'dom-extract-structure'
  ];

  if (syncMethods.includes(options.method)) {
    const startTime = performance.now();
    const originalSize = html.length;
    const warnings: string[] = [];
    let compacted = html;

    switch (options.method) {
      case 'none': break;
      case 'regex-minify': compacted = regexMinify(html); break;
      case 'regex-strip-base64': compacted = regexStripBase64(html); break;
      case 'regex-strip-styles': compacted = regexStripStyles(html); break;
      case 'regex-extract-body': compacted = regexExtractBody(html); break;
      case 'regex-aggressive':
        compacted = regexExtractBody(html);
        compacted = regexStripBase64(compacted);
        compacted = regexStripStyles(compacted);
        compacted = regexMinify(compacted);
        break;
      case 'lib-sanitize': compacted = libSanitize(html); break;
      case 'lib-sanitize-strict': compacted = libSanitizeStrict(html); break;
      case 'dom-extract-text': compacted = domExtractText(html); break;
      case 'dom-extract-structure': compacted = domExtractStructure(html); break;
    }

    const compactedSize = compacted.length;
    return {
      html: compacted,
      originalSize,
      compactedSize,
      reductionPercent: Math.round((1 - compactedSize / originalSize) * 100),
      method: options.method,
      warnings,
      processingTime: performance.now() - startTime,
    };
  }

  // For async methods, return a placeholder - caller should use async version
  console.warn('[Compactor] Method requires async, use compactHtml() instead');
  return {
    html,
    originalSize: html.length,
    compactedSize: html.length,
    reductionPercent: 0,
    method: options.method,
    warnings: ['This method requires async - use compactHtml()'],
    processingTime: 0,
  };
}
