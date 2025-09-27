import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import QuizCard from "../../components/QuizCard/QuizCard";
import TagFilter from "../../components/TagFilter/TagFilter";
import SearchBar from "../../components/SearchBar/SearchBar";
import "./GameList.css";

const SORT_OPTIONS = {
    DEFAULT: 'default',
    DATE_ASC: 'date-asc',
    DATE_DESC: 'date-desc',
    RATING_ASC: 'rating-asc',
    RATING_DESC: 'rating-desc',
    QUESTIONS_ASC: 'questions-asc',
    QUESTIONS_DESC: 'questions-desc'
  };
  

export default function GameList() {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [sortBy, setSortBy] = useState("SORT_OPTIONS.DEFAULT");

  // Инициализация данных викторин
  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const response = await fetch('/api/quizzes');
        const data = await response.json();
        setQuizzes(data);
      } catch (err) {
        console.error('Ошибка загрузки:', err);
      }
    };
    
    fetchQuizzes();
  }, []);

  const allTags = [...new Set(quizzes.flatMap((quiz) => quiz.tags))];

  const sortQuizzes = (quizzesToSort) => {
    switch (sortBy) {
      case SORT_OPTIONS.DATE_ASC:
        return [...quizzesToSort].sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        );
      case SORT_OPTIONS.DATE_DESC:
        return [...quizzesToSort].sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
      case SORT_OPTIONS.RATING_ASC:
        return [...quizzesToSort].sort(
          (a, b) => (a.rating?.average || 0) - (b.rating?.average || 0)
        );
      case SORT_OPTIONS.RATING_DESC:
        return [...quizzesToSort].sort(
          (a, b) => (b.rating?.average || 0) - (a.rating?.average || 0)
        );
      case SORT_OPTIONS.QUESTIONS_ASC:
        return [...quizzesToSort].sort(
          (a, b) =>
            (a.questions?.length || a.questionCount || 0) -
            (b.questions?.length || b.questionCount || 0)
        );
      case SORT_OPTIONS.QUESTIONS_DESC:
        return [...quizzesToSort].sort(
          (a, b) =>
            (b.questions?.length || b.questionCount || 0) -
            (a.questions?.length || a.questionCount || 0)
        );
      default:
        return quizzesToSort;
    }
  };

  const filteredQuizzes = quizzes.filter((quiz) => {
    const matchesSearch = quiz.title
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesTags =
      selectedTags.length === 0 ||
      selectedTags.some((tag) => quiz.tags.includes(tag));

    return matchesSearch && matchesTags;
  });

  const sortedAndFilteredQuizzes = sortQuizzes(filteredQuizzes);

  return (
    <div className="game-list">
      <div className="header-with-back">
        <button
          onClick={() => navigate("/")}
          className="back-button"
          aria-label="Вернуться на главную"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M19 12H5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M12 19L5 12L12 5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Назад
        </button>
        <h1>Выберите викторину</h1>
      </div>

      <div className="filters">
        <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />

        <div className="sort-controls">
          <label>Сортировка:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value={SORT_OPTIONS.DEFAULT}>По умолчанию</option>
            <option value={SORT_OPTIONS.DATE_ASC}>
              По дате (сначала старые)
            </option>
            <option value={SORT_OPTIONS.DATE_DESC}>
              По дате (сначала новые)
            </option>
            <option value={SORT_OPTIONS.RATING_ASC}>
              По рейтингу (возрастание)
            </option>
            <option value={SORT_OPTIONS.RATING_DESC}>
              По рейтингу (убывание)
            </option>
            <option value={SORT_OPTIONS.QUESTIONS_ASC}>
              По вопросам (возрастание)
            </option>
            <option value={SORT_OPTIONS.QUESTIONS_DESC}>
              По вопросам (убывание)
            </option>
          </select>
        </div>

        <TagFilter
          tags={allTags}
          selectedTags={selectedTags}
          setSelectedTags={setSelectedTags}
        />
      </div>

      <div className="quizzes-list">
        {sortedAndFilteredQuizzes.length > 0 ? (
          sortedAndFilteredQuizzes.map((quiz) => (
            <QuizCard key={quiz._id} quiz={quiz} />
          ))
        ) : (
          <p className="no-results">
            Ничего не найдено. Попробуйте изменить параметры поиска.
          </p>
        )}
      </div>
    </div>
  );
}
