import { logoutUser } from '../services/authService';
import { auth } from '../firebase';

export default function Header({ currentUser, currentPath, onNavigate, isAdmin }) {
  const isUserLoggedIn = Boolean(currentUser && !currentUser.isAnonymous);

  const handleLogout = async (e) => {
    e.preventDefault();
    try {
      await logoutUser(auth);
      onNavigate('/');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <header className="site-header">
      <button
        type="button"
        className="wordmark-btn"
        onClick={() => onNavigate('/')}
      >
        Drop Your Problems
      </button>

      <nav className="site-nav">
        <button
          type="button"
          className={`site-nav-link ${currentPath === '/' ? 'active' : ''}`}
          onClick={() => onNavigate('/')}
        >
          Board
        </button>

        <button
          type="button"
          className={`site-nav-link ${currentPath === '/contributors' ? 'active' : ''}`}
          onClick={() => {
            if (currentPath === '/') {
              const el = document.getElementById('contributors');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            } else {
              onNavigate('/contributors');
            }
          }}
        >
          Contributors
        </button>

        {isUserLoggedIn ? (
          <>
            <button
              type="button"
              className={`site-nav-link ${currentPath === '/me' ? 'active' : ''}`}
              onClick={() => onNavigate('/me')}
            >
              My problems
            </button>
            {isAdmin && (
              <button
                type="button"
                className={`site-nav-link ${currentPath === '/admin' ? 'active' : ''}`}
                onClick={() => onNavigate('/admin')}
              >
                Admin
              </button>
            )}
            <button
              type="button"
              className="site-nav-link logout-link"
              onClick={handleLogout}
            >
              Log out
            </button>
          </>
        ) : (
          <button
            type="button"
            className={`site-nav-link ${currentPath === '/login' ? 'active' : ''}`}
            onClick={() => onNavigate('/login')}
          >
            Log in
          </button>
        )}
      </nav>
    </header>
  );
}
