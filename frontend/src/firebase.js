import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDSO3nuH3I6kgJ9o32h3wOcoGr3TGA1Z50",
  authDomain: "one-to-one-eco-system.firebaseapp.com",
  projectId: "one-to-one-eco-system",
  storageBucket: "one-to-one-eco-system.appspot.com",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
