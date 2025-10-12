// Import function to generate fake restaurant and review data for testing
import { generateFakeRestaurantsAndReviews } from "@/src/lib/fakeRestaurants.js";

// Import Firebase Firestore functions for database operations
import {
  collection, // Function to reference a collection in Firestore
  onSnapshot, // Function to listen for real-time updates to documents
  query, // Function to create a query for filtering documents
  getDocs, // Function to get all documents from a query
  doc, // Function to reference a specific document
  getDoc, // Function to get a single document
  updateDoc, // Function to update a document
  orderBy, // Function to order query results
  Timestamp, // Firebase timestamp type for storing dates
  runTransaction, // Function to run atomic transactions
  where, // Function to add where clauses to queries
  addDoc, // Function to add a new document to a collection
  getFirestore, // Function to get a Firestore instance
} from "firebase/firestore";

// Import the Firestore database instance from the client app configuration
import { db } from "@/src/lib/firebase/clientApp";

// Function to update a restaurant's image reference in Firestore
export async function updateRestaurantImageReference(
  restaurantId, // The ID of the restaurant to update
  publicImageUrl // The new public URL for the restaurant's image
) {
  // Create a reference to the specific restaurant document
  const restaurantRef = doc(collection(db, "restaurants"), restaurantId);
  // Check if the restaurant reference exists
  if (restaurantRef) {
    // Update the restaurant document with the new photo URL
    await updateDoc(restaurantRef, { photo: publicImageUrl });
  }
}

const updateWithRating = async (
  transaction,
  docRef,
  newRatingDocument,
  review
) => {
  const restaurant = await transaction.get(docRef);
  const data = restaurant.data();
  const newNumRatings = data?.numRatings ? data.numRatings + 1 : 1;
  const newSumRating = (data?.sumRating || 0) + Number(review.rating);
  const newAverage = newSumRating / newNumRatings;

  transaction.update(docRef, {
    numRatings: newNumRatings,
    sumRating: newSumRating,
    avgRating: newAverage,
  });

  transaction.set(newRatingDocument, {
    ...review,
    timestamp: Timestamp.fromDate(new Date()),
  });
};

export async function addReviewToRestaurant(db, restaurantId, review) {
  if (!restaurantId) {
          throw new Error("No restaurant ID has been provided.");
  }

  if (!review) {
          throw new Error("A valid review has not been provided.");
  }

  try {
          const docRef = doc(collection(db, "restaurants"), restaurantId);
          const newRatingDocument = doc(
                  collection(db, `restaurants/${restaurantId}/ratings`)
          );

          // corrected line
          await runTransaction(db, transaction =>
                  updateWithRating(transaction, docRef, newRatingDocument, review)
          );
  } catch (error) {
          console.error(
                  "There was an error adding the rating to the restaurant",
                  error
          );
          throw error;
  }
}

// Helper function to apply filters and sorting to a Firestore query
function applyQueryFilters(q, { category, city, price, sort }) {
  // If category filter is provided, add a where clause for category
  if (category) {
    q = query(q, where("category", "==", category));
  }
  // If city filter is provided, add a where clause for city
  if (city) {
    q = query(q, where("city", "==", city));
  }
  // If price filter is provided, add a where clause for price (using price string length)
  if (price) {
    q = query(q, where("price", "==", price.length));
  }
  // Apply sorting based on the sort parameter
  if (sort === "Rating" || !sort) {
    // Sort by average rating in descending order (highest first)
    q = query(q, orderBy("avgRating", "desc"));
  } else if (sort === "Review") {
    // Sort by number of ratings in descending order (most reviews first)
    q = query(q, orderBy("numRatings", "desc"));
  }
  // Return the modified query with all filters and sorting applied
  return q;
}

// Function to fetch restaurants from Firestore with optional filtering
export async function getRestaurants(db = db, filters = {}) {
  // Create a base query for the restaurants collection
  let q = query(collection(db, "restaurants"));

  // Apply any filters (category, city, price, sort) to the query
  q = applyQueryFilters(q, filters);
  // Execute the query and get all matching documents
  const results = await getDocs(q);
  // Transform the Firestore documents into plain JavaScript objects
  return results.docs.map((doc) => {
    return {
      id: doc.id, // Include the document ID
      ...doc.data(), // Spread all the document data
      // Only plain objects can be passed to Client Components from Server Components
      // Convert Firebase Timestamp to JavaScript Date object
      timestamp: doc.data().timestamp.toDate(),
    };
  });
}

