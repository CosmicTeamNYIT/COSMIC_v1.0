// AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { auth, db } from '@/src/firebaseConfig';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    User
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

// Defines the shape of the authentication context value
interface AuthContextType {
    user: User | null;
    loading: boolean;
    error: string | null;
    initialAuthCheckComplete: boolean;
    login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
    register: (username: string, email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    wasRemembered: boolean;
    markTemporarilyInactive: () => void;
}

// Helper function to calculate the expiration date for 'Remember Me'
const getExpirationDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 30); // 30 day limit
    return date.toISOString();
};

// Creates the React context for authentication
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook to easily access the authentication context
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

// Provides the authentication context to its children components
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // State variables for user, loading status, error messages, and initial check completion
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [initialAuthCheckComplete, setInitialAuthCheckComplete] = useState(false);
    // State to track if the user was logged in via 'Remember Me'
    const [wasRemembered, setWasRemembered] = useState(false);
    // State and ref to manage temporary inactivity flag
    const [isTemporarilyInactive, setIsTemporarilyInactive] = useState(false);
    const temporaryInactiveTimeout = useRef<NodeJS.Timeout | null>(null);

    // Ref to track the current AppState
    const appState = useRef(AppState.currentState);

    // Function to mark the app as temporarily inactive
    const markTemporarilyInactive = () => {
        setIsTemporarilyInactive(true);
        // Automatically reset the flag after a short delay
        if (temporaryInactiveTimeout.current) {
            clearTimeout(temporaryInactiveTimeout.current);
        }
        temporaryInactiveTimeout.current = setTimeout(() => {
            setIsTemporarilyInactive(false);
        }, 5000); // Adjust the timeout as needed
    };

    // Effect to listen for Firebase Auth state changes and handle auto-login
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // User is signed in
                setUser(firebaseUser);
                setLoading(false);
                setInitialAuthCheckComplete(true);
            } else {
                // User is signed out, check for saved credentials for auto-login
                setUser(null);
                try {
                    const rememberMeEnabled = await AsyncStorage.getItem('rememberMe');
                    const savedEmail = await AsyncStorage.getItem('userEmail');
                    const savedPassword = await AsyncStorage.getItem('userPassword');
                    const expirationDate = await AsyncStorage.getItem('authExpiration');

                    const now = new Date();
                    const isExpired = expirationDate ? new Date(expirationDate) < now : true;

                    if (rememberMeEnabled === 'true' && savedEmail && savedPassword && !isExpired) {
                        try {
                            // Attempt auto-login
                            await signInWithEmailAndPassword(auth, savedEmail, savedPassword);
                            setWasRemembered(true);
                        } catch (e) {
                            // Auto-login failed, clear saved credentials
                            console.error("Auto-login failed, clearing saved credentials and rememberMe flag:", e);
                            await AsyncStorage.removeItem('userEmail');
                            await AsyncStorage.removeItem('userPassword');
                            await AsyncStorage.removeItem('authExpiration');
                            await AsyncStorage.removeItem('rememberMe');
                            setLoading(false);
                            setInitialAuthCheckComplete(true);
                            setWasRemembered(false);
                        }
                    } else {
                         // If no saved credentials or expired, clear any potentially stale data
                        if (isExpired && savedEmail) {
                            await AsyncStorage.removeItem('userEmail');
                            await AsyncStorage.removeItem('userPassword');
                            await AsyncStorage.removeItem('authExpiration');
                            if (rememberMeEnabled === 'true') {
                                await AsyncStorage.removeItem('rememberMe');
                            }
                        }
                        setLoading(false);
                        setInitialAuthCheckComplete(true);
                        setWasRemembered(false);
                    }
                } catch (e) {
                    console.error("Error checking for saved credentials:", e);
                    setLoading(false);
                    setInitialAuthCheckComplete(true);
                    setWasRemembered(false);
                }
            }
        });

        // Clean up the listener on component unmount
        return () => unsubscribe();
    }, []); // Empty dependency array means this runs once on mount



    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextAppState => {
            // Logic can be added here based on app state changes if needed
            appState.current = nextAppState;
        });


        return () => {
            subscription.remove();
        };
    }, [user, wasRemembered, isTemporarilyInactive]); // Dependencies remain the same


    // Function to handle user login with email and password
    const login = async (email: string, password: string, rememberMe: boolean = false) => {
        setLoading(true);
        setError(null);

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            setWasRemembered(rememberMe); // Update state based on rememberMe flag

            // Store credentials if 'Remember Me' is true
            if (rememberMe) {
                const expirationDate = getExpirationDate();
                await AsyncStorage.setItem('userEmail', email);
                await AsyncStorage.setItem('userPassword', password);
                await AsyncStorage.setItem('authExpiration', expirationDate);
                await AsyncStorage.setItem('rememberMe', 'true');
            } else {
                // Clear saved credentials if 'Remember Me' is false
                await AsyncStorage.removeItem('userEmail');
                await AsyncStorage.removeItem('userPassword');
                await AsyncStorage.removeItem('authExpiration');
                await AsyncStorage.removeItem('rememberMe');
            }

            // Fetch user data from Firestore and redirect
            const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
            const userData = userDoc.data();

            // Redirect based on whether user has a location set
            if (userData && userData.location) {
                router.replace('/'); // Navigate to home if location is set
            } else {
                // Navigate to setup if location is not set
                router.push({
                    pathname: '/setup',
                    params: {
                        username: userData?.username || '',
                        email: userCredential.user.email || ''
                    }
                });
            }
        } catch (err) {
            // Handle login errors
            setError('Invalid email or password');
            console.error("Login error:", err);
        } finally {
            // Always set loading to false after login attempt
            setLoading(false);
        }
    };


    // Function to handle user registration with username, email, and password
    const register = async (username: string, email: string, password: string) => {
        setLoading(true);
        setError(null);

        try {
            // Create user in Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);

            // Create a corresponding user document in Firestore
            await setDoc(doc(db, "users", userCredential.user.uid), {
                username,
                email,
                createdAt: new Date(),
            });

            // Redirect to setup page after successful registration
            router.push({
                pathname: '/setup',
                params: {
                    username,
                    email
                }
            });
        } catch (err: any) {
            // Handle registration errors
            if (err.code === 'auth/email-already-in-use') {
                setError('Email is already in use');
            } else if (err.code === 'auth/invalid-email') {
                setError('Invalid email address');
            } else if (err.code === 'auth/weak-password') {
                setError('Password is too weak');
            } else {
                setError('Registration failed');
            }
            console.error("Registration error:", err);
        } finally {
            // Always set loading to false after registration attempt
            setLoading(false);
        }
    };

    // Function to handle user sign out
    const signOut = async () => {
        setLoading(true);
        setError(null);

        try {
            // Clear all saved credentials from AsyncStorage
            await AsyncStorage.removeItem('userEmail');
            await AsyncStorage.removeItem('userPassword');
            await AsyncStorage.removeItem('authExpiration');
            await AsyncStorage.removeItem('rememberMe');

            // Sign out the user from Firebase Auth
            await firebaseSignOut(auth);

            // Reset local state
            setUser(null);
            setWasRemembered(false);

            // Redirect to the login page
            router.replace('/login');
        } catch (err) {
            // Handle sign out errors
            setError('Sign out failed');
            console.error("Sign out error:", err);
        } finally {
            // Always set loading to false after sign out attempt
            setLoading(false);
        }
    };

    // Provides the context value to the children components
    return (
        <AuthContext.Provider value={{
            user,
            loading,
            error,
            initialAuthCheckComplete,
            login,
            register,
            signOut,
            wasRemembered,
            markTemporarilyInactive
        }}>
            {children}
        </AuthContext.Provider>
    );
};

// Export a default component (placeholder for routing)
export default function AuthContextRoute() {
    return null;
}
