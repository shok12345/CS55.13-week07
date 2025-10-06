// This directive tells Next.js that this component should run on the client side
"use client";
// Import React and the useEffect hook for managing component lifecycle
import React, { useEffect } from "react";
// Import Next.js Link component for client-side navigation
import Link from "next/link";
// Import Firebase authentication functions
import {
  signInWithGoogle, // Function to sign in with Google OAuth
  signOut, // Function to sign out the current user
  onIdTokenChanged, // Function to listen for ID token changes
} from "@/src/lib/firebase/auth.js";
// Import function to add fake restaurant data for testing
import { addFakeRestaurantsAndReviews } from "@/src/lib/firebase/firestore.js";
// Import cookie management functions for storing authentication tokens
import { setCookie, deleteCookie } from "cookies-next";

// Custom hook to manage user session state and sync with Firebase auth
function useUserSession(initialUser) {
  // Use useEffect to set up a listener for authentication state changes
  useEffect(() => {
    // Set up a listener for ID token changes (when user signs in/out)
    return onIdTokenChanged(async (user) => {
      // If user is signed in
      if (user) {
        // Get the user's ID token for server-side authentication
        const idToken = await user.getIdToken();
        // Store the ID token in a cookie for server-side requests
        await setCookie("__session", idToken);
      } else {
        // If user is signed out, remove the session cookie
        await deleteCookie("__session");
      }
      // If the user hasn't changed, don't reload the page
      if (initialUser?.uid === user?.uid) {
        return;
      }
      // If user changed, reload the page to update the UI
      window.location.reload();
    });
  }, [initialUser]); // Re-run effect when initialUser changes

  // Return the current user object
  return initialUser;
}

// Main Header component that displays navigation and user authentication UI
export default function Header({ initialUser }) {
  // Use the custom hook to manage user session
  const user = useUserSession(initialUser);

  // Handler function for sign out button click
  const handleSignOut = (event) => {
    // Prevent the default link behavior
    event.preventDefault();
    // Call the sign out function
    signOut();
  };

  // Handler function for sign in button click
  const handleSignIn = (event) => {
    // Prevent the default link behavior
    event.preventDefault();
    // Call the Google sign in function
    signInWithGoogle();
  };

  // Return the JSX for the header component
  return (
    // Header element with semantic HTML
    <header>
      {/* Logo link that navigates to the home page */}
      <Link href="/" className="logo">
        {/* FriendlyEats logo image */}
        <img src="/friendly-eats.svg" alt="FriendlyEats" />
        {/* Logo text */}
        Friendly Eats
      </Link>
      {/* Conditional rendering based on user authentication status */}
      {user ? (
        // If user is signed in, show profile and menu
        <>
          {/* Profile section container */}
          <div className="profile">
            {/* User info paragraph */}
            <p>
              {/* User profile image with fallback to default image */}
              <img
                className="profileImage"
                src={user.photoURL || "/profile.svg"}
                alt={user.email}
              />
              {/* User's display name */}
              {user.displayName}
            </p>

            {/* Dropdown menu container */}
            <div className="menu">
              {/* Menu items list */}
              <ul>
                {/* Display user's name as first menu item */}
                <li>{user.displayName}</li>

                {/* Menu item to add sample restaurants */}
                <li>
                  <a href="#" onClick={addFakeRestaurantsAndReviews}>
                    Add sample restaurants
                  </a>
                </li>

                {/* Menu item to sign out */}
                <li>
                  <a href="#" onClick={handleSignOut}>
                    Sign Out
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </>
      ) : (
        // If user is not signed in, show sign in button
        <div className="profile">
          {/* Sign in link */}
          <a href="#" onClick={handleSignIn}>
            {/* Default profile image for non-authenticated users */}
            <img src="/profile.svg" alt="A placeholder user image" />
            {/* Sign in text */}
            Sign In with Google
          </a>
        </div>
      )}
    </header>
  );
}
