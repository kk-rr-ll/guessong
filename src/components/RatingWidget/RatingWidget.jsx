import { useState } from 'react';
import "./RatingWidget.css";

const RatingWidget = ({ quizId, initialRating, onRate }) => {
  const [rating, setRating] = useState(initialRating);
  const [hover, setHover] = useState(0);

  return (
    <div className="rating-widget">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          className={`star ${star <= (hover || rating) ? 'active' : ''}`}
          onClick={() => {
            setRating(star);
            onRate(quizId, star);
          }}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
        >
          ★
        </button>
      ))}
    </div>
  );
};

export default RatingWidget;