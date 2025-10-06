// Import Firebase authentication functions and providers
import {
  GoogleAuthProvider, // Provider for Google OAuth authentication
  signInWithPopup, // Function to sign in using a popup window
  onAuthStateChanged as _onAuthStateChanged, // Function to listen for auth state changes (renamed to avoid conflicts)
  onIdTokenChanged as _onIdTokenChanged, // Function to listen for ID token changes (renamed to avoid conflicts)
} from "firebase/auth";

// Import the Firebase auth instance from the client app configuration
import { auth } from "@/src/lib/firebase/clientApp";

// Wrapper function for onAuthStateChanged that uses our configured auth instance
export function onAuthStateChanged(cb) {
  // Return the result of calling the Firebase onAuthStateChanged with our auth instance
  return _onAuthStateChanged(auth, cb);
}

// Wrapper function for onIdTokenChanged that uses our configured auth instance
export function onIdTokenChanged(cb) {
  // Return the result of calling the Firebase onIdTokenChanged with our auth instance
  return _onIdTokenChanged(auth, cb);
}

// Function to sign in a user with Google OAuth
export async function signInWithGoogle() {
  // Create a new Google authentication provider instance
  const provider = new GoogleAuthProvider();

  // Try to sign in with Google using a popup
  try {
    // Use Firebase's signInWithPopup function with our auth instance and Google provider
    await signInWithPopup(auth, provider);
  } catch (error) {
    // If there's an error during sign in, log it to the console
    console.error("Error signing in with Google", error);
  }
}

// Function to sign out the current user
export async function signOut() {
  // Try to sign out the current user
  try {
    // Call the signOut method on our auth instance and return the result
    return auth.signOut();
  } catch (error) {
    // If there's an error during sign out, log it to the console
    console.error("Error signing out with Google", error);
  }
}
