import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth';
import { ref, get, set } from 'firebase/database';
import { auth, db } from '../firebase';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const register = async (email, password) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    const userProfile = {
      email: user.email,
      displayName: user.email.split('@')[0], // Create a default name
      assignedLocker: "",
      isAdmin: false,
    };

    await set(ref(db, `users/${user.uid}`), userProfile);
    
    // Manually set state after registration
    setCurrentUser({ ...user, ...userProfile }); 
    setIsAdmin(false);
    return user;
  };

  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const logout = () => {
    return signOut(auth);
  };

  // 2. Real-time User State Observer
  useEffect(() => {
    setLoading(true); 
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      
      // --- DEBUGGING LOGS ---
      console.log("Auth State Changed. User UID:", user ? user.uid : 'null');

      if (user) {
        try { 
          const userRef = ref(db, `users/${user.uid}`);
          // DEBUG: See the exact path it's trying to read
          console.log("Attempting to fetch profile from:", userRef.toString()); 
          
          const snapshot = await get(userRef);
          
          if (snapshot.exists()) {
            const userData = snapshot.val();
            // DEBUG: This log will show if the data was found
            console.log("SUCCESS: Found user profile data in DB:", userData); 
            
            setCurrentUser({ ...user, ...userData });
            setIsAdmin(userData.isAdmin || false);
          } else {
            // DEBUG: This log will show if the path is wrong or rules failed
            console.error("FAILURE: User is authenticated, but no profile was found at that path.");
            setCurrentUser(user); 
            setIsAdmin(false);
          }
        } catch (error) {
            // DEBUG: This log will show if security rules denied the read
            console.error("CRITICAL FAILURE: Error fetching user profile from DB. Check rules.", error);
            setCurrentUser(user);
            setIsAdmin(false);
        }
      } else {
        console.log("User signed out.");
        setCurrentUser(null);
        setIsAdmin(false);
      }
      
      setLoading(false); 
    });

    return unsubscribe;
  }, []); // Empty array is correct

  const value = {
    currentUser,
    isAdmin,
    loading,
    register,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

