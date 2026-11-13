import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { 
  auth, 
  ensureAnonymousAuth, 
  loginWithGoogle, 
  logoutAdmin, 
  isAuthorizedAdmin 
} from '../services/firebase';

interface AuthContextType {
  currentUser: User | null;
  isAdmin: boolean;
  isAuthReady: boolean;
  showAdminModal: boolean;
  setShowAdminModal: (show: boolean) => void;
  loginAsAdmin: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  isAdmin: false,
  isAuthReady: false,
  showAdminModal: false,
  setShowAdminModal: () => {},
  loginAsAdmin: async () => {},
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
  const [showAdminModal, setShowAdminModal] = useState<boolean>(false);

  useEffect(() => {
    // Listen for authentication state changes
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        setIsAdmin(isAuthorizedAdmin(user.email));
        setIsAuthReady(true);
      } else {
        // Automatically sign in anonymously for regular visitors
        try {
          const anonUser = await ensureAnonymousAuth();
          setCurrentUser(anonUser);
          setIsAdmin(false);
        } catch {
          setCurrentUser(null);
          setIsAdmin(false);
        } finally {
          setIsAuthReady(true);
        }
      }
    });

    // Check for secret admin entry via URL (/admin or #admin)
    const checkAdminRoute = () => {
      if (
        window.location.pathname.toLowerCase().endsWith('/admin') ||
        window.location.hash.toLowerCase() === '#admin'
      ) {
        setShowAdminModal(true);
      }
    };
    checkAdminRoute();
    window.addEventListener('hashchange', checkAdminRoute);

    return () => {
      unsubscribe();
      window.removeEventListener('hashchange', checkAdminRoute);
    };
  }, []);

  const loginAsAdmin = async () => {
    const user = await loginWithGoogle();
    setCurrentUser(user);
    setIsAdmin(true);
    setShowAdminModal(false);
  };

  const logout = async () => {
    await logoutAdmin();
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAdmin,
        isAuthReady,
        showAdminModal,
        setShowAdminModal,
        loginAsAdmin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
