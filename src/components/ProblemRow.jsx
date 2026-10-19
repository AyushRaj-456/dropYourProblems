import { useState, useEffect } from 'react';
import { formatDate } from '../utils/formatDate';
import {
  updateProblem,
  deleteProblem,
  voteProblem,
  reportProblem,
  checkHasUserVoted,
  isProblemReported,
} from '../services/problemService';
import {
  CONTRIBUTOR_THRESHOLD,
  checkContributorClaimed,
} from '../services/contributorService';
import ClaimContributorModal from './ClaimContributorModal';
import { FORM_TAGS } from '../data/sampleData';

export default function ProblemRow({
  problem,
  currentUser,
  onProblemUpdated,
  onProblemDeleted,
  onNavigate,
  onContributorClaimed,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(problem.text);
  const [editTag, setEditTag] = useState(problem.tag);
  const [editProduct, setEditProduct] = useState(problem.product || '');
  const [isSaving, setIsSaving] = useState(false);

  const [hasVoted, setHasVoted] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [count, setCount] = useState(problem.meTooCount || 0);

  const [hasReported, setHasReported] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [selfVoteNotice, setSelfVoteNotice] = useState(false);
  const [authNotice, setAuthNotice] = useState(false);

  const [showClaimModal, setShowClaimModal] = useState(false);
  const [isClaimed, setIsClaimed] = useState(false);

  const isAuthor = Boolean(
    currentUser && problem.authorUid && currentUser.uid === problem.authorUid
  );

  useEffect(() => {
    setCount(problem.meTooCount || 0);
    setEditText(problem.text);
    setEditTag(problem.tag);
    setEditProduct(problem.product || '');
    if (currentUser) {
      setHasReported(isProblemReported(problem.id, currentUser));
      if (!currentUser.isAnonymous) {
        checkHasUserVoted(problem.id, currentUser).then((voted) => {
          setHasVoted(voted);
        });
      } else {
        setHasVoted(false);
      }
    } else {
      setHasVoted(false);
      setHasReported(false);
    }
  }, [problem, currentUser]);

  useEffect(() => {
    let isMounted = true;
    if (count >= CONTRIBUTOR_THRESHOLD && problem.id) {
      checkContributorClaimed(problem.id).then((claimed) => {
        if (isMounted) setIsClaimed(claimed);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [count, problem.id]);

  const handleVote = async () => {
    if (hasVoted || isVoting) return;

    const isUserLoggedIn = Boolean(currentUser && !currentUser.isAnonymous);
    if (!isUserLoggedIn) {
      setAuthNotice(true);
      setTimeout(() => setAuthNotice(false), 5000);
      return;
    }

    if (isAuthor) {
      setSelfVoteNotice(true);
      setTimeout(() => setSelfVoteNotice(false), 3000);
      return;
    }

    setIsVoting(true);
    try {
      const newCount = await voteProblem(problem, currentUser);
      setCount(newCount);
      setHasVoted(true);
      if (onProblemUpdated) {
        onProblemUpdated({
          ...problem,
          meTooCount: newCount,
        });
      }
    } catch (err) {
      console.error('Failed to vote:', err);
      if (
        err.message &&
        (err.message.includes('permission-denied') ||
          err.message.includes('already upvoted'))
      ) {
        setHasVoted(true);
      }
    } finally {
      setIsVoting(false);
    }
  };

  const handleReport = async () => {
    if (hasReported || isReporting || isAuthor) return;

    if (!window.confirm('Report this problem for review?')) return;

    setIsReporting(true);
    try {
      await reportProblem(problem.id, currentUser);
      setHasReported(true);
    } catch (err) {
      console.error('Failed to report:', err);
    } finally {
      setIsReporting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editText.trim()) return;
    setIsSaving(true);
    try {
      await updateProblem(
        problem.id,
        { text: editText, tag: editTag, product: editProduct },
        currentUser
      );
      setIsEditing(false);
      if (onProblemUpdated) {
        onProblemUpdated({
          ...problem,
          text: editText.trim(),
          tag: editTag,
          product: editProduct.trim() || null,
        });
      }
    } catch (err) {
      console.error('Failed to update problem:', err);
      alert(err.message || 'Could not update problem.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this problem?')) return;
    try {
      await deleteProblem(problem.id, currentUser);
      if (onProblemDeleted) {
        onProblemDeleted(problem.id);
      }
    } catch (err) {
      console.error('Failed to delete problem:', err);
      alert(err.message || 'Could not delete problem.');
    }
  };

  const tagParts = [problem.tag];
  if (problem.product) {
    tagParts.push(problem.product);
  }
  if (problem.status && problem.status.toLowerCase() !== 'open') {
    tagParts.push(problem.status);
  }
  const tagLine = tagParts.join(' · ');

  const formattedDate = problem.createdAt ? formatDate(problem.createdAt) : '';

  const metaParts = [
    problem.displayName || problem.authorName || 'Anonymous',
    (!problem.product && problem.year ? problem.year : null),
    problem.frequency,
    formattedDate,
  ].filter(Boolean);

  return (
    <article className="problem-row">
      <div className="problem-tag-line">{tagLine}</div>

      {isEditing ? (
        <div className="inline-edit-box">
          <textarea
            className="problem-textarea edit-textarea"
            rows="3"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            maxLength={600}
          />
          <div className="inline-edit-actions">
            <select
              className="input-field select-field"
              value={editTag}
              onChange={(e) => setEditTag(e.target.value)}
            >
              {FORM_TAGS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              type="text"
              className="input-field edit-product-input"
              placeholder="Product/tool (optional)"
              value={editProduct}
              onChange={(e) => setEditProduct(e.target.value)}
              maxLength={80}
            />
            <button
              type="button"
              className="primary-button inline-save-button"
              onClick={handleSaveEdit}
              disabled={isSaving || !editText.trim()}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              className="secondary-button inline-cancel-button"
              onClick={() => {
                setEditText(problem.text);
                setEditTag(problem.tag);
                setEditProduct(problem.product || '');
                setIsEditing(false);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="problem-title">{problem.text}</p>
          {problem.workaround && (
            <p className="problem-workaround-text">
              <span className="problem-workaround-label">Workaround:</span>{' '}
              {problem.workaround}
            </p>
          )}
        </>
      )}

      <div className="problem-meta-row">
        <button
          type="button"
          className={`upvote-button ${hasVoted ? 'voted' : ''}`}
          onClick={handleVote}
          aria-pressed={hasVoted}
          disabled={isVoting}
          title={
            isAuthor
              ? 'You cannot upvote your own problem'
              : !currentUser || currentUser.isAnonymous
              ? 'Log in to upvote'
              : hasVoted
              ? 'Upvoted'
              : 'Upvote'
          }
        >
          {hasVoted ? 'Upvoted' : 'Upvote'} · {count}
        </button>

        <span className="problem-meta-info">{metaParts.join(' · ')}</span>

        <div className="meta-actions">
          {!isAuthor && (
            <button
              type="button"
              className="action-text-link report-link"
              onClick={handleReport}
              disabled={hasReported || isReporting}
            >
              {hasReported ? 'Reported' : 'Report'}
            </button>
          )}

          {isAuthor && !isEditing && (
            <div className="author-actions">
              <button
                type="button"
                className="action-text-link"
                onClick={() => setIsEditing(true)}
              >
                Edit
              </button>
              <button
                type="button"
                className="action-text-link"
                onClick={handleDelete}
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {selfVoteNotice && (
        <p className="self-vote-notice">You cannot upvote your own problem.</p>
      )}

      {authNotice && (
        <p className="auth-required-notice">
          You must be logged in to upvote.{' '}
          <button
            type="button"
            className="claim-link-btn"
            onClick={() => {
              if (onNavigate) onNavigate('/login');
              else window.location.assign('/login');
            }}
          >
            Log in now
          </button>
        </p>
      )}

      {count >= CONTRIBUTOR_THRESHOLD && (
        <div className="contributor-prompt-wrap">
          {isClaimed ? (
            <p className="contributor-prompt">
              Added to <a href="#contributors" className="claim-link">Contributors</a>.
            </p>
          ) : isAuthor ? (
            currentUser?.isAnonymous ? (
              <p className="contributor-prompt">
                10+ upvotes reached.{' '}
                <button
                  type="button"
                  className="claim-link-btn"
                  onClick={() => {
                    if (onNavigate) onNavigate('/login');
                    else window.location.assign('/login');
                  }}
                >
                  Log in to claim this.
                </button>
              </p>
            ) : (
              <p className="contributor-prompt">
                10+ upvotes reached. {problem.displayName || 'You'} can now{' '}
                <button
                  type="button"
                  className="claim-link-btn"
                  onClick={() => setShowClaimModal(true)}
                >
                  add a name and photo
                </button>{' '}
                to join Contributors.
              </p>
            )
          ) : (
            <p className="contributor-prompt">
              10+ upvotes reached. {problem.displayName || problem.authorName || 'The author'} can now add a name and photo to join Contributors.
            </p>
          )}
        </div>
      )}

      {showClaimModal && (
        <ClaimContributorModal
          problem={problem}
          currentUser={currentUser}
          onClose={() => setShowClaimModal(false)}
          onClaimSuccess={(contributor) => {
            setIsClaimed(true);
            setShowClaimModal(false);
            if (onContributorClaimed) {
              onContributorClaimed(contributor);
            }
          }}
          onNavigateToLogin={() => {
            setShowClaimModal(false);
            if (onNavigate) onNavigate('/login');
            else window.location.assign('/login');
          }}
        />
      )}
    </article>
  );
}
