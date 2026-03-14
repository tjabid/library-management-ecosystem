import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { auth } from "./config";

export async function signIn(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signOut() {
  return firebaseSignOut(auth);
}

export async function resetPassword(email: string) {
  return sendPasswordResetEmail(auth, email);
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

/** Extract role from Firebase custom claims. */
export async function getUserRole(user: User): Promise<"admin" | "librarian" | null> {
  const token = await user.getIdTokenResult();
  const role = token.claims.role as string | undefined;
  if (role === "admin" || role === "librarian") return role;
  return null;
}
