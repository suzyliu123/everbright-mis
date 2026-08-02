/**
 * Auth Service — Login, Logout, Role management
 * All UI state changes are handled by the main app render loop
 */

const Auth = {
  // Current user state (reactive)
  currentUser: null,
  userProfile: null, // Firestore user doc
  role: null,
  isLoggedIn: false,
  // Manager email+password captured at login (in-memory, session-only).
  // Needed because creating an Auth account signs in the NEW user, so we must
  // re-authenticate the manager afterwards to keep them logged in.
  sessionCreds: null,

  // Listen for auth state changes
  init() {
    auth.onAuthStateChanged(async (user) => {
      if (user) {
        Auth.currentUser = user;
        Auth.isLoggedIn = true;

        // Get role from custom claims (force refresh)
        await user.getIdTokenResult(true);
        Auth.role = user.role || 'adviser'; // custom claims

        // Fetch Firestore user profile
        try {
          const doc = await db.collection('users').doc(user.uid).get();
          if (doc.exists) {
            Auth.userProfile = doc.data();
            // Sync role from Firestore if claims not set yet
            if (!Auth.role || Auth.role === 'adviser') {
              Auth.role = doc.data().role || 'adviser';
            }
          }
        } catch (e) {
          console.warn('Could not fetch user profile:', e.message);
        }

        console.log(`👤 Logged in as ${user.email} (${Auth.role})`);
      } else {
        Auth.currentUser = null;
        Auth.userProfile = null;
        Auth.role = null;
        Auth.isLoggedIn = false;
        console.log('👋 Logged out');
      }

      // Trigger app re-render
      if (typeof render === 'function') render();
    });
  },

  // Email/Password Login
  async login(email, password) {
    try {
      const result = await auth.signInWithEmailAndPassword(email, password);
      Auth.sessionCreds = { email, password }; // session-only, for privileged ops (add adviser)
      return { success: true, user: result.user };
    } catch (err) {
      console.error('Login failed:', err.code);
      let msg = 'Login failed';
      switch (err.code) {
        case 'auth/user-not-found': msg = 'No account found with this email'; break;
        case 'auth/wrong-password': msg = 'Incorrect password'; break;
        case 'auth/invalid-email': msg = 'Invalid email address'; break;
        case 'auth/user-disabled': msg = 'This account has been disabled'; break;
        case 'auth/too-many-requests': msg = 'Too many attempts. Please try again later'; break;
        default: msg = err.message;
      }
      return { success: false, error: msg };
    }
  },

  // Logout
  async logout() {
    try {
      await auth.signOut();
      Auth.sessionCreds = null;
      return { success: true };
    } catch (err) {
      console.error('Logout failed:', err);
      return { success: false, error: err.message };
    }
  },

  // Check if user has management access
  isManagement() {
    return Auth.role === 'admin' || Auth.role === 'management';
  },

  // Check if user is adviser
  isAdviser() {
    return Auth.role === 'adviser';
  },

  // Get display name
  displayName() {
    if (Auth.userProfile?.displayName) return Auth.userProfile.displayName;
    if (Auth.currentUser?.displayName) return Auth.currentUser.displayName;
    return Auth.currentUser?.email?.split('@')[0] || 'User';
  },

  /**
   * Create a new Adviser account (Auth + Firestore user doc).
   * Management only. Creating the Auth account signs in the NEW user, so we
   * re-authenticate the manager afterwards using the credentials captured at login.
   */
  async createAdviserAccount({ displayName, email, password, type }) {
    if (!Auth.isManagement()) return { success: false, error: 'No permission (management only)' };
    if (!Auth.sessionCreds) {
      return { success: false, error: 'Session expired — please log out and log back in as manager, then try again.' };
    }
    const managerUid = Auth.currentUser?.uid || null;
    try {
      // 1) Create the Firebase Auth account (this signs in the new user)
      const cred = await auth.createUserWithEmailAndPassword(email, password);
      const uid = cred.user.uid;

      // 2) Write the Firestore user doc as the new user (self-create rule allows role='adviser')
      await db.collection('users').doc(uid).set({
        displayName: displayName || email.split('@')[0],
        email: email,
        role: 'adviser',
        type: type || 'loan',
        status: 'active',
        createdAt: new Date().toISOString(),
        createdBy: managerUid
      });

      // 3) Restore the manager session
      try {
        await auth.signInWithEmailAndPassword(Auth.sessionCreds.email, Auth.sessionCreds.password);
      } catch (reAuthErr) {
        return { success: true, uid, warning: 'Adviser account created, but your session was signed out. Please log out and log back in as manager.' };
      }
      return { success: true, uid };
    } catch (err) {
      let msg = err.message;
      if (err.code === 'auth/email-already-in-use') msg = 'This email is already registered';
      else if (err.code === 'auth/weak-password') msg = 'Password must be at least 6 characters';
      else if (err.code === 'auth/invalid-email') msg = 'Invalid email address';
      // best-effort: restore manager session if it was interrupted
      if (Auth.sessionCreds) {
        try { await auth.signInWithEmailAndPassword(Auth.sessionCreds.email, Auth.sessionCreds.password); } catch (e) {}
      }
      return { success: false, error: msg };
    }
  }
};
