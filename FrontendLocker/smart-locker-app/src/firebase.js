import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyBOMemEmtk-rBdNI2tTWhDr8dnRrxaiXSw",
  authDomain: "locker-1bc1c.firebaseapp.com",
  databaseURL: "https://locker-1bc1c-default-rtdb.firebaseio.com",
  projectId: "locker-1bc1c",
  storageBucket: "locker-1bc1c.firebasestorage.app",
  messagingSenderId: "66476889357",
  appId: "1:66476889357:web:28e2c6d703a82aa53d4c44"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
