/**
 * Lemat Map Configuration
 * Ethiopian map tiles via MapLibre GL
 * Data endpoints (geocoding, routing) require an API key
 */

export const LEMAT_API_BASE = 'https://lemat.goffice.et/api/v1';

export type LematTheme = 'light' | 'dark' | 'satellite' | 'terrain' | 'neon' | 'artistic';
export type LematMapStyle = 'streets' | 'satellite';

export const LEMAT_DEFAULT_CENTER: [number, number] = [38.7578, 9.0192];
export const LEMAT_DEFAULT_ZOOM = 12;

export const getLematStyleUrl = (theme: LematTheme = 'light'): string =>
  `${LEMAT_API_BASE}/tiles/style?theme=${theme}`;

export const getLematMapStyle = (style: LematMapStyle = 'streets'): string =>
  style === 'satellite' ? getLematStyleUrl('satellite') : getLematStyleUrl('light');

export const getLematFallbackMapStyle = (): string => getLematStyleUrl('light');

export const isLematResourceUrl = (url: string): boolean =>
  url.startsWith(LEMAT_API_BASE);

export const createLematTransformRequest = (apiKey?: string) =>
  (url: string, resourceType?: string) => {
    if (!isLematResourceUrl(url) || !apiKey) {
      return { url };
    }

    const shouldAttachKey =
      resourceType === 'Style' ||
      resourceType === 'Source' ||
      resourceType === 'Tile' ||
      resourceType === 'Glyphs' ||
      resourceType === 'SpriteImage' ||
      resourceType === 'SpriteJSON' ||
      resourceType === 'Unknown';

    if (!shouldAttachKey) {
      return { url };
    }

    return {
      url,
      headers: {
        'X-Api-Key': apiKey,
      },
    };
  };
