import { useState, useEffect } from 'react';
import {
  checkIsAdmin,
  fetchModerationProblems,
  setProblemStatus,
  setProblemHidden,
  deleteProblemAsAdmin,
  fetchContributorsForAdmin,
  removeContributorAsAdmin,
} from '../services/adminService';
import { formatDate } from '../utils/formatDate';
import DiscussionThread from '../components/DiscussionThread';

export default function AdminPage({ currentUser, onNavigate }) {
  const [isAdmin, setIsAdmin] = useState(null);
  const [isChecking, setIsChecking] = useState(true);

  const [activeTab, setActiveTab] = useState('moderation'); // 'moderation' | 'contributors'
  const [filter, setFilter] = useState('all'); // 'all' | 'reported' | 'building' | 'hidden'

  const [problems, setProblems] = useState([]);
  const [contributors, setContributors] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [openDiscussionId, setOpenDiscussionId] = useState(null);

  // Check admin status
  useEffect(() => {
    let isMounted = true;
    async function verify() {
      setIsChecking(true);
      if (!currentUser || currentUser.isAnonymous) {
        if (isMounted) {
          setIsAdmin(false);
          setIsChecking(false);
        }
        return;
      }
      try {
        const adminStatus = await checkIsAdmin(currentUser);
        if (isMounted) {
          setIsAdmin(adminStatus);
        }
      } catch (err) {
        console.error('Failed to verify admin status:', err);
        if (isMounted) setIsAdmin(false);
      } finally {
        if (isMounted) setIsChecking(false);
      }
    }
    verify();
    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  // Load admin data when verified
  const loadData = async () => {
    setIsLoadingData(true);
    setActionError(null);
    try {
      const [probs, contribs] = await Promise.all([
        fetchModerationProblems(),
        fetchContributorsForAdmin(),
      ]);
      setProblems(probs);
      setContributors(contribs);
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
      setActionError(err.message || 'Could not load admin data.');
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  const handleStatusChange = async (problemId, newStatus) => {
    try {
      await setProblemStatus(problemId, newStatus);
      setProblems((prev) =>
        prev.map((p) => (p.id === problemId ? { ...p, status: newStatus } : p))
      );
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Could not update status: ' + err.message);
    }
  };

  const handleToggleHidden = async (problemId, currentHidden) => {
    const nextHidden = !currentHidden;
    const confirmMsg = nextHidden
      ? 'Hide this post from the public board?'
      : 'Unhide this post and show on the public board?';
    if (!window.confirm(confirmMsg)) return;

    try {
      await setProblemHidden(problemId, nextHidden);
      setProblems((prev) =>
        prev.map((p) => (p.id === problemId ? { ...p, hidden: nextHidden } : p))
      );
    } catch (err) {
      console.error('Failed to toggle hidden:', err);
      alert('Could not update visibility: ' + err.message);
    }
  };

  const handleDelete = async (problemId) => {
    if (!window.confirm('Permanently delete this problem?')) return;

    try {
      await deleteProblemAsAdmin(problemId);
      setProblems((prev) => prev.filter((p) => p.id !== problemId));
    } catch (err) {
      console.error('Failed to delete problem:', err);
      alert('Could not delete problem: ' + err.message);
    }
  };

  const handleRemoveContributor = async (problemId) => {
    if (!window.confirm('Remove this contributor?')) return;

    try {
      await removeContributorAsAdmin(problemId);
      setContributors((prev) => prev.filter((c) => c.id !== problemId));
    } catch (err) {
      console.error('Failed to remove contributor:', err);
      alert('Could not remove contributor: ' + err.message);
    }
  };

  if (isChecking) {
    return (
      <div className="admin-page">
        <div className="board-loading-state">
          <p className="state-message">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="admin-page">
        <div className="admin-denied-card">
          <h1 className="admin-denied-title">Admin Access Required</h1>
          <p className="admin-denied-text">
            This page is restricted to administrators. Your current account does not have admin permissions.
          </p>

          {currentUser && (
            <div className="admin-uid-box">
              <span className="field-label bold">Your UID:</span>
              <code className="admin-uid-code">{currentUser.uid}</code>
              <span className="field-meta-note">
                To grant admin privileges, create a document with this UID in the <code>admins</code> collection in the Firebase Console.
              </span>
            </div>
          )}

          <div className="admin-denied-actions">
            <button
              type="button"
              className="primary-button"
              onClick={() => onNavigate('/')}
            >
              Back to Board
            </button>
            {(!currentUser || currentUser.isAnonymous) && (
              <button
                type="button"
                className="secondary-button"
                onClick={() => onNavigate('/login')}
              >
                Log in as Admin
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Filter problems
  const reportedCount = problems.filter((p) => (p.reportCount || 0) > 0).length;
  const filteredProblems = problems.filter((p) => {
    if (filter === 'reported') return (p.reportCount || 0) > 0;
    if (filter === 'building') return p.status === 'building' || p.status === 'launched';
    if (filter === 'hidden') return p.hidden === true;
    return true;
  });

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtext">
            Moderate reported posts, set problem status (Building or Launched), and manage contributors.
          </p>
        </div>
        <button
          type="button"
          className="secondary-button refresh-admin-button"
          onClick={loadData}
          disabled={isLoadingData}
        >
          {isLoadingData ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <nav className="admin-subnav">
        <button
          type="button"
          className={`admin-subnav-link ${activeTab === 'moderation' ? 'active' : ''}`}
          onClick={() => setActiveTab('moderation')}
        >
          Moderation & Status ({problems.length})
          {reportedCount > 0 && (
            <span className="admin-badge-count"> {reportedCount} reported</span>
          )}
        </button>
        <button
          type="button"
          className={`admin-subnav-link ${activeTab === 'contributors' ? 'active' : ''}`}
          onClick={() => setActiveTab('contributors')}
        >
          Contributors ({contributors.length})
        </button>
      </nav>

      {actionError && <p className="form-error-line">{actionError}</p>}

      {activeTab === 'moderation' ? (
        <section className="admin-content-section">
          <div className="admin-filter-bar">
            <button
              type="button"
              className={`filter-pill ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All ({problems.length})
            </button>
            <button
              type="button"
              className={`filter-pill ${filter === 'reported' ? 'active' : ''}`}
              onClick={() => setFilter('reported')}
            >
              Reported ({reportedCount})
            </button>
            <button
              type="button"
              className={`filter-pill ${filter === 'building' ? 'active' : ''}`}
              onClick={() => setFilter('building')}
            >
              Building / Launched (
              {problems.filter((p) => p.status === 'building' || p.status === 'launched').length}
              )
            </button>
            <button
              type="button"
              className={`filter-pill ${filter === 'hidden' ? 'active' : ''}`}
              onClick={() => setFilter('hidden')}
            >
              Hidden ({problems.filter((p) => p.hidden).length})
            </button>
          </div>

          {isLoadingData ? (
            <div className="board-loading-state">
              <p className="state-message">Loading problems...</p>
            </div>
          ) : filteredProblems.length === 0 ? (
            <div className="board-empty-state">
              <p className="state-message">No problems match the current filter.</p>
            </div>
          ) : (
            <div className="admin-problems-list">
              {filteredProblems.map((p) => {
                const dateStr = p.createdAt ? formatDate(p.createdAt) : '';
                const isReported = (p.reportCount || 0) > 0;
                return (
                  <article
                    key={p.id}
                    className={`admin-problem-card ${p.hidden ? 'hidden-card' : ''} ${
                      isReported ? 'reported-card' : ''
                    }`}
                  >
                    <div className="admin-card-header">
                      <span className="problem-tag-line">
                        {p.tag} · {p.status || 'open'}
                        {p.hidden && ' · HIDDEN'}
                      </span>
                      {isReported && (
                        <span className="report-flag-badge">
                          Reported {p.reportCount} time{p.reportCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    <p className="problem-title">{p.text}</p>

                    <div className="admin-meta-row">
                      <span className="problem-meta-info">
                        {[
                          p.displayName || 'Anonymous',
                          dateStr,
                          `${p.meTooCount || 0} upvotes`,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </div>

                    <div className="admin-action-bar">
                      <div className="admin-status-control">
                        <span className="admin-control-label">Status:</span>
                        <select
                          className="input-field select-field admin-status-select"
                          value={p.status || 'open'}
                          onChange={(e) => handleStatusChange(p.id, e.target.value)}
                        >
                          <option value="open">Open</option>
                          <option value="building">Building</option>
                          <option value="launched">Launched</option>
                        </select>
                      </div>

                      <div className="admin-button-group">
                        <button
                          type="button"
                          className={`secondary-button admin-action-btn ${openDiscussionId === p.id ? 'active' : ''}`}
                          onClick={() => setOpenDiscussionId((prev) => (prev === p.id ? null : p.id))}
                        >
                          Discuss · {p.commentCount || 0}
                        </button>
                        <button
                          type="button"
                          className="secondary-button admin-action-btn"
                          onClick={() => handleToggleHidden(p.id, p.hidden)}
                        >
                          {p.hidden ? 'Unhide' : 'Hide'}
                        </button>
                        <button
                          type="button"
                          className="secondary-button admin-action-btn danger-btn"
                          onClick={() => handleDelete(p.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {openDiscussionId === p.id && (
                      <div className="admin-card-discussion-wrap">
                        <DiscussionThread
                          problem={p}
                          currentUser={currentUser}
                          onCommentCountChange={(newCount) => {
                            setProblems((prev) =>
                              prev.map((item) =>
                                item.id === p.id ? { ...item, commentCount: newCount } : item
                              )
                            );
                          }}
                        />
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      ) : (
        <section className="admin-content-section">
          {isLoadingData ? (
            <div className="board-loading-state">
              <p className="state-message">Loading contributors...</p>
            </div>
          ) : contributors.length === 0 ? (
            <div className="board-empty-state">
              <p className="state-message">No contributors registered yet.</p>
            </div>
          ) : (
            <div className="admin-contributors-list">
              {contributors.map((c) => {
                const initial = (c.name || 'C')[0].toUpperCase();
                return (
                  <div key={c.id} className="admin-contributor-row">
                    <div className="admin-contrib-photo-wrap">
                      {c.photoData ? (
                        <img
                          src={c.photoData}
                          alt={c.name}
                          className="admin-contrib-thumb"
                        />
                      ) : (
                        <div className="photo-placeholder admin-thumb-placeholder">
                          {initial}
                        </div>
                      )}
                    </div>

                    <div className="admin-contrib-details">
                      <div className="contributor-name">{c.name}</div>
                      <div className="contributor-problem">{c.title}</div>
                      <div className="contributor-count">{c.meTooCount} upvotes</div>
                    </div>

                    <button
                      type="button"
                      className="secondary-button danger-btn"
                      onClick={() => handleRemoveContributor(c.id)}
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
