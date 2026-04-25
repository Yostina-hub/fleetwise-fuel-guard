/**
 * Lemat Map Configuration
 * Ethiopian map tiles via MapLibre GL
 * Data endpoints (geocoding, routing) require an API key
 */

export const LEMAT_API_BASE = 'https://lemat.goffice.et/api/v1';

export type LematTheme = 'light' | 'dark' | 'satellite' | 'terrain' | 'neon' | 'artistic';
export type LematMapStyle = 'streets' | 'satellite' | 'dark';

export const LEMAT_DEFAULT_CENTER: [number, number] = [38.7578, 9.0192];
export const LEMAT_DEFAULT_ZOOM = 12;

export const getLematStyleUrl = (theme: LematTheme = 'light'): string =>
  `${LEMAT_API_BASE}/tiles/style?theme=${theme}`;

const isLovablePreviewHost = (hostname: string): boolean => {
  const normalizedHost = hostname.toLowerCase();
  return normalizedHost.endsWith('.lovableproject.com') || /--[a-f0-9-]+\.lovable\.app$/.test(normalizedHost);
};

export const shouldUsePreviewSafeMapStyle = (): boolean => {
  if (typeof window === 'undefined') return false;
  return isLovablePreviewHost(window.location.hostname);
};

const getRasterStyle = (
  name: string,
  tiles: string[],
  attribution: string,
): maplibregl.StyleSpecification => ({
  version: 8,
  name,
  sources: {
    raster: {
      type: 'raster',
      tiles,
      tileSize: 256,
      attribution,
    },
  },
  layers: [
    {
      id: `${name.toLowerCase().replace(/\s+/g, '-')}-layer`,
      type: 'raster',
      source: 'raster',
      minzoom: 0,
      maxzoom: 20,
    },
  ],
});

export const getPreviewSafeMapStyle = (style: LematMapStyle = 'streets'): maplibregl.StyleSpecification => {
  if (style === 'satellite') return getSatelliteRasterStyle();

  if (style === 'dark') {
    return getRasterStyle(
      'CARTO Dark Matter',
      ['https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'],
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    );
  }

  // CARTO Voyager — detailed raster tiles with buildings, POIs, and labels
  return getRasterStyle(
    'CARTO Voyager',
    ['https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png'],
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  );
};

/**
 * Build the Supabase Edge Function URL used to proxy Lemat tile requests,
 * working around the duplicate CORS header returned by the origin server.
 */
const getProxyTileUrl = (): string => {
  const supabaseUrl =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) || '';
  return `${supabaseUrl}/functions/v1/lemat-tile-proxy`;
};

/**
 * Fetch the Lemat style JSON and rewrite tile / glyph URLs so they go through
 * the tile-proxy Edge Function (avoids the duplicate-CORS-header problem).
 */
export const fetchLematMapStyle = async (
  style: LematMapStyle = 'streets',
): Promise<maplibregl.StyleSpecification> => {
  if (style === 'satellite') return getSatelliteRasterStyle();

  const theme: LematTheme = style === 'dark' ? 'dark' : 'light';
  const styleUrl = getLematStyleUrl(theme);

  try {
    const res = await fetch(styleUrl);
    if (!res.ok) throw new Error(`Style fetch failed: ${res.status}`);
    const styleJson: maplibregl.StyleSpecification = await res.json();

    const proxyBase = getProxyTileUrl();

    // Rewrite vector tile URLs to go through the proxy.
    // Slashes in the ?path= query string are valid; we keep the {z}/{x}/{y}
    // template tokens intact so MapLibre can substitute them at fetch time.
    if (styleJson.sources) {
      for (const src of Object.values(styleJson.sources) as any[]) {
        if (src.tiles && Array.isArray(src.tiles)) {
          src.tiles = src.tiles.map((tileUrl: string) => {
            const path = tileUrl.replace('https://lemat.goffice.et/', '');
            return `${proxyBase}?path=${path}`;
          });
        }
      }
    }

    // Rewrite glyph URLs through proxy (keep {fontstack}/{range} tokens intact)
    if (styleJson.glyphs && typeof styleJson.glyphs === 'string' && styleJson.glyphs.startsWith('https://lemat.goffice.et/')) {
      const glyphPath = styleJson.glyphs.replace('https://lemat.goffice.et/', '');
      styleJson.glyphs = `${proxyBase}?path=${glyphPath}`;
    }

    return styleJson;
  } catch (e) {
    console.warn('Failed to fetch Lemat style, using fallback:', e);
    return getPreviewSafeMapStyle(style);
  }
};

/** Synchronous version — returns the style URL directly (works when CORS is not an issue). */
export const getLematMapStyle = (style: LematMapStyle = 'streets'): string | maplibregl.StyleSpecification => {
  if (style === 'satellite') return getSatelliteRasterStyle();
  if (style === 'dark') return getLematStyleUrl('dark');
  return getLematStyleUrl('light');
};

export const getLematFallbackMapStyle = (): string | maplibregl.StyleSpecification =>
  shouldUsePreviewSafeMapStyle() ? getPreviewSafeMapStyle('streets') : getOsmFallbackStyle();

/**
 * OpenStreetMap raster tile style for use when the Lemat tile server is completely unreachable.
 * This is a self-contained MapLibre style spec – no external style JSON needs to be fetched.
 */
export const getOsmFallbackStyle = (): maplibregl.StyleSpecification => ({
  version: 8,
  name: 'OSM Fallback',
  sources: {
    'osm-tiles': {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  },
  layers: [
    {
      id: 'osm-tiles-layer',
      type: 'raster',
      source: 'osm-tiles',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
});

/**
 * Lightweight satellite raster style for fast switching.
 * Using a direct inline style avoids the slower external style JSON + glyph/vector dependency chain.
 */
export const getSatelliteRasterStyle = (): maplibregl.StyleSpecification => ({
  version: 8,
  name: 'Satellite Raster',
  sources: {
    satellite: {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution: 'Tiles &copy; Esri',
    },
  },
  layers: [
    {
      id: 'satellite-raster-layer',
      type: 'raster',
      source: 'satellite',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
});

// Type import for the style spec
import type maplibregl from 'maplibre-gl';

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
