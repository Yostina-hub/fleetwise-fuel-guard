import { createContext, useContext, ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";

// Re-export the useAuth hook's return type as context for backward compatibility
type AuthContextType = ReturnType<typeof useAuth>;

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const auth = useAuth();

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
};
