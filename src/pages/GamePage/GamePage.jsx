import { useState, useEffect, useRef, useCallback, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../../Context/AuthContext";
import Avatar from "../../components/Avatar/Avatar";
import io from "socket.io-client";
import Leaderboard from "../Leaderboard/Leaderboard";
import "./GamePage.css";

const GamePage = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { quizId, roomId } = useParams();
  const socketRef = useRef(null);

  // Состояния игры
  const [quiz, setQuiz] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [timer, setTimer] = useState(15);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [gameState, setGameState] = useState("countdown");
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [players, setPlayers] = useState([]);
  const [shouldCalculateScores, setShouldCalculateScores] = useState(false);
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
  const audioRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    console.log("Подключение к сокету...");
    const newSocket = io("http://localhost:5001", {
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
    });

    socketRef.current = newSocket;

    const onConnect = () => {
      console.log("Подключено к сокету, ID:", newSocket.id);
      newSocket.emit("joinGameRoom", {
        roomId,
        user: {
          id: user._id,
          name: user.name,
          avatar: user.avatar,
        },
      });
    };

    const onRoomUpdate = (room) => {
      console.log("Обновление комнаты:", room);
      setPlayers(room.players);
      setGameState(room.gameState);
      setLoading(false);
    };

    const onGameError = (errorMsg) => {
      console.error("Ошибка игры:", errorMsg);
      setError(errorMsg);
      setLoading(false);
    };

    newSocket.on("gameStarted", ({ quizId, gameState }) => {
      setGameState(gameState);
      setCountdown(3);
    });

    newSocket.on("connect_error", (err) => {
      console.error("Ошибка подключения:", err);
      setError("Ошибка соединения с сервером");
      setLoading(false);
    });

    newSocket.on("playerAnswered", ({ userId, answer, isCorrect, score }) => {
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === userId
            ? {
                ...p,
                answered: true,
                correct: isCorrect,
                selectedAnswer: answer,
                score,
              }
            : p
        )
      );
    });

    newSocket.on("nextQuestion", ({ questionIndex, players }) => {
      setCurrentQuestionIndex(questionIndex);
      setPlayers(players);
      setSelectedAnswer(null);
      setGameState("countdown");
      setCountdown(3);
    });

    newSocket.on("updateScores", ({ players: updatedPlayers }) => {
      setPlayers(updatedPlayers);
    });

    newSocket.on("connect", onConnect);
    newSocket.on("roomUpdate", onRoomUpdate);
    newSocket.on("gameError", onGameError);

    return () => {
      newSocket.off("connect", onConnect);
      newSocket.off("roomUpdate", onRoomUpdate);
      newSocket.off("gameError", onGameError);
      newSocket.disconnect();
    };
  }, [roomId, user._id, user.name, user.avatar]);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        console.log("Начало загрузки викторины...");
        const response = await fetch(`/api/quizzes/${quizId}`);
        const data = await response.json();
        console.log("Викторина загружена:", data);
        setQuiz(data);
      } catch (err) {
        console.error("Ошибка загрузки викторины:", err);
        setError("Не удалось загрузить викторину");
      }
    };

    fetchQuiz();
  }, [quizId]);

  // Обратный отсчет перед игрой
  useEffect(() => {
    if (gameState !== "countdown") return;

    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          setGameState("question");
          setTimer(15);

          if (socketRef.current) {
            socketRef.current.emit("updateGameState", {
              roomId,
              gameState: "question",
            });
          }

          return 3;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [gameState, roomId]);

  // Таймер вопроса
  useEffect(() => {
    if (gameState !== "question") return;

    const timerInterval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerInterval);
          setGameState("answer");
          setShowCorrectAnswer(true);
          setShouldCalculateScores(true); 
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [gameState]);

  useEffect(() => {
    if (shouldCalculateScores && socketRef.current) {
      socketRef.current.emit("calculateScores", { roomId });
    }
  }, [shouldCalculateScores, roomId]);

  useEffect(() => {
    if (gameState !== "answer" || !quiz) return;

    const answerTimeout = setTimeout(() => {
      setShowCorrectAnswer(false);

      if (currentQuestionIndex < quiz.questions.length - 1) {
        const nextIndex = currentQuestionIndex + 1;
        if (socketRef.current) {
          socketRef.current.emit("nextQuestion", {
            roomId,
            questionIndex: nextIndex,
          });
        }
      } else {
        setGameState("leaderboard");
      }
    }, 5000);

    return () => clearTimeout(answerTimeout);
  }, [gameState, currentQuestionIndex, quiz, roomId]);

  useEffect(() => {
    if (!socketRef.current) return;

    const onPlayerAnswered = ({ userId, answer, isCorrect }) => {
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === userId
            ? {
                ...p,
                answered: true,
                correct: isCorrect,
                selectedAnswer: answer,
                answeredTime: Date.now(),
              }
            : p
        )
      );
    };

    socketRef.current.on("playerAnswered", onPlayerAnswered);

    return () => {
      socketRef.current?.off("playerAnswered", onPlayerAnswered);
    };
  }, []);

  useEffect(() => {
    if (!socketRef.current) return;

    const onScoresUpdated = ({ players: updatedPlayers }) => {
      setPlayers(updatedPlayers);
      setShouldCalculateScores(false);
    };

    socketRef.current.on("scoresUpdated", onScoresUpdated);

    return () => {
      socketRef.current?.off("scoresUpdated", onScoresUpdated);
    };
  }, []);

  useEffect(() => {
    if (shouldCalculateScores && socketRef.current) {
      socketRef.current.emit("calculateScores", { roomId });
    }
  }, [shouldCalculateScores, roomId]);

  const handleAnswerSelect = (answer) => {
    if (selectedAnswer || gameState !== "question") return;

    const isCorrect = answer === currentQuestion.correctAnswer;
    setSelectedAnswer(answer);

    setPlayers((prev) =>
      prev.map((p) =>
        p.id === user._id
          ? {
              ...p,
              answered: true,
              correct: isCorrect,
              selectedAnswer: answer,
              answeredTime: Date.now(),
            }
          : p
      )
    );

    if (socketRef.current) {
      socketRef.current.emit("playerAnswer", {
        roomId,
        userId: user._id,
        answer,
        isCorrect,
        answeredTime: Date.now(),
      });
    }
  };

  const renderPlayerCards = (playersSlice) => {
    return playersSlice.map((player) => (
      <div key={player.id} className="player-card">
        <div className="player-avatar">
          {player.avatar ? (
            <img src={player.avatar} alt={player.name} />
          ) : (
            <Avatar user={{ name: player.name }} size={50} />
          )}
        </div>
        <div className="player-info">
          <span className="player-name">{player.name}</span>
          <span className="player-score">{player.score}</span>
        </div>
      </div>
    ));
  };

  if (!quiz) return <div className="loading">Загрузка викторины...</div>;
  if (!players.length)
    return <div className="loading">Ожидание игроков...</div>;
  if (gameState === "leaderboard") {
    return <Leaderboard players={players} quizId={quizId} roomId={roomId} />;
  }
  if (error) {
    return (
      <div className="game-error">
        <h2>Ошибка</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>
          Попробовать снова
        </button>
      </div>
    );
  }

  if (loading || !quiz) {
    return (
      <div className="loading">
        <h2>Загрузка игры...</h2>
        <div>Статус: {gameState}</div>
        <div>Игроков: {players.length}</div>
        <div>Викторина: {quiz ? "Загружена" : "Не загружена"}</div>
        <div>Ошибки: {error || "Нет"}</div>
      </div>
    );
  }

  // if (user && players.some((p) => p.id === user._id)) {
  //   return (
  //     <div>
  //       <button
  //         onClick={() => {
  //           socketRef.current.emit("startGame", { roomId, quizId });
  //         }}
  //       >
  //         Начать игру (тест)
  //       </button>
  //     </div>
  //   );
  // }

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const currentAnswers = [
    currentQuestion.correctAnswer,
    ...currentQuestion.incorrectAnswers,
  ];

  return (
    <div className="game-page">
      {gameState === "question" && (
        <div className="question-timer">
          <div className="timer-circle">
            <span>{timer}</span>
          </div>
        </div>
      )}

      {gameState === "countdown" && !isGameStarted && (
        <div className="countdown-overlay">
          <div className="countdown-number">{countdown}</div>
        </div>
      )}

      <div className="game-container">
        <div className="players-sidebar left">
          {renderPlayerCards(
            [...players].sort((a, b) => b.score - a.score).slice(0, 2)
          )}
        </div>

        <div className="game-main">
          <h1 className="question-text">{currentQuestion.question}</h1>

          {currentQuestion.type === "image" && (
            <div className="media-container">
              <img
                src={currentQuestion.fileUrl}
                alt="Вопрос викторины"
                className="question-image"
              />
            </div>
          )}

          {currentQuestion.type === "music" && (
            <div className="media-container">
              <audio ref={audioRef} src={currentQuestion.fileUrl} autoPlay />
              <div className="audio-controls">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  onChange={(e) => (audioRef.current.volume = e.target.value)}
                  defaultValue="0.5"
                />
              </div>
            </div>
          )}

          <div className="answers-grid">
            {currentAnswers.map((answer, index) => {
              const answerPlayers = players.filter(
                (p) => p.selectedAnswer === answer
              );
              const isCorrectAnswer = answer === currentQuestion.correctAnswer;

              return (
                <button
                  key={index}
                  className={`
          answer-button
          ${selectedAnswer === answer ? "selected" : ""}
          ${showCorrectAnswer && isCorrectAnswer ? "correct" : ""}
          ${
            showCorrectAnswer && selectedAnswer === answer && !isCorrectAnswer
              ? "incorrect"
              : ""
          }
        `}
                  onClick={() => handleAnswerSelect(answer)}
                  disabled={gameState !== "question" || selectedAnswer}
                >
                  {answer}
                  <div className="answer-players">
                    {answerPlayers.map((player) => (
                      <div key={player.id} className="player-answer-indicator">
                        {player.avatar ? (
                          <img src={player.avatar} alt={player.name} />
                        ) : (
                          <Avatar user={{ name: player.name }} size={25} />
                        )}
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="players-sidebar right">
          {renderPlayerCards(
            [...players].sort((a, b) => b.score - a.score).slice(2)
          )}
        </div>
      </div>
    </div>
  );
};

export default GamePage;
