import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
// @ts-ignore
import firebaseConfig from '../firebase-applet-config.json';

if (!firebaseConfig || !firebaseConfig.projectId) {
  console.error("Firebase configuration is missing or invalid. Check firebase-applet-config.json.");
}

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig || {});
export const db = getFirestore(app, (firebaseConfig && firebaseConfig.firestoreDatabaseId) || undefined);
export const auth = getAuth(app);

// Lazy storage initialization to prevent top-level crashes
let storageInstance: any;
try {
  if (firebaseConfig.storageBucket) {
    console.log('Inicializando Storage con bucket:', firebaseConfig.storageBucket);
    storageInstance = getStorage(app);
    console.log('Storage inicializado correctamente');
  } else {
    console.error("Firebase Storage Bucket is missing in configuration.");
  }
} catch (error) {
  console.error("Error initializing Firebase Storage:", error);
}

export const storage = storageInstance;
export const googleProvider = new GoogleAuthProvider();
export { ref, uploadBytes, getDownloadURL };

// Error handling for Firestore
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. ");
    }
  }
}
testConnection();