// Function to set up a real-time listener for restaurants with optional filtering
export function getRestaurantsSnapshot(cb, filters = {}) {
  // Validate that the callback parameter is a function
  if (typeof cb !== "function") {
    // Log an error if callback is not a function
    console.log("Error: The callback parameter is not a function");
    // Return early if callback is invalid
    return;
  }

  // Create a base query for the restaurants collection
  let q = query(collection(db, "restaurants"));
  // Apply any filters (category, city, price, sort) to the query
  q = applyQueryFilters(q, filters);

  // Set up a real-time listener that will call the callback whenever data changes
  return onSnapshot(q, (querySnapshot) => {
    // Transform the Firestore documents into plain JavaScript objects
    const results = querySnapshot.docs.map((doc) => {
      return {
        id: doc.id, // Include the document ID
        ...doc.data(), // Spread all the document data
        // Only plain objects can be passed to Client Components from Server Components
        // Convert Firebase Timestamp to JavaScript Date object
        timestamp: doc.data().timestamp.toDate(),
      };
    });

    // Call the provided callback function with the transformed results
    cb(results);
  });
}

// Function to fetch a single restaurant by its ID
export async function getRestaurantById(db, restaurantId) {
  // Validate that a restaurant ID was provided
  if (!restaurantId) {
    // Log an error if no ID was provided
    console.log("Error: Invalid ID received: ", restaurantId);
    // Return early if no valid ID
    return;
  }
  // Create a reference to the specific restaurant document
  const docRef = doc(db, "restaurants", restaurantId);
  // Fetch the document from Firestore
  const docSnap = await getDoc(docRef);
  // Return the restaurant data as a plain JavaScript object
  return {
    ...docSnap.data(), // Spread all the document data
    // Convert Firebase Timestamp to JavaScript Date object
    timestamp: docSnap.data().timestamp.toDate(),
  };
}

// Function to set up a real-time listener for a single restaurant (currently not implemented)
export function getRestaurantSnapshotById(restaurantId, cb) {
  // Currently not implemented - returns without doing anything
  return;
}

// Function to fetch all reviews for a specific restaurant
export async function getReviewsByRestaurantId(db, restaurantId) {
  // Validate that a restaurant ID was provided
  if (!restaurantId) {
    // Log an error if no restaurant ID was provided
    console.log("Error: Invalid restaurantId received: ", restaurantId);
    // Return early if no valid ID
    return;
  }

  // Create a query for the ratings subcollection of the restaurant
  // Order by timestamp in descending order (newest reviews first)
  const q = query(
    collection(db, "restaurants", restaurantId, "ratings"),
    orderBy("timestamp", "desc")
  );

  // Execute the query and get all matching review documents
  const results = await getDocs(q);
  // Transform the Firestore documents into plain JavaScript objects
  return results.docs.map((doc) => {
    return {
      id: doc.id, // Include the document ID
      ...doc.data(), // Spread all the document data
      // Only plain objects can be passed to Client Components from Server Components
      // Convert Firebase Timestamp to JavaScript Date object
      timestamp: doc.data().timestamp.toDate(),
    };
  });
}

// Function to set up a real-time listener for reviews of a specific restaurant
export function getReviewsSnapshotByRestaurantId(restaurantId, cb) {
  // Validate that a restaurant ID was provided
  if (!restaurantId) {
    // Log an error if no restaurant ID was provided
    console.log("Error: Invalid restaurantId received: ", restaurantId);
    // Return early if no valid ID
    return;
  }

  // Create a query for the ratings subcollection of the restaurant
  // Order by timestamp in descending order (newest reviews first)
  const q = query(
    collection(db, "restaurants", restaurantId, "ratings"),
    orderBy("timestamp", "desc")
  );
  // Set up a real-time listener that will call the callback whenever review data changes
  return onSnapshot(q, (querySnapshot) => {
    // Transform the Firestore documents into plain JavaScript objects
    const results = querySnapshot.docs.map((doc) => {
      return {
        id: doc.id, // Include the document ID
        ...doc.data(), // Spread all the document data
        // Only plain objects can be passed to Client Components from Server Components
        // Convert Firebase Timestamp to JavaScript Date object
        timestamp: doc.data().timestamp.toDate(),
      };
    });
    // Call the provided callback function with the transformed results
    cb(results);
  });
}

// Function to add fake restaurant and review data to Firestore for testing purposes
export async function addFakeRestaurantsAndReviews() {
  // Generate fake restaurant and review data using the imported function
  const data = await generateFakeRestaurantsAndReviews();
  // Iterate through each restaurant and its associated reviews
  for (const { restaurantData, ratingsData } of data) {
    // Wrap the database operations in a try-catch block for error handling
    try {
      // Add the restaurant document to the restaurants collection
      const docRef = await addDoc(
        collection(db, "restaurants"),
        restaurantData
      );

      // Add each review/rating to the restaurant's ratings subcollection
      for (const ratingData of ratingsData) {
        await addDoc(
          collection(db, "restaurants", docRef.id, "ratings"),
          ratingData
        );
      }
    } catch (e) {
      // Log an error message if there was a problem adding the documents
      console.log("There was an error adding the document");
      // Log the detailed error information
      console.error("Error adding document: ", e);
    }
  }
}
