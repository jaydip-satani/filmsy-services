import admin from "firebase-admin";
import path from "path";

const serviceAccount = path.join(process.cwd(), "firebase-service-key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "filmsy-2210.firebasestorage.app",
});

export const bucket = admin.storage().bucket();
