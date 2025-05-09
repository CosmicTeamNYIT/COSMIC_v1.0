
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";


const firebaseConfig = {
  	apiKey: "YOUR_API_KEY",
  	authDomain: "YOUR_AUTH_DOMAIN",
  	projectId: "YOUR_PROJECT_ID",
  	storageBucket: "YOUR_STORAGE_BUCKET",
  	messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  	appId: "YOUR_APP_ID",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
});
const db = getFirestore(app);

export { app, auth, db };