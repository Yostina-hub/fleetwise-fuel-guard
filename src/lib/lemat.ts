/**
 * Lemat Map Configuration
 * Ethiopian map tiles via MapLibre GL
 * Tiles/styles are public (no API key needed)
 * Data endpoints (geocoding, routing) require an API key
 */

export const LEMAT_API_BASE = 'https://lemat.goffice.et/api/v1';

export type LematTheme = 'light' | 'dark' | 'satellite' | 'terrain' | 'neon' | 'artistic';

export const getLematStyleUrl = (theme: LematTheme = 'light'): string =>
  `${LEMAT_API_BASE}/tiles/style?theme=${theme}`;

export const LEMAT_DEFAULT_CENTER: [number, number] = [38.7578, 9.0192]; // Addis Ababa
export const LEMAT_DEFAULT_ZOOM = 12;

/**
 * Map style helper for satellite vs streets toggle
 */
export const getLematMapStyle = (style: 'streets' | 'satellite' = 'streets'): string =>
  style === 'satellite'
    ? getLematStyleUrl('satellite')
    : getLematStyleUrl('light');
