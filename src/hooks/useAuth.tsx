// Re-export useAuthContext as useAuth for backward compatibility.
// This ensures ALL components share a single auth state instance via React Context
// instead of each creating their own Supabase listener + duplicate DB queries.
export { useAuthContext as useAuth } from "@/contexts/AuthContext";
