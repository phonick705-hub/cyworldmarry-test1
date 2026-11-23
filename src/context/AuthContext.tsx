import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { 
  auth, 
  loginWithGoogle, 
  logoutAdmin, 
  isAuthorizedAdmin,
  checkIsAuthorizedAdmin
} from '../services/firebase';

interface AuthContextType {
  currentUser: User | null;
  isAdmin: boolean;
  isPrimaryAdmin: boolean;
  isAuthReady: boolean;
  showAdminModal: boolean;
  setShowAdminModal: (show: boolean) => void;
  loginAsAdmin: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  isAdmin: false,
  isPrimaryAdmin: false,
  isAuthReady: false,
  showAdminModal: false,
  setShowAdminModal: () => {},
  loginAsAdmin: async () => {},
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isPrimaryAdmin, setIsPrimaryAdmin] = useState<boolean>(false);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
  const [showAdminModal, setShowAdminModal] = useState<boolean>(false);

  useEffect(() => {
    let active = true;

    // Listen for authentication state changes
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!active) return;

      if (user) {
        setCurrentUser(user);
        if (isAuthorizedAdmin(user.email)) {
          setIsPrimaryAdmin(true);
          setIsAdmin(true);
          setIsAuthReady(true);
        } else {
          setIsPrimaryAdmin(false);
          const authorized = await checkIsAuthorizedAdmin(user.email);
          if (!active) return;
          setIsAdmin(authorized);
          setIsAuthReady(true);
        }
      } else {
        setCurrentUser(null);
        setIsPrimaryAdmin(false);
        setIsAdmin(false);
        setIsAuthReady(true);
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
    setIsPrimaryAdmin(isAuthorizedAdmin(user.email));
    setIsAdmin(true);
    setShowAdminModal(false);
  };

  const logout = async () => {
    await logoutAdmin();
    setCurrentUser(null);
    setIsPrimaryAdmin(false);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAdmin,
        isPrimaryAdmin,
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
