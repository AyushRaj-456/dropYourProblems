import { useState, useEffect } from 'react';
import { auth } from '../firebase';
import {
  loginWithGoogle,
  forceSignInWithGoogle,
  sendEmailLoginLink,
  checkAndCompleteEmailLink,
} from '../services/authService';

export default function LoginPage({ currentUser, onNavigate }) {
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [alreadyExistsNotice, setAlreadyExistsNotice] = useState(null);

  // Check email link on page load
  useEffect(() => {
    if (!auth) return;
    checkAndCompleteEmailLink(auth)
      .then((res) => {
        if (res?.user) {
          if (res.alreadyExists) {
            setAlreadyExistsNotice(res.message);
          } else {
            onNavigate('/');
          }
        }
      })
      .catch((err) => {
        console.error('Email sign in completion failed:', err);
        setErrorMessage(err.message);
      });
  }, [onNavigate]);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setAlreadyExistsNotice(null);

    try {
      const result = await loginWithGoogle(auth);
      if (result.alreadyExists) {
        setAlreadyExistsNotice(result.message);
      } else if (result.user) {
        onNavigate('/');
      }
    } catch (err) {
      console.error('Google login failed:', err);
      setErrorMessage(err.message || 'Google login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForceSignInGoogle = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await forceSignInWithGoogle(auth);
      onNavigate('/');
    } catch (err) {
      setErrorMessage(err.message || 'Login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendEmailLink = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setErrorMessage(null);
    setAlreadyExistsNotice(null);

    try {
      await sendEmailLoginLink(auth, email.trim());
      setEmailSent(true);
    } catch (err) {
      console.error('Email link failed:', err);
      setErrorMessage(err.message || 'Could not send login link.');
    } finally {
      setIsLoading(false);
    }
  };

  const isUserLoggedIn = Boolean(currentUser && !currentUser.isAnonymous);

  return (
    <div className="login-page-container">
      <div className="login-card">
        <h1 className="login-heading">Log in</h1>
        <p className="login-subtext">
          Post problems as a guest, or log in to upvote problems and join Contributors.
        </p>

        {isUserLoggedIn ? (
          <div className="logged-in-box">
            <p className="logged-in-status">
              You are signed in as <strong>{currentUser.email || currentUser.displayName || 'Logged in'}</strong>.
            </p>
            <button
              type="button"
              className="primary-button login-btn"
              onClick={() => onNavigate('/')}
            >
              Return to Board
            </button>
          </div>
        ) : (
          <>
            {alreadyExistsNotice && (
              <div className="warning-notice-box">
                <p className="warning-text">{alreadyExistsNotice}</p>
                <button
                  type="button"
                  className="secondary-button force-login-btn"
                  onClick={handleForceSignInGoogle}
                  disabled={isLoading}
                >
                  Sign in to existing account anyway
                </button>
              </div>
            )}

            <div className="login-options">
              <button
                type="button"
                className="secondary-button google-login-btn"
                onClick={handleGoogleLogin}
                disabled={isLoading}
              >
                {isLoading ? 'Connecting...' : 'Continue with Google'}
              </button>

              <div className="login-divider">
                <span>or</span>
              </div>

              {emailSent ? (
                <div className="email-sent-notice">
                  <p>Login link sent to <strong>{email}</strong>. Check your inbox and tap the link.</p>
                </div>
              ) : (
                <form className="email-link-form" onSubmit={handleSendEmailLink}>
                  <label className="form-group">
                    <span className="field-label muted">Email</span>
                    <input
                      type="email"
                      className="input-field"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </label>
                  <button
                    type="submit"
                    className="primary-button login-btn"
                    disabled={isLoading || !email.trim()}
                  >
                    Email me a link
                  </button>
                </form>
              )}
            </div>

            {errorMessage && <p className="form-error-line">{errorMessage}</p>}
          </>
        )}
      </div>
    </div>
  );
}
