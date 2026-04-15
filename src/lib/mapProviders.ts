/**
 * Multi-Provider Map Support
 * 
 * Lemat Map is the default provider ("Maps Without Boundaries").
 * Supports Mapbox and Google Maps as premium alternatives via API keys
 * stored in organization_settings or sessionStorage.
 */

import type maplibregl from 'maplibre-gl';
import { fetchLematMapStyle, getPreviewSafeMapStyle, type LematMapStyle } from './lemat';

export type MapProvider = 'lemat' | 'mapbox' | 'google' | 'osm';

export interface MapProviderConfig {
  provider: MapProvider;
  apiKey?: string;
  label: string;
  description: string;
  attribution: string;
}

const PROVIDER_REGISTRY: Record<MapProvider, Omit<MapProviderConfig, 'apiKey'>> = {
  lemat: {
    provider: 'lemat',
    label: 'Lemat Map',
    description: 'Maps Without Boundaries — Ethiopian-optimized vector tiles with local detail',
    attribution: '&copy; <a href="https://lemat.goffice.et">Lemat Maps</a>',
  },
  mapbox: {
    provider: 'mapbox',
    label: 'Mapbox',
    description: 'Premium global vector maps with satellite imagery and 3D terrain',
    attribution: '&copy; <a href="https://www.mapbox.com/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  google: {
    provider: 'google',
    label: 'Google Maps',
    description: 'Industry-standard maps with Street View and real-time traffic',
    attribution: '&copy; Google Maps',
  },
  osm: {
    provider: 'osm',
    label: 'OpenStreetMap',
    description: 'Free community-maintained map tiles — universal fallback',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
};

/** Get map provider info */
export const getProviderInfo = (provider: MapProvider): MapProviderConfig & { apiKey?: string } => {
  const config = PROVIDER_REGISTRY[provider] || PROVIDER_REGISTRY.lemat;
  const apiKey = getStoredApiKey(provider);
  return { ...config, apiKey };
};

/** Get all available providers */
export const getAvailableProviders = (): MapProviderConfig[] => {
  return Object.values(PROVIDER_REGISTRY);
};

/** Store API key for a provider */
export const storeMapApiKey = (provider: MapProvider, apiKey: string): void => {
  sessionStorage.setItem(`map_api_key_${provider}`, apiKey);
};

/** Retrieve stored API key */
export const getStoredApiKey = (provider: MapProvider): string | null => {
  // Check sessionStorage first (per session policy)
  const sessionKey = sessionStorage.getItem(`map_api_key_${provider}`);
  if (sessionKey) return sessionKey;

  // Special cases for backward compatibility
  if (provider === 'mapbox') {
    return sessionStorage.getItem('mapbox_token') || import.meta.env.VITE_MAPBOX_TOKEN || null;
  }
  if (provider === 'lemat') {
    return sessionStorage.getItem('lemat_api_key') || null;
  }

  return null;
};

/** Remove stored API key */
export const removeMapApiKey = (provider: MapProvider): void => {
  sessionStorage.removeItem(`map_api_key_${provider}`);
};

/** Get the currently active provider */
export const getActiveProvider = (): MapProvider => {
  const stored = sessionStorage.getItem('active_map_provider') as MapProvider | null;
  if (stored && PROVIDER_REGISTRY[stored]) return stored;
  return 'lemat';
};

/** Set the active provider */
export const setActiveProvider = (provider: MapProvider): void => {
  sessionStorage.setItem('active_map_provider', provider);
};

/**
 * Build a MapLibre style spec for a given provider + style variant.
 * Lemat is always the default; Mapbox/Google require valid API keys.
 */
export const getProviderStyle = async (
  provider: MapProvider = 'lemat',
  style: LematMapStyle = 'streets',
): Promise<maplibregl.StyleSpecification> => {
  switch (provider) {
    case 'mapbox': {
      const token = getStoredApiKey('mapbox');
      if (!token) {
        console.warn('Mapbox token not found, falling back to Lemat');
        return fetchLematMapStyle(style);
      }
      return getMapboxStyle(token, style);
    }
    case 'google': {
      // Google Maps via MapLibre raster tiles (requires API key)
      const key = getStoredApiKey('google');
      if (!key) {
        console.warn('Google Maps key not found, falling back to Lemat');
        return fetchLematMapStyle(style);
      }
      return getGoogleStyle(key, style);
    }
    case 'osm':
      return getPreviewSafeMapStyle(style);
    case 'lemat':
    default:
      return fetchLematMapStyle(style);
  }
};

/** Mapbox vector style via MapLibre */
const getMapboxStyle = (token: string, style: LematMapStyle): maplibregl.StyleSpecification => {
  const styleMap: Record<LematMapStyle, string> = {
    streets: 'streets-v12',
    satellite: 'satellite-streets-v12',
    dark: 'dark-v11',
  };
  const mbStyle = styleMap[style] || 'streets-v12';

  return {
    version: 8,
    name: `Mapbox ${mbStyle}`,
    sources: {
      'mapbox-raster': {
        type: 'raster',
        tiles: [
          `https://api.mapbox.com/styles/v1/mapbox/${mbStyle}/tiles/{z}/{x}/{y}?access_token=${token}`,
        ],
        tileSize: 512,
        attribution: PROVIDER_REGISTRY.mapbox.attribution,
      },
    },
    layers: [
      {
        id: 'mapbox-raster-layer',
        type: 'raster',
        source: 'mapbox-raster',
        minzoom: 0,
        maxzoom: 22,
      },
    ],
  };
};

/** Google Maps raster tiles via MapLibre */
const getGoogleStyle = (apiKey: string, style: LematMapStyle): maplibregl.StyleSpecification => {
  const typeMap: Record<LematMapStyle, string> = {
    streets: 'roadmap',
    satellite: 'satellite',
    dark: 'roadmap',
  };
  const mapType = typeMap[style] || 'roadmap';

  return {
    version: 8,
    name: `Google ${mapType}`,
    sources: {
      'google-raster': {
        type: 'raster',
        tiles: [
          `https://maps.googleapis.com/maps/api/staticmap?center={y},{x}&zoom={z}&size=256x256&maptype=${mapType}&key=${apiKey}&format=png`,
        ],
        tileSize: 256,
        attribution: PROVIDER_REGISTRY.google.attribution,
      },
    },
    layers: [
      {
        id: 'google-raster-layer',
        type: 'raster',
        source: 'google-raster',
        minzoom: 0,
        maxzoom: 20,
      },
    ],
  };
};

/** Check if a provider has a valid API key configured */
export const isProviderConfigured = (provider: MapProvider): boolean => {
  if (provider === 'lemat' || provider === 'osm') return true;
  return !!getStoredApiKey(provider);
};
