import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';

export function initFirebase(config: FirebaseOptions) {
  return getApps().length === 0 ? initializeApp(config) : getApp();
}
