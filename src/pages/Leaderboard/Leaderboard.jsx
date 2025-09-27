import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../Context/AuthContext";
import Avatar from "../../components/Avatar/Avatar";
import "./Leaderboard.css";

const Leaderboard = ({ players, quizId, roomId }) => {
  const { user } = useContext(AuthContext);
  const [rating, setRating] = useState(0);
  const [hasRatingChanged, setHasRatingChanged] = useState(false);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleRate = (stars) => {
    setRating(stars);
    setHasRatingChanged(true);
    setError(null);
  };

  const handleHomeClick = async () => {
    if (!hasRatingChanged || rating === 0) {
      navigate("/");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/ratings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          quizId,
          value: rating,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Ошибка при сохранении оценки");
      }

      navigate("/");
    } catch (err) {
      console.error("Ошибка оценки:", err);
      setError(err.message);
      const errorMessage = err.message.toLowerCase();
      if (errorMessage.includes("уже оцени")) {
        navigate("/");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="leaderboard">
      <h2>Результаты</h2>
      <table>
        <thead>
          <tr>
            <th>Место</th>
            <th>Игрок</th>
            <th>Очки</th>
          </tr>
        </thead>
        <tbody>
          {players
            .sort((a, b) => b.score - a.score)
            .map((player, index) => (
              <tr
                key={player.id}
                className={player.id === user._id ? "current-user" : ""}
              >
                <td>{index + 1}</td>
                <td>
                  <div className="player-info-container">
                    {player.avatar ? (
                      <img
                        src={player.avatar}
                        alt={player.name}
                        className="player-avatar"
                      />
                    ) : (
                      <div className="avatar-with-name">
                        <Avatar user={{ name: player.name }} size={45} />
                        <span className="players-name">{player.name}</span>
                      </div>
                    )}
                    {player.avatar && <span className="players-name">{player.name}</span>}
                  </div>
                </td>
                <td>{player.score}</td>
              </tr>
            ))}
        </tbody>
      </table>

      <div className="rating-section">
        <h3>Оцените викторину:</h3>
        <div className="stars">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => handleRate(star)}
              className={star <= rating ? "active" : ""}
              disabled={isSubmitting}
            >
              ★
            </button>
          ))}
        </div>
        {error && <div className="error-message">{error}</div>}
      </div>

      <button
        onClick={handleHomeClick}
        className="home-button"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Сохранение..." : "На главную"}
      </button>
    </div>
  );
};

export default Leaderboard;