import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';

/**
 * Hook to fetch the Mapbox token from organization settings or backend
 * Priority: org settings > localStorage cache > env variable > edge function
 */
export const useMapboxToken = () => {
  const [token, setToken] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { organizationId } = useOrganization();

  useEffect(() => {
    const isValidPublicToken = (value: unknown): value is string => {
      return typeof value === 'string' && value.trim().startsWith('pk.');
    };

    const fetchToken = async () => {
      setLoading(true);
      setError(null);

      try {
        // 1) Try to fetch from organization_settings first
        if (organizationId) {
          try {
            const { data: orgSettings } = await supabase
              .from('organization_settings')
              .select('mapbox_token')
              .eq('organization_id', organizationId)
              .maybeSingle();

            if (orgSettings?.mapbox_token && isValidPublicToken(orgSettings.mapbox_token)) {
              console.log('Using mapbox token from organization settings');
              setToken(orgSettings.mapbox_token);
              // Cache it locally for faster subsequent loads
              try { localStorage.setItem('mapbox_token', orgSettings.mapbox_token); } catch {}
              setLoading(false);
              return;
            }
          } catch (e) {
            console.warn('Failed to fetch token from org settings:', e);
          }
        }

        // 2) Try localStorage cache
        const lsToken = localStorage.getItem('mapbox_token');
        if (lsToken && isValidPublicToken(lsToken)) {
          setToken(lsToken);
          setLoading(false);
          return;
        }
        // Clear invalid cached token
        if (lsToken) {
          try { localStorage.removeItem('mapbox_token'); } catch {}
        }

        // 3) Try env variable
        const envToken = import.meta.env.VITE_MAPBOX_TOKEN;
        if (envToken && isValidPublicToken(envToken)) {
          setToken(envToken);
          setLoading(false);
          return;
        }

        // 4) Fetch from backend edge function
        const { data, error: fetchError } = await supabase.functions.invoke('get-mapbox-token', {
          body: { organization_id: organizationId }
        });

        if (fetchError) {
          console.error('get-mapbox-token error:', fetchError);
          setError('Failed to fetch map token');
          setLoading(false);
          return;
        }

        const fetched = data?.token as string | undefined;
        if (!isValidPublicToken(fetched)) {
          setError('Invalid or missing map token');
          setLoading(false);
          return;
        }

        try { localStorage.setItem('mapbox_token', fetched); } catch {}
        setToken(fetched);
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch Mapbox token:', err);
        setError('Failed to fetch map token');
        setLoading(false);
      }
    };

    fetchToken();
  }, [organizationId]);

  return { token, loading, error };
};
