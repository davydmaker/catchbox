import { GoogleAuthProvider, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged as firebaseOnAuthStateChanged, type User } from 'firebase/auth';

export type AuthUser = User;
import { auth } from './firebase.ts';

const provider = new GoogleAuthProvider();

export function signInWithGoogle(): void {
  signInWithRedirect(auth, provider);
}

export async function checkRedirectResult(): Promise<void> {
  try {
    await getRedirectResult(auth);
  } catch {
    // Redirect result errors are non-critical
  }
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export function onAuthChange(callback: (user: User | null) => void): void {
  firebaseOnAuthStateChanged(auth, callback);
}

export function getCurrentUser(): User | null {
  return auth.currentUser;
}
