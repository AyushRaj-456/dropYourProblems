import { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import PostForm from './components/PostForm';
import FiltersAndSort from './components/FiltersAndSort';
import ProblemList from './components/ProblemList';
import ContributorsSection from './components/ContributorsSection';
import LoginPage from './pages/LoginPage';
import MyProblemsPage from './pages/MyProblemsPage';
import AdminPage from './pages/AdminPage';
import NotFoundPage from './pages/NotFoundPage';
import { subscribeToAuth, isFirebaseConfigured } from './firebase';
import { fetchProblems } from './services/problemService';
import { checkIsAdmin } from './services/adminService';
import { useRouter } from './utils/router.jsx';
import './App.css';

export default function App() {
  const { path, navigate } = useRouter();

  const [activeTag, setActiveTag] = useState('All');
  const [activeSort, setActiveSort] = useState('most');
  const [currentUser, setCurrentUser] = useState(null);

  const [problems, setProblems] = useState([]);
  const [lastVisible, setLastVisible] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [contributorsRefreshKey, setContributorsRefreshKey] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

  // Subscribe to auth
  useEffect(() => {
    if (!isFirebaseConfigured) {
      setIsLoading(false);
      return;
    }
    const unsubscribe = subscribeToAuth((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Check admin status
  useEffect(() => {
    let isMounted = true;
    if (!currentUser || currentUser.isAnonymous) {
      setIsAdmin(false);
      return;
    }
    checkIsAdmin(currentUser).then((status) => {
      if (isMounted) setIsAdmin(status);
    });
    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  // Fetch problems when tag or sort changes
  const loadInitialProblems = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchProblems({
        tag: activeTag,
        sort: activeSort,
        lastDoc: null,
        pageSize: 20,
      });
      setProblems(res.problems);
      setLastVisible(res.lastVisible);
      setHasMore(Boolean(res.lastVisible));
    } catch (err) {
      console.error('Failed to load problems:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeTag, activeSort]);

  useEffect(() => {
    if (path === '/' || path === '') {
      loadInitialProblems();
    }
  }, [path, loadInitialProblems]);

  // Load more for pagination
  const handleLoadMore = async () => {
    if (!lastVisible || isLoading) return;
    setIsLoading(true);
    try {
      const res = await fetchProblems({
        tag: activeTag,
        sort: activeSort,
        lastDoc: lastVisible,
        pageSize: 20,
      });
      setProblems((prev) => [...prev, ...res.problems]);
      setLastVisible(res.lastVisible);
      setHasMore(Boolean(res.lastVisible));
    } catch (err) {
      console.error('Failed to load more problems:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProblemPosted = (newProblem) => {
    setProblems((prev) => [newProblem, ...prev]);
  };

  const handleProblemUpdated = (updatedProblem) => {
    setProblems((prev) =>
      prev.map((p) => (p.id === updatedProblem.id ? updatedProblem : p))
    );
  };

  const handleProblemDeleted = (deletedId) => {
    setProblems((prev) => prev.filter((p) => p.id !== deletedId));
  };

  return (
    <div className="page-wrapper">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <div className="main-container">
        <Header
          currentUser={currentUser}
          currentPath={path}
          onNavigate={navigate}
          isAdmin={isAdmin}
        />

        <main id="main-content">
          {path === '/login' ? (
            <LoginPage
              currentUser={currentUser}
              onNavigate={navigate}
            />
          ) : path === '/me' ? (
            <MyProblemsPage
              currentUser={currentUser}
              onNavigate={navigate}
            />
          ) : path === '/admin' ? (
            <AdminPage
              currentUser={currentUser}
              onNavigate={navigate}
            />
          ) : path === '/contributors' ? (
            <ContributorsSection refreshKey={contributorsRefreshKey} />
          ) : path === '/' || path === '' ? (
            <>
              <Hero />
              <PostForm
                currentUser={currentUser}
                onProblemPosted={handleProblemPosted}
              />
              <section id="board" className="board-section">
                <FiltersAndSort
                  activeTag={activeTag}
                  onSelectTag={setActiveTag}
                  activeSort={activeSort}
                  onSelectSort={setActiveSort}
                />
                <ProblemList
                  problems={problems}
                  currentUser={currentUser}
                  isLoading={isLoading}
                  onProblemUpdated={handleProblemUpdated}
                  onProblemDeleted={handleProblemDeleted}
                  hasMore={hasMore}
                  onLoadMore={handleLoadMore}
                  onNavigate={navigate}
                  onContributorClaimed={() =>
                    setContributorsRefreshKey((k) => k + 1)
                  }
                  activeTag={activeTag}
                  onClearFilter={() => setActiveTag('All')}
                />
              </section>
              <ContributorsSection refreshKey={contributorsRefreshKey} />
            </>
          ) : (
            <NotFoundPage onNavigate={navigate} />
          )}
        </main>
      </div>
    </div>
  );
}
