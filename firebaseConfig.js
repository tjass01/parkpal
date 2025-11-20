// Firebase connection setup for backend services
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBsnk_crHqESWdR2amLgDTn2sGxm0VOgDs",
  authDomain: "parkpal-b381c.firebaseapp.com",
  databaseURL: "https://parkpal-b381c-default-rtdb.firebaseio.com",
  projectId: "parkpal-b381c",
  storageBucket: "parkpal-b381c.firebasestorage.app",
  messagingSenderId: "708794384681",
  appId: "1:708794384681:web:bfdd19e624571e34f13738"
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

// Export database and auth for use across the app
export { database, auth };