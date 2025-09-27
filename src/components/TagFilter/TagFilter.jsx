import "./TagFilter.css";

const TagFilter = ({ tags, selectedTags, setSelectedTags }) => {
    const toggleTag = (tag) => {
      setSelectedTags(prev =>
        prev.includes(tag) 
          ? prev.filter(t => t !== tag) 
          : [...prev, tag]
      );
    };
  
    return (
      <div className="tag-filter">
        <div className="tags-container">
          {tags.map(tag => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`tag ${selectedTags.includes(tag) ? 'active' : ''}`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
    );
  };
  
  export default TagFilter;