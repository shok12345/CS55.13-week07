// Import the RestaurantListings component that will display the list of restaurants
import RestaurantListings from "@/src/components/RestaurantListings.jsx";
// Import the getRestaurants function to fetch restaurant data from Firestore
import { getRestaurants } from "@/src/lib/firebase/firestore.js";
// Import the function to get an authenticated Firebase app instance for server-side operations
import { getAuthenticatedAppForUser } from "@/src/lib/firebase/serverApp.js";
// Import getFirestore from Firebase to get a Firestore database instance
import { getFirestore } from "firebase/firestore";

// Force next.js to treat this route as server-side rendered
// Without this line, during the build process, next.js will treat this route as static and build a static HTML file for it

// Export a constant that tells Next.js to always render this page on the server
export const dynamic = "force-dynamic";

// This line also forces this route to be server-side rendered
// export const revalidate = 0;

// Define the default export function for the Home page component
// This is an async function because it needs to fetch data on the server
export default async function Home(props) {
  // Extract search parameters from the URL query string (e.g., ?city=London&category=Indian)
  // The await is needed because searchParams is a Promise in Next.js App Router
  const searchParams = await props.searchParams;
  // Using searchParams which Next.js provides, allows the filtering to happen on the server-side, for example:
  // ?city=London&category=Indian&sort=Review
  // Get an authenticated Firebase app instance for server-side operations
  // This includes the current user's authentication state
  const { firebaseServerApp } = await getAuthenticatedAppForUser();
  // Fetch restaurants from Firestore using the server app and any search parameters
  // This happens on the server before the page is sent to the client
  const restaurants = await getRestaurants(
    // Get a Firestore database instance from the server app
    getFirestore(firebaseServerApp),
    // Pass the search parameters to filter the restaurants
    searchParams
  );
  // Return the JSX for the home page
  return (
    // Main container with CSS class for styling
    <main className="main__home">
      {/* Render the RestaurantListings component with the fetched data */}
      <RestaurantListings
        // Pass the restaurants data as initial data to the component
        initialRestaurants={restaurants}
        // Pass the search parameters so the component knows what filters are active
        searchParams={searchParams}
      />
    </main>
  );
}
