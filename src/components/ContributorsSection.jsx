import { useState, useEffect } from 'react';
import { fetchContributors } from '../services/contributorService';

export default function ContributorsSection({ contributorsList, refreshKey }) {
  const [liveContributors, setLiveContributors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (contributorsList) {
      setLiveContributors(contributorsList);
      setIsLoading(false);
      return;
    }

    async function load() {
      try {
        const data = await fetchContributors();
        setLiveContributors(data);
      } catch (err) {
        console.error('Failed to load contributors:', err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [contributorsList, refreshKey]);

  const displayList = contributorsList || liveContributors;

  return (
    <section id="contributors" className="contributors-section">
      <h2 className="contributors-title">Contributors</h2>
      <p className="contributors-subtitle">
        Post a problem that gets 10 upvotes and you can add your name and photo here.
        You helped builders discover what needs fixing.
      </p>

      {isLoading ? (
        <div className="board-loading-state">
          <p className="state-message">Loading contributors...</p>
        </div>
      ) : displayList.length === 0 ? (
        <div className="contributors-empty-card">
          <p className="contributors-empty-title">No contributors yet.</p>
          <p className="contributors-empty-subtext">
            Drop a problem that reaches 10 upvotes to become the first Contributor!
          </p>
        </div>
      ) : (
        <div className="contributors-grid">
          {displayList.map((c) => {
            const initial = (c.name || 'C')[0].toUpperCase();
            return (
              <div key={c.id} className="contributor-card">
                {c.photoData ? (
                  <img
                    src={c.photoData}
                    alt={c.name}
                    className="contributor-photo-img"
                  />
                ) : (
                  <div
                    className="photo-placeholder"
                    role="img"
                    aria-label={`Photo placeholder for ${c.name}`}
                  >
                    {initial}
                  </div>
                )}
                <div className="contributor-name">{c.name}</div>
                <div className="contributor-problem">{c.title || c.problemTitle}</div>
                <div className="contributor-count">{c.meTooCount} upvotes</div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
