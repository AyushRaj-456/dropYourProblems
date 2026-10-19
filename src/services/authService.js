import {
  GoogleAuthProvider,
  linkWithPopup,
  signInWithPopup,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  linkWithCredential,
  EmailAuthProvider,
  signOut,
  signInAnonymously,
} from 'firebase/auth';

export async function loginWithGoogle(auth) {
  if (!auth) throw new Error('Firebase Auth is not initialized.');

  const provider = new GoogleAuthProvider();
  const currentUser = auth.currentUser;

  // If user is currently anonymous, attempt to upgrade / link the existing account
  if (currentUser && currentUser.isAnonymous) {
    try {
      const result = await linkWithPopup(currentUser, provider);
      return { user: result.user, linked: true };
    } catch (err) {
      if (
        err.code === 'auth/credential-already-in-use' ||
        err.code === 'auth/email-already-in-use'
      ) {
        // Known limit from docs/product.md
        return {
          alreadyExists: true,
          message:
            "An account with this email already exists. We couldn't move your earlier posts from this browser into it. Log in with that account to access its posts, or continue here anonymously.",
        };
      }
      throw err;
    }
  }

  // Otherwise, standard sign in
  const result = await signInWithPopup(auth, provider);
  return { user: result.user, linked: false };
}

export async function forceSignInWithGoogle(auth) {
  if (!auth) throw new Error('Firebase Auth is not initialized.');
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function sendEmailLoginLink(auth, email) {
  if (!auth) throw new Error('Firebase Auth is not initialized.');
  const actionCodeSettings = {
    url: window.location.origin + '/login',
    handleCodeInApp: true,
  };
  await sendSignInLinkToEmail(auth, email, actionCodeSettings);
  localStorage.setItem('emailForSignIn', email);
}

export async function checkAndCompleteEmailLink(auth) {
  if (!auth || typeof window === 'undefined') return null;

  if (isSignInWithEmailLink(auth, window.location.href)) {
    let email = localStorage.getItem('emailForSignIn');
    if (!email) {
      email = window.prompt('Please provide your email for confirmation');
    }
    if (!email) return null;

    const currentUser = auth.currentUser;
    if (currentUser && currentUser.isAnonymous) {
      try {
        const credential = EmailAuthProvider.credentialWithLink(
          email,
          window.location.href
        );
        const result = await linkWithCredential(currentUser, credential);
        localStorage.removeItem('emailForSignIn');
        return { user: result.user, linked: true };
      } catch (err) {
        if (
          err.code === 'auth/credential-already-in-use' ||
          err.code === 'auth/email-already-in-use'
        ) {
          const result = await signInWithEmailLink(
            auth,
            email,
            window.location.href
          );
          localStorage.removeItem('emailForSignIn');
          return {
            user: result.user,
            linked: false,
            alreadyExists: true,
            message:
              "An account with this email already exists. We couldn't move your earlier posts from this browser into it.",
          };
        }
        throw err;
      }
    } else {
      const result = await signInWithEmailLink(
        auth,
        email,
        window.location.href
      );
      localStorage.removeItem('emailForSignIn');
      return { user: result.user, linked: false };
    }
  }
  return null;
}

export async function logoutUser(auth) {
  if (!auth) return;
  await signOut(auth);
  // Re-sign in anonymously so user is always anonymous by default
  await signInAnonymously(auth);
}
