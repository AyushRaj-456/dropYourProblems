import { useState, useEffect } from 'react';
import ProblemRow from '../components/ProblemRow';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function MyProblemsPage({ currentUser, onNavigate }) {
  const [problems, setProblems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentUser || !db) {
      setIsLoading(false);
      return;
    }

    async function loadUserProblems() {
      setIsLoading(true);
      try {
        const q = query(
          collection(db, 'problems'),
          where('hidden', '==', false)
        );
        const snapshot = await getDocs(q);
        const myProblems = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((p) => p.authorUid === currentUser.uid);

        myProblems.sort((a, b) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return timeB - timeA;
        });

        setProblems(myProblems);
      } catch (err) {
        console.error('Failed to load my problems:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadUserProblems();
  }, [currentUser]);

  const handleProblemUpdated = (updated) => {
    setProblems((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p))
    );
  };

  const handleProblemDeleted = (deletedId) => {
    setProblems((prev) => prev.filter((p) => p.id !== deletedId));
  };

  const isAnonymous = currentUser?.isAnonymous ?? true;

  return (
    <div className="my-problems-page">
      <div className="my-problems-header">
        <h1 className="page-title">My problems</h1>
        <p className="page-subtext">
          {isAnonymous
            ? 'These problems are stored in this browser only. Log in to access them from any device.'
            : 'All problems posted by your account.'}
        </p>
      </div>

      {isLoading ? (
        <div className="board-loading-state">
          <p className="state-message">Loading your problems...</p>
        </div>
      ) : problems.length === 0 ? (
        <div className="board-empty-state">
          <p className="state-message">You have not posted any problems yet.</p>
          <button
            type="button"
            className="secondary-button"
            style={{ marginTop: '16px' }}
            onClick={() => onNavigate('/')}
          >
            Drop a problem
          </button>
        </div>
      ) : (
        <div className="problem-list-section">
          {problems.map((problem) => (
            <ProblemRow
              key={problem.id}
              problem={problem}
              currentUser={currentUser}
              onProblemUpdated={handleProblemUpdated}
              onProblemDeleted={handleProblemDeleted}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
