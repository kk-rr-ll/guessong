import { Link } from "react-router-dom";
import { useContext } from "react";
import RatingStars from "../RatingStars/RatingStars";
import AuthorInfo from "../AuthorInfo/AuthorInfo";
import AuthContext from "../../Context/AuthContext";
import "./QuizCard.css";

const QuizCard = ({ quiz }) => {
  const questionCount = quiz.questions?.length || quiz.questionCount || 0;
  const rating = quiz.rating?.average || 0;
  const votes = quiz.rating?.votes || 0;

  const { user } = useContext(AuthContext);
  const isAuthor = user._id === quiz.authorId._id;

  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 8);
  };

  return (
    <div className="quiz-card">
      <div className="quiz-content">
        <h2>{quiz.title}</h2>
        <p>{quiz.description}</p>
        <div className="author-info">          
          <AuthorInfo
            author={quiz.authorId || { name: "Аноним", avatar: "" }}
            createdAt={quiz.createdAt}
          />          
          {isAuthor && <span className="yourvictorine">ваша викторина</span>}
        </div>    
        <RatingStars rating={rating} votes={votes} />

        <div className="quiz-tags">
          {quiz.tags?.map((tag) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
        </div>

        <div className="quiz-meta">
          <div className="quiz-stats">
            <span className="questions-count">
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path d="M10 18a7.952 7.952 0 0 0 4.897-1.688l4.396 4.396 1.414-1.414-4.396-4.396A7.952 7.952 0 0 0 18 10c0-4.411-3.589-8-8-8s-8 3.589-8 8 3.589 8 8 8zm0-14c3.309 0 6 2.691 6 6s-2.691 6-6 6-6-2.691-6-6 2.691-6 6-6z" />
              </svg>
              {questionCount} {getQuestionWord(questionCount)}
            </span>
          </div>

          <Link 
            to={`/quiz/${quiz._id}/lobby/create`} 
            className="strt-button"
            onClick={(e) => {
              const roomId = generateRoomId();
              navigate(`/quiz/${quiz._id}/lobby/${roomId}`);
            }}
          >
            Начать игру
          </Link>
        </div>
      </div>
    </div>
  );
};

const getQuestionWord = (count) => {
  if (count % 100 >= 11 && count % 100 <= 14) {
    return "вопросов";
  }
  switch (count % 10) {
    case 1:
      return "вопрос";
    case 2:
    case 3:
    case 4:
      return "вопроса";
    default:
      return "вопросов";
  }
};

export default QuizCard;