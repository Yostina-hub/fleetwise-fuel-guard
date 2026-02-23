import { createContext, useContext, ReactNode } from "react";
import { useAuthRaw } from "@/hooks/useAuthRaw";

// Use the raw hook's return type as context type
type AuthContextType = ReturnType<typeof useAuthRaw>;

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const auth = useAuthRaw();

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
