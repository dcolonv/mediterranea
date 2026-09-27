import Constants, { ExecutionEnvironment } from 'expo-constants';

/**
 * True when running inside the Expo Go client rather than a development or
 * production build.
 *
 * Expo Go bundles a fixed set of native modules, so anything outside that set
 * — Google Sign-In, remote push — is unavailable and must be skipped rather
 * than imported. Importing such a module here throws, which takes the whole
 * route module down with it.
 */
export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
