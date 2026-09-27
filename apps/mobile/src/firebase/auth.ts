import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { Platform } from 'react-native';
import { isExpoGo } from '@/src/runtime';
import { auth } from './config';

/**
 * The web client id is what mints the ID token Firebase needs, on both
 * platforms — the iOS one only identifies the app to Google.
 */
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

/**
 * Whether Google sign-in can actually run here.
 *
 * Needs the web client id *and* a real build: @react-native-google-signin is a
 * native module that Expo Go does not bundle. Gate the button on this — the
 * alternative is a crash the moment the screen mounts.
 */
export const GOOGLE_AVAILABLE = Boolean(WEB_CLIENT_ID) && !isExpoGo;

/** Loaded on demand so Expo Go never touches the missing native module. */
async function loadGoogleSignin() {
  if (!GOOGLE_AVAILABLE) return null;
  try {
    return await import('@react-native-google-signin/google-signin');
  } catch (error) {
    console.log('[auth] Google Sign-In unavailable:', error);
    return null;
  }
}

let configured = false;

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const result = await signInWithEmailAndPassword(auth, email.trim(), password);
  return result.user;
}

export async function signInWithGoogleCredential(idToken: string): Promise<User> {
  const credential = GoogleAuthProvider.credential(idToken);
  const result = await signInWithCredential(auth, credential);
  return result.user;
}

/** Raised for a sign-in the user backed out of, so callers can stay silent. */
export class GoogleSignInCancelled extends Error {
  constructor() {
    super('Google sign-in cancelled');
    this.name = 'GoogleSignInCancelled';
  }
}

/**
 * Opens the native Google account picker and signs the resulting identity into
 * Firebase. Throws `GoogleSignInCancelled` when the user dismisses it.
 */
export async function signInWithGoogle(): Promise<User> {
  const mod = await loadGoogleSignin();
  if (!mod) throw new Error('Google sign-in is not available in this build.');

  const { GoogleSignin, statusCodes } = mod;

  if (!configured) {
    GoogleSignin.configure({
      webClientId: WEB_CLIENT_ID,
      ...(IOS_CLIENT_ID ? { iosClientId: IOS_CLIENT_ID } : {}),
    });
    configured = true;
  }

  try {
    // Android needs Play Services present before the picker will open.
    if (Platform.OS === 'android') {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    }

    const response = await GoogleSignin.signIn();
    if (response.type === 'cancelled') throw new GoogleSignInCancelled();

    const idToken = response.data.idToken;
    if (!idToken) {
      throw new Error('Google did not return an ID token. Check the web client id.');
    }
    return await signInWithGoogleCredential(idToken);
  } catch (error) {
    if (error instanceof GoogleSignInCancelled) throw error;
    // Older versions of the library report cancellation as a status code.
    if ((error as { code?: string })?.code === statusCodes.SIGN_IN_CANCELLED) {
      throw new GoogleSignInCancelled();
    }
    throw error;
  }
}

export async function signOut(): Promise<void> {
  // Clear the Google session too, so the next sign-in offers the picker again
  // rather than silently reusing the last account.
  const mod = await loadGoogleSignin();
  if (mod && configured) {
    await mod.GoogleSignin.signOut().catch(() => {});
  }
  await firebaseSignOut(auth);
}

export function onAuthChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

export async function getIdToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}
