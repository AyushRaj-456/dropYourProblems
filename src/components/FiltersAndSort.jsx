import { TAGS } from '../data/sampleData';

export default function FiltersAndSort({
  activeTag = 'All',
  onSelectTag,
  activeSort = 'most',
  onSelectSort,
}) {
  return (
    <div className="filters-and-sort-bar">
      <nav className="filter-nav" aria-label="Filter problems by tag">
        {TAGS.map((tag) => (
          <button
            key={tag}
            type="button"
            className={`filter-button ${activeTag === tag ? 'active' : ''}`}
            onClick={() => onSelectTag && onSelectTag(tag)}
            aria-pressed={activeTag === tag}
          >
            {tag}
          </button>
        ))}
      </nav>

      <nav className="sort-nav" aria-label="Sort problems">
        <button
          type="button"
          className={`sort-button ${activeSort === 'most' ? 'active' : ''}`}
          onClick={() => onSelectSort && onSelectSort('most')}
          aria-pressed={activeSort === 'most'}
        >
          Most upvotes
        </button>
        <button
          type="button"
          className={`sort-button ${activeSort === 'newest' ? 'active' : ''}`}
          onClick={() => onSelectSort && onSelectSort('newest')}
          aria-pressed={activeSort === 'newest'}
        >
          Newest
        </button>
      </nav>
    </div>
  );
}
