import { useEffect, useState, useContext, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import QuizCard from "../../components/QuizCard/QuizCard";
import Avatar from "../../components/Avatar/Avatar";
import { AuthContext } from "../../Context/AuthContext";
import "./Profile.css";

const ProfilePage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useContext(AuthContext);
  const [profileUser, setProfileUser] = useState(null);
  const [ratedQuizzes, setRatedQuizzes] = useState([]);
  const [authorsData, setAuthorsData] = useState({});
  const [loading, setLoading] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const [userResponse, quizzesResponse] = await Promise.all([
          fetch(`/api/users/${userId}`),
          fetch(`/api/quizzes/rated-by/${userId}`),
        ]);

        const userData = await userResponse.json();
        let quizzesData = await quizzesResponse.json();

        const authorIds = [...new Set(quizzesData.map((q) => q.authorId))];

        const authorsResponse = await Promise.all(
          authorIds.map((id) =>
            fetch(`/api/users/${id}`).then((res) => res.json())
          )
        );

        const authorsMap = authorsResponse.reduce((acc, author) => {
          acc[author._id] = author;
          return acc;
        }, {});

        setAuthorsData(authorsMap);
        setProfileUser(userData);
        setRatedQuizzes(quizzesData);
        setNewName(userData.name);
      } catch (err) {
        console.error("Ошибка загрузки профиля:", err);
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [userId, navigate]);

  const handleAvatarClick = () => {
    if (isCurrentUser && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const response = await fetch(`/api/users/${userId}/avatar`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });

      const updatedUser = await response.json();
      setProfileUser(updatedUser);
    } catch (err) {
      console.error("Ошибка при обновлении аватарки:", err);
    }
  };

  const handleNameUpdate = async () => {
    if (!newName.trim() || newName === profileUser.name) {
      setIsEditingName(false);
      return;
    }

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ name: newName }),
      });

      const updatedUser = await response.json();
      setProfileUser(updatedUser);
      setIsEditingName(false);
    } catch (err) {
      console.error("Ошибка при обновлении имени:", err);
    }
  };

  const isCurrentUser = currentUser?._id === userId;

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  return (
    <div className="profile-page">
      <button className="back-button" onClick={() => navigate("/")}>
        &larr; На главную
      </button>

      <div className="profile-header">
        <div className="user-info">
          <div
            className={`avatar-container ${isCurrentUser ? "editable" : ""}`}
            onClick={handleAvatarClick}
          >
            {profileUser.avatar ? (
              <img
                src={profileUser.avatar}
                alt={profileUser.name}
                className="user-avatar-image"
              />
            ) : (
              <Avatar user={profileUser} size={120} />
            )}
            {isCurrentUser && (
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarChange}
                accept="image/*"
                style={{ display: "none" }}
              />
            )}
            {isCurrentUser && (
              <div className="avatar-overlay">
                <span className="edit-icon">✏️</span>
              </div>
            )}
          </div>

          <div className="user-details">
            {isEditingName ? (
              <div className="name-edit-container">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="name-input"
                />
                <button onClick={handleNameUpdate} className="save-name-button">
                  Сохранить
                </button>
                <button
                  onClick={() => setIsEditingName(false)}
                  className="cancel-name-button"
                >
                  Отмена
                </button>
              </div>
            ) : (
              <div className="name-display-container">
                <h1>{profileUser.name}</h1>
                {isCurrentUser && (
                  <button
                    className="edit-name-button"
                    onClick={() => setIsEditingName(true)}
                  >
                    ✏️
                  </button>
                )}
              </div>
            )}
            <p>
              Дата регистрации:{" "}
              {new Date(profileUser.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="user-badges">
          <h3>Награды:</h3>
          <div className="badges-container">
            {profileUser.badges?.length > 0 ? (
              profileUser.badges.map((badge, index) => (
                <img
                  key={index}
                  src={badge.image}
                  alt={badge.name}
                  className="badge"
                  title={badge.name}
                />
              ))
            ) : (
              <p>Пока нет наград</p>
            )}
          </div>
        </div>
      </div>

      <div className="rated-quizzes">
        <h2>Оцененные викторины</h2>
        {ratedQuizzes.length > 0 ? (
          <div className="quizzes-grid">
            {ratedQuizzes.map((quiz) => (
              <div key={quiz._id} className="rated-quiz-item">
                <QuizCard
                  quiz={{
                    ...quiz,
                    authorId: {
                      _id: quiz.authorId,
                      name: authorsData[quiz.authorId]?.name,
                      avatar: authorsData[quiz.authorId]?.avatar,
                    },
                    questions: quiz.questions || [],
                    rating: quiz.rating || { average: 0, votes: 0 },
                    tags: quiz.tags || [],
                    createdAt: quiz.createdAt || new Date().toISOString(),
                  }}
                />
                <div className="user-rating">
                  <span>Ваша оценка: </span>
                  <div className="stars">
                    {[...Array(5)].map((_, i) => (
                      <span
                        key={i}
                        className={i < quiz.userRating ? "star filled" : "star"}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="no-quizzes">
            Пользователь пока не оценил ни одной викторины
          </p>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
