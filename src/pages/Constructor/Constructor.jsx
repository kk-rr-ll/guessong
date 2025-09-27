import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./Constructor.css";

export default function Constructor() {
  const navigate = useNavigate();
  const fileInputRefs = useRef([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isChanging, setChanging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const MAX_FILE_SIZE = 50 * 1024 * 1024; 

  const [quizData, setQuizData] = useState({
    title: "",
    description: "",
    questionCount: 10,
    tags: [],
    questions: Array(10)
      .fill()
      .map(() => ({
        type: "music",
        file: null,
        question: "",
        correctAnswer: "",
        incorrectAnswers: ["", "", ""],
      })),
  });

  const availableTags = [
    "поп",
    "рок",
    "хип-хоп",
    "джаз",
    "R&B",
    "кантри",
    "регги",
    "электронная",
    "классика",
    "другое",
  ];

  const handleBasicInfoChange = (e) => {
    const { name, value } = e.target;
    setQuizData((prev) => ({ ...prev, [name]: value }));
  };

  const handleQuestionCountChange = (e) => {
    const count = parseInt(e.target.value);
    const newQuestions = Array(count)
      .fill()
      .map(
        (_, i) =>
          quizData.questions[i] || {
            type: "music",
            file: null,
            question: "",
            correctAnswer: "",
            incorrectAnswers: ["", "", ""],
          }
      );
    setQuizData((prev) => ({
      ...prev,
      questionCount: count,
      questions: newQuestions,
    }));
  };

  const handleTagToggle = (tag) => {
    setQuizData((prev) => {
      const newTags = prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : prev.tags.length < 5
        ? [...prev.tags, tag]
        : prev.tags;
      return { ...prev, tags: newTags };
    });
  };

  const handleQuestionChange = (index, field, value) => {
    setQuizData((prev) => {
      const newQuestions = [...prev.questions];
      newQuestions[index][field] = value;
      return { ...prev, questions: newQuestions };
    });
  };

  const handleAnswerChange = (questionIndex, answerIndex, value) => {
    setQuizData((prev) => {
      const newQuestions = [...prev.questions];
      newQuestions[questionIndex].incorrectAnswers[answerIndex] = value;
      return { ...prev, questions: newQuestions };
    });
  };

  const handleFileDrop = (questionIndex, e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) processFile(questionIndex, file);
  };

  const handleFileInput = (questionIndex, e) => {
    const file = e.target.files[0];
    if (file) processFile(questionIndex, file);
  };

  const xhr = new XMLHttpRequest();
  xhr.upload.addEventListener("progress", (event) => {
    if (event.lengthComputable) {
      const percent = Math.round((event.loaded / event.total) * 100);
      setUploadProgress(percent);
    }
  });

  const processFile = async (questionIndex, file) => {
    const type = quizData.questions[questionIndex].type;
    const validTypes =
      type === "music"
        ? ["audio/mpeg", "audio/wav"]
        : ["image/jpeg", "image/jpg", "image/png"];

    if (file.size > MAX_FILE_SIZE) {
      alert(`Файл слишком большой (максимум ${MAX_FILE_SIZE / 1024 / 1024}MB)`);
      return;
    }

    if (!validTypes.includes(file.type)) {
      alert(
        `Пожалуйста, выберите ${
          type === "music" ? "аудио файл (MP3, WAV)" : "изображение (JPEG, JPG, PNG)"
        }`
      );
      return;
    }

    try {
      let processedFile = file;  

      handleQuestionChange(questionIndex, "file", processedFile);
    } catch (err) {
      console.error("Ошибка обработки файла:", err);
      alert("Не удалось обработать файл");
    }
  };

  const validateQuiz = () => {
    if (!quizData.title.trim() || quizData.title.length > 20) {
      alert("Название викторины должно быть от 1 до 20 символов");
      return false;
    }

    if (quizData.description.length > 100) {
      alert("Описание не должно превышать 100 символов");
      return false;
    }

    if (quizData.tags.length === 0) {
      alert("Выберите хотя бы один тег");
      return false;
    }

    for (let i = 0; i < quizData.questions.length; i++) {
      const q = quizData.questions[i];
      if (
        !q.question.trim() ||
        !q.correctAnswer.trim() ||
        q.incorrectAnswers.some((a) => !a.trim()) ||
        !q.file
      ) {
        alert(`Заполните все поля вопроса ${i + 1}`);
        return false;
      }
    }

    for (const question of quizData.questions) {
      if (!question.file) {
        alert(
          `Необходимо загрузить файл для вопроса ${
            quizData.questions.indexOf(question) + 1
          }`
        );
        return false;
      }
    }

    return true;
  };

  const saveQuiz = async () => {
    if (!validateQuiz()) return;
    setIsUploading(true);

    try {
      const token = localStorage.getItem("token");

      const formData = new FormData();

      formData.append("quizData", JSON.stringify(quizData));
      quizData.questions.forEach((q) => {
        if (q.file) formData.append("files", q.file);
      });

      const response = await fetch("/api/quizzes", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error("Ошибка сохранения");

      const savedQuiz = await response.json();
      navigate(`/`);
    } catch (err) {
      alert("Произошла ошибка при сохранении викторины");
      console.error("Ошибка:", err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="list">
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
      <div className="quiz-creator">
        <h1>Создать новую викторину</h1>

        <div className="creator-section">
          <h2>Основная информация</h2>
          <div className="form-group">
            <label>Название викторины (до 20 символов):</label>
            <input
              type="text"
              name="title"
              value={quizData.title}
              onChange={handleBasicInfoChange}
              maxLength={20}
            />
            <div className="char-count">{quizData.title.length}/20</div>
          </div>

          <div className="form-group">
            <label>Описание (до 30 символов):</label>
            <textarea
              name="description"
              value={quizData.description}
              onChange={handleBasicInfoChange}
              maxLength={30}
            />
            <div className="char-count">{quizData.description.length}/30</div>
          </div>

          <div className="form-group range-group">
            <div className="range-label">
              <span>Минимум: 5</span>
              <span>Количество вопросов</span>
              <span>Максимум: 30</span>
            </div>
            <input
              type="range"
              min="5"
              max="30"
              value={quizData.questionCount}
              onChange={handleQuestionCountChange}
              style={{
                "--fill-percent": `${
                  ((quizData.questionCount - 5) / (30 - 5)) * 100
                }%`,
              }}
            />
            <div className={`range-value ${isChanging ? "changed" : ""}`}>
              {quizData.questionCount}
            </div>
          </div>

          <div className="form-group">
            <label>Теги (максимум 5):</label>
            <div className="tags-container">
              {availableTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`tag ${
                    quizData.tags.includes(tag) ? "selected" : ""
                  }`}
                  onClick={() => handleTagToggle(tag)}
                  disabled={
                    !quizData.tags.includes(tag) && quizData.tags.length >= 4
                  }
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="creator-section">
          <h2>Вопросы</h2>
          <div className="questions-list">
            {quizData.questions.map((question, qIndex) => (
              <div key={qIndex} className="question-editor">
                <h3>Вопрос {qIndex + 1}</h3>

                <div className="form-group">
                  <label>Тип вопроса:</label>
                  <select
                    value={question.type}
                    onChange={(e) =>
                      handleQuestionChange(qIndex, "type", e.target.value)
                    }
                  >
                    <option value="music">Музыкальный</option>
                    <option value="image">Картинка</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>
                    Файл ({question.type === "music" ? "аудио" : "изображение"}
                    ):
                  </label>
                  <div
                    className={`file-dropzone ${
                      question.file ? "has-file" : ""
                    }`}
                    onDrop={(e) => handleFileDrop(qIndex, e)}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => fileInputRefs.current[qIndex].click()}
                  >
                    {question.file ? (
                      <div className="file-info">
                        {question.file.name}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuestionChange(qIndex, "file", null);
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <p>Перетащите файл сюда или кликните для выбора</p>
                    )}
                    <input
                      type="file"
                      ref={(el) => (fileInputRefs.current[qIndex] = el)}
                      onChange={(e) => handleFileInput(qIndex, e)}
                      accept={question.type === "music" ? "audio/*" : "image/*"}
                      style={{ display: "none" }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Текст вопроса:</label>
                  <input
                    type="text"
                    value={question.question}
                    onChange={(e) =>
                      handleQuestionChange(qIndex, "question", e.target.value)
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Правильный ответ:</label>
                  <input
                    type="text"
                    value={question.correctAnswer}
                    onChange={(e) =>
                      handleQuestionChange(
                        qIndex,
                        "correctAnswer",
                        e.target.value
                      )
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Неправильные ответы:</label>
                  {question.incorrectAnswers.map((answer, aIndex) => (
                    <input
                      key={aIndex}
                      type="text"
                      value={answer}
                      onChange={(e) =>
                        handleAnswerChange(qIndex, aIndex, e.target.value)
                      }
                      placeholder={`Неправильный ответ ${aIndex + 1}`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="actions">
          <button onClick={() => navigate("/")} className="cancel-btn">
            Отмена
          </button>
          <button onClick={saveQuiz} className="save-btn">
            Сохранить викторину
          </button>
          {isUploading && (
            <div className="upload-progress">
              <p>Загрузка файлов... ({Math.round(uploadProgress)}%)</p>
              <progress value={uploadProgress} max="100" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
