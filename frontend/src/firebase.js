import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAsdT5wto73He85BZjf1gu_sEBtDxDgPkA",
  authDomain: "one-to-one-portal-500205.firebaseapp.com",
  projectId: "one-to-one-portal-500205",
  storageBucket: "one-to-one-portal-500205.appspot.com",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
