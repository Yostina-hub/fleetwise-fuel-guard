// Sanitization utilities using DOMPurify concepts

export interface SanitizeConfig {
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
  stripScripts?: boolean;
  stripStyles?: boolean;
  allowDataUrls?: boolean;
  maxLength?: number;
}

const DEFAULT_ALLOWED_TAGS = [
  'p', 'br', 'b', 'i', 'u', 'strong', 'em', 'a', 'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code',
  'table', 'thead', 'tbody', 'tr', 'th', 'td', 'span', 'div',
];

const DEFAULT_ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  a: ['href', 'title', 'target', 'rel'],
  img: ['src', 'alt', 'title', 'width', 'height'],
  '*': ['class', 'id'],
};

// HTML entity encoding
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

export function escapeHtml(str: string): string {
  return str.replace(/[&<>"'`=/]/g, char => HTML_ENTITIES[char] || char);
}

export function unescapeHtml(str: string): string {
  const element = document.createElement('div');
  element.innerHTML = str;
  return element.textContent || element.innerText || '';
}

export function sanitizeHtml(html: string, config: SanitizeConfig = {}): string {
  const {
    allowedTags = DEFAULT_ALLOWED_TAGS,
    allowedAttributes = DEFAULT_ALLOWED_ATTRIBUTES,
    stripScripts = true,
    stripStyles = true,
    allowDataUrls = false,
    maxLength,
  } = config;

  // Create a temporary DOM element
  const temp = document.createElement('div');
  temp.innerHTML = html;

  // Remove script tags
  if (stripScripts) {
    const scripts = temp.querySelectorAll('script');
    scripts.forEach(script => script.remove());
  }

  // Remove style tags
  if (stripStyles) {
    const styles = temp.querySelectorAll('style');
    styles.forEach(style => style.remove());
  }

  // Remove event handlers and javascript: URLs
  const allElements = temp.querySelectorAll('*');
  allElements.forEach(element => {
    // Remove event handlers
    Array.from(element.attributes).forEach(attr => {
      if (attr.name.startsWith('on')) {
        element.removeAttribute(attr.name);
      }
    });

    // Check href for javascript:
    const href = element.getAttribute('href');
    if (href && href.toLowerCase().startsWith('javascript:')) {
      element.removeAttribute('href');
    }

    // Check src for data: URLs if not allowed
    if (!allowDataUrls) {
      const src = element.getAttribute('src');
      if (src && src.toLowerCase().startsWith('data:')) {
        element.removeAttribute('src');
      }
    }

    // Remove disallowed tags
    if (!allowedTags.includes(element.tagName.toLowerCase())) {
      // Keep the content, remove the tag
      const parent = element.parentNode;
      while (element.firstChild) {
        parent?.insertBefore(element.firstChild, element);
      }
      element.remove();
    }

    // Remove disallowed attributes
    const tagAllowed = allowedAttributes[element.tagName.toLowerCase()] || [];
    const globalAllowed = allowedAttributes['*'] || [];
    const allAllowed = [...tagAllowed, ...globalAllowed];

    Array.from(element.attributes).forEach(attr => {
      if (!allAllowed.includes(attr.name)) {
        element.removeAttribute(attr.name);
      }
    });
  });

  let result = temp.innerHTML;

  // Apply max length
  if (maxLength && result.length > maxLength) {
    result = result.substring(0, maxLength);
  }

  return result;
}

export function sanitizeText(text: string, maxLength?: number): string {
  let sanitized = escapeHtml(text);
  
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
}

export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    
    // Only allow http, https, and mailto protocols
    if (!['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
      return '';
    }
    
    return parsed.toString();
  } catch {
    return '';
  }
}

export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .replace(/^[.-]/, '_')
    .slice(0, 255);
}

export function sanitizeJson(jsonString: string): any {
  try {
    const parsed = JSON.parse(jsonString);
    
    // Recursively sanitize string values
    const sanitizeValue = (value: any): any => {
      if (typeof value === 'string') {
        return sanitizeText(value);
      }
      if (Array.isArray(value)) {
        return value.map(sanitizeValue);
      }
      if (typeof value === 'object' && value !== null) {
        const result: Record<string, any> = {};
        for (const [key, val] of Object.entries(value)) {
          result[sanitizeText(key)] = sanitizeValue(val);
        }
        return result;
      }
      return value;
    };
    
    return sanitizeValue(parsed);
  } catch {
    return null;
  }
}

// XSS Prevention for React
export function createSafeMarkup(html: string): { __html: string } {
  return { __html: sanitizeHtml(html) };
}

// SQL Injection prevention helpers
export function escapeSqlString(str: string): string {
  return str.replace(/'/g, "''").replace(/\\/g, '\\\\');
}

export function isValidIdentifier(str: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(str);
}
