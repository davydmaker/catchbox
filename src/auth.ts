import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged as firebaseOnAuthStateChanged, type User } from 'firebase/auth';

export type AuthUser = User;
import { auth } from './firebase.ts';

const provider = new GoogleAuthProvider();

export async function signInWithGoogle(): Promise<User | null> {
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch {
    return null;
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
