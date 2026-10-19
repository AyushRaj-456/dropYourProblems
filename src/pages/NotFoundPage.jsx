export default function NotFoundPage({ onNavigate }) {
  return (
    <div className="not-found-page">
      <div className="not-found-card">
        <span className="not-found-code">404</span>
        <h1 className="not-found-title">Page not found</h1>
        <p className="not-found-text">
          The link you followed doesn't exist, has been moved, or was typed incorrectly.
        </p>
        <div className="not-found-actions">
          <button
            type="button"
            className="primary-button"
            onClick={() => onNavigate('/')}
          >
            Back to Board
          </button>
        </div>
      </div>
    </div>
  );
}
