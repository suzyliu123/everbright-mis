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
  }
};
