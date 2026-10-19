import ProblemRow from './ProblemRow';

export default function ProblemList({
  problems,
  currentUser,
  isLoading,
  onProblemUpdated,
  onProblemDeleted,
  hasMore,
  onLoadMore,
  onNavigate,
  onContributorClaimed,
  activeTag = 'All',
  onClearFilter,
}) {
  if (isLoading && problems.length === 0) {
    return (
      <div className="board-loading-state">
        <p className="state-message">Loading problems...</p>
      </div>
    );
  }

  if (problems.length === 0) {
    return (
      <div className="board-empty-state">
        <p className="state-message">
          {activeTag && activeTag !== 'All'
            ? `No problems posted under ${activeTag} yet.`
            : 'No problems here yet. Be the first to drop one.'}
        </p>
        {activeTag && activeTag !== 'All' && onClearFilter && (
          <button
            type="button"
            className="secondary-button"
            style={{ marginTop: '14px' }}
            onClick={onClearFilter}
          >
            Show all problems
          </button>
        )}
      </div>
    );
  }

  return (
    <section className="problem-list-section" aria-label="Technology problems board">
      {problems.map((problem) => (
        <ProblemRow
          key={problem.id}
          problem={problem}
          currentUser={currentUser}
          onProblemUpdated={onProblemUpdated}
          onProblemDeleted={onProblemDeleted}
          onNavigate={onNavigate}
          onContributorClaimed={onContributorClaimed}
        />
      ))}

      {hasMore && (
        <div className="load-more-row">
          <button
            type="button"
            className="secondary-button load-more-button"
            onClick={onLoadMore}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
    </section>
  );
}
