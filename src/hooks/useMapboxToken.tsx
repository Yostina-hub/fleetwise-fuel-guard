/**
 * Legacy hook - now returns a dummy token since Lemat tiles are public.
 * Kept for backward compatibility with components that import it.
 */
export const useMapboxToken = () => {
  return {
    token: 'lemat-public', // Lemat tiles don't need a token
    loading: false,
    error: null,
  };
};
