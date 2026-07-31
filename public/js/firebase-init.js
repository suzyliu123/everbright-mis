/**
 * Firebase Initialization — Real Firebase SDK (Compat CDN)
 * Config: everbright-mis-dev (project 1082537261559)
 *
 * Globals provided after this script:
 *   auth      — firebase.auth()
 *   db        — firebase.firestore()
 *   firebase  — firebase namespace (for FieldValue, etc.)
 */

// ============ Firebase Config ============
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBDPzU71h81re9leLkWzqqqG9Nz-Oqn1x0",
  authDomain: "everbright-mis-dev.firebaseapp.com",
  projectId: "everbright-mis-dev",
  storageBucket: "everbright-mis-dev.firebasestorage.app",
  messagingSenderId: "1082537261559",
  appId: "1:1082537261559:web:586de8fb63b2ea9f7016f2"
};

// ============ Initialize ============
firebase.initializeApp(FIREBASE_CONFIG);

// Shortcuts used by all views
const auth = firebase.auth();
const db = firebase.firestore();

// Enable Firestore emulator in local dev (optional — comment out for production)
// db.useEmulator('localhost', 8080);

// Enable offline persistence (Firestore cache for slow NZ networks)
db.enablePersistence({ synchronizeTabs: true }).catch(err => {
  if (err.code === 'failed-precondition') {
    console.warn('Offline persistence: multiple tabs open, using single tab mode');
  } else if (err.code === 'unimplemented') {
    console.warn('Offline persistence: not supported in this browser');
  }
});

console.log('🔵 Firebase connected — project: ' + FIREBASE_CONFIG.projectId);
