import { useState, useEffect, useRef } from 'react';
import { updateProfile } from 'firebase/auth';
import { Timestamp } from 'firebase/firestore';
import { formatDate } from '../utils/formatDate';
import {
  fetchMessages,
  subscribeToNewMessages,
  postDiscussionMessage,
  editDiscussionMessage,
  deleteDiscussionMessage,
  reportDiscussionMessage,
  setDiscussionMessageHidden,
} from '../services/discussionService';
import { checkIsAdmin } from '../services/adminService';

export default function DiscussionThread({
  problem,
  currentUser,
  onCommentCountChange,
  onNavigate,
}) {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(null);

  // New message form state
  const [text, setText] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Editing state
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editText, setEditText] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Reporting / admin state
  const [reportedMsgIds, setReportedMsgIds] = useState(new Set());
  const [isAdminUser, setIsAdminUser] = useState(false);

  const threadOpenTimeRef = useRef(Timestamp.now());
  const isLoggedIn = Boolean(currentUser && !currentUser.isAnonymous);

  // Check admin status
  useEffect(() => {
    let isMounted = true;
    if (isLoggedIn) {
      checkIsAdmin(currentUser).then((res) => {
        if (isMounted) setIsAdminUser(Boolean(res));
      });
    } else {
      setIsAdminUser(false);
    }
    return () => {
      isMounted = false;
    };
  }, [currentUser, isLoggedIn]);

  // Load existing display name from auth or localStorage
  useEffect(() => {
    if (currentUser?.displayName) {
      setDisplayName(currentUser.displayName);
    } else {
      const savedName = localStorage.getItem('dyp_display_name') || '';
      setDisplayName(savedName);
    }
  }, [currentUser]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  // Initial fetch of oldest 30 messages (or all including hidden for admin)
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    fetchMessages(problem.id, null, isAdminUser)
      .then(({ messages: fetched, lastDoc: docSnap, hasMore: more }) => {
        if (isMounted) {
          setMessages(fetched);
          setLastDoc(docSnap);
          setHasMore(more);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Failed to load discussion:', err);
          setError('Could not load discussion.');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [problem.id, isAdminUser]);

  // Live listener for new incoming messages during open thread
  useEffect(() => {
    const unsubscribe = subscribeToNewMessages(
      problem.id,
      threadOpenTimeRef.current,
      (newMsg) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) {
            return prev;
          }
          const next = [...prev, newMsg];
          if (onCommentCountChange) {
            onCommentCountChange(next.length);
          }
          return next;
        });
      }
    );

    return () => {
      unsubscribe();
    };
  }, [problem.id, onCommentCountChange]);

  const handleLoadMore = async () => {
    if (!lastDoc || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const { messages: nextMessages, lastDoc: newLastDoc, hasMore: more } =
        await fetchMessages(problem.id, lastDoc);

      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const filtered = nextMessages.filter((m) => !existingIds.has(m.id));
        return [...prev, ...filtered];
      });
      setLastDoc(newLastDoc);
      setHasMore(more);
    } catch (err) {
      console.error('Failed to load more messages:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handlePostMessage = async (e) => {
    e.preventDefault();
    if (!isLoggedIn) return;
    if (isSubmitting || cooldownSeconds > 0) return;

    const trimmedText = text.trim();
    if (!trimmedText) return;

    let authorName = (displayName || '').trim();
    if (!authorName && currentUser.displayName) {
      authorName = currentUser.displayName.trim();
    }
    if (!authorName) {
      setError('Please provide a display name.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Save display name if not yet saved on auth profile
      if (currentUser && !currentUser.displayName && authorName) {
        try {
          await updateProfile(currentUser, { displayName: authorName });
        } catch {
          // Non-critical, continue
        }
        localStorage.setItem('dyp_display_name', authorName);
      }

      const created = await postDiscussionMessage({
        problemId: problem.id,
        text: trimmedText,
        currentUser,
        authorName,
      });

      // Append locally if not already present
      setMessages((prev) => {
        if (prev.some((m) => m.id === created.id)) return prev;
        const next = [...prev, created];
        if (onCommentCountChange) {
          onCommentCountChange(next.length);
        }
        return next;
      });

      setText('');
      setCooldownSeconds(10);
    } catch (err) {
      console.error('Failed to post message:', err);
      if (
        err.message?.includes('permission-denied') ||
        err.message?.includes('Missing or insufficient permissions')
      ) {
        setError('Please wait 10 seconds between messages.');
        setCooldownSeconds(10);
      } else {
        setError(err.message || 'Could not post message.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (msg) => {
    setEditingMsgId(msg.id);
    setEditText(msg.text);
  };

  const handleSaveEdit = async (msgId) => {
    const trimmed = editText.trim();
    if (!trimmed) return;
    setIsSavingEdit(true);
    try {
      await editDiscussionMessage({
        problemId: problem.id,
        messageId: msgId,
        text: trimmed,
      });
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, text: trimmed } : m))
      );
      setEditingMsgId(null);
      setEditText('');
    } catch (err) {
      console.error('Failed to edit message:', err);
      alert('Could not save edit: ' + (err.message || ''));
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async (msgId) => {
    if (!window.confirm('Delete this message?')) return;
    try {
      await deleteDiscussionMessage({
        problemId: problem.id,
        messageId: msgId,
      });
      setMessages((prev) => {
        const next = prev.filter((m) => m.id !== msgId);
        return next;
      });
    } catch (err) {
      console.error('Failed to delete message:', err);
      alert('Could not delete message: ' + (err.message || ''));
    }
  };

  const handleReport = async (msgId) => {
    if (!currentUser) return;
    if (reportedMsgIds.has(msgId)) return;
    if (!window.confirm('Report this message for review?')) return;

    try {
      await reportDiscussionMessage({
        problemId: problem.id,
        messageId: msgId,
        currentUser,
      });
      setReportedMsgIds((prev) => new Set(prev).add(msgId));
    } catch (err) {
      console.error('Failed to report message:', err);
      if (err.message?.includes('already reported')) {
        setReportedMsgIds((prev) => new Set(prev).add(msgId));
      } else {
        alert(err.message || 'Could not report message.');
      }
    }
  };

  const handleHideMessage = async (msgId, currentHidden) => {
    const nextHidden = !currentHidden;
    const confirmMsg = nextHidden
      ? 'Hide this message from discussion?'
      : 'Unhide this message?';
    if (!window.confirm(confirmMsg)) return;

    try {
      await setDiscussionMessageHidden({
        problemId: problem.id,
        messageId: msgId,
        hidden: nextHidden,
      });
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, hidden: nextHidden } : m))
      );
    } catch (err) {
      console.error('Failed to toggle hide message:', err);
      alert('Could not update message: ' + (err.message || ''));
    }
  };

  const needsDisplayNamePrompt = isLoggedIn && !currentUser?.displayName && !displayName;

  const displayedMessages = isAdminUser
    ? [...messages].sort((a, b) => {
        const repA = b.reportCount || 0;
        const repB = a.reportCount || 0;
        if (repA !== repB) return repA - repB;
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeA - timeB;
      })
    : messages.filter((m) => !m.hidden);

  return (
    <section className="discussion-thread" aria-label="Problem discussion">
      <div className="discussion-messages-list">
        {isLoading ? (
          <p className="discussion-muted-text">Loading discussion...</p>
        ) : displayedMessages.length === 0 ? (
          <p className="discussion-empty-state">
            No discussion yet. Be the first to share an idea.
          </p>
        ) : (
          displayedMessages.map((msg) => {
            const isMsgAuthor = Boolean(
              currentUser && msg.authorUid && currentUser.uid === msg.authorUid
            );
            const isPoster = msg.authorUid === problem.authorUid;
            const isEditingThis = editingMsgId === msg.id;
            const hasReportedThis = reportedMsgIds.has(msg.id);

            return (
              <div
                key={msg.id}
                className={`discussion-message-item ${msg.hidden ? 'hidden-card' : ''}`}
              >
                <div className="discussion-message-header">
                  <span className="discussion-author-name">
                    {msg.authorName || 'Anonymous'}
                  </span>
                  {isPoster && (
                    <span className="poster-mono-badge" title="Original problem author">
                      POSTER
                    </span>
                  )}
                  {isAdminUser && msg.hidden && (
                    <span className="poster-mono-badge hidden-badge" title="Hidden from public">
                      HIDDEN
                    </span>
                  )}
                  {isAdminUser && (msg.reportCount || 0) > 0 && (
                    <span className="report-flag-badge">
                      Reported {msg.reportCount}
                    </span>
                  )}
                  <span className="discussion-message-time">
                    {formatDate(msg.createdAt)}
                  </span>
                </div>

                {isEditingThis ? (
                  <div className="discussion-edit-box">
                    <textarea
                      className="problem-textarea discussion-edit-textarea"
                      rows="2"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      maxLength={1000}
                    />
                    <div className="discussion-edit-actions">
                      <button
                        type="button"
                        className="primary-button discussion-save-btn"
                        onClick={() => handleSaveEdit(msg.id)}
                        disabled={isSavingEdit || !editText.trim()}
                      >
                        {isSavingEdit ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        type="button"
                        className="secondary-button discussion-cancel-btn"
                        onClick={() => {
                          setEditingMsgId(null);
                          setEditText('');
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="discussion-message-body">{msg.text}</p>
                )}

                <div className="discussion-message-actions">
                  {isMsgAuthor && !isEditingThis && (
                    <>
                      <button
                        type="button"
                        className="action-text-link"
                        onClick={() => handleStartEdit(msg)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="action-text-link"
                        onClick={() => handleDelete(msg.id)}
                      >
                        Delete
                      </button>
                    </>
                  )}

                  {!isMsgAuthor && (
                    <button
                      type="button"
                      className="action-text-link report-link"
                      onClick={() => handleReport(msg.id)}
                      disabled={hasReportedThis}
                    >
                      {hasReportedThis ? 'Reported' : 'Report'}
                    </button>
                  )}

                  {isAdminUser && (
                    <>
                      <button
                        type="button"
                        className="action-text-link"
                        onClick={() => handleHideMessage(msg.id, msg.hidden)}
                      >
                        {msg.hidden ? 'Unhide' : 'Hide'}
                      </button>
                      {!isMsgAuthor && (
                        <button
                          type="button"
                          className="action-text-link"
                          onClick={() => handleDelete(msg.id)}
                        >
                          Delete
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}

        {hasMore && (
          <div className="discussion-load-more-wrap">
            <button
              type="button"
              className="secondary-button load-more-button"
              onClick={handleLoadMore}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? 'Loading...' : 'Load more messages'}
            </button>
          </div>
        )}
      </div>

      {/* Input or Login Prompt */}
      <div className="discussion-form-container">
        {isLoggedIn ? (
          <form onSubmit={handlePostMessage} className="discussion-form">
            {needsDisplayNamePrompt && (
              <div className="discussion-name-prompt-row">
                <label
                  htmlFor={`display-name-${problem.id}`}
                  className="discussion-name-label"
                >
                  Your display name:
                </label>
                <input
                  id={`display-name-${problem.id}`}
                  type="text"
                  className="input-field discussion-name-input"
                  placeholder="e.g. Alex"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={50}
                  required
                />
              </div>
            )}

            <div className="discussion-textarea-wrap">
              <textarea
                id={`discussion-text-${problem.id}`}
                className="problem-textarea discussion-input-textarea"
                rows="2"
                placeholder="Share your thought or solution..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={1000}
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="discussion-form-footer">
              <span className="discussion-char-count">
                {text.length}/1000
              </span>

              {error && <span className="discussion-error-note">{error}</span>}

              <button
                type="submit"
                className="primary-button discussion-submit-btn"
                disabled={
                  isSubmitting ||
                  !text.trim() ||
                  cooldownSeconds > 0 ||
                  (needsDisplayNamePrompt && !displayName.trim())
                }
              >
                {isSubmitting
                  ? 'Posting...'
                  : cooldownSeconds > 0
                  ? `Wait ${cooldownSeconds}s`
                  : 'Post message'}
              </button>
            </div>
          </form>
        ) : (
          <p className="discussion-login-prompt">
            Log in to join the discussion.{' '}
            <button
              type="button"
              className="claim-link-btn"
              onClick={() => {
                if (onNavigate) onNavigate('/login');
                else window.location.assign('/login');
              }}
            >
              Log in
            </button>
          </p>
        )}
      </div>
    </section>
  );
}
