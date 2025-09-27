import { useState, useEffect, useContext, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../../Context/AuthContext";
import io from "socket.io-client";
import Avatar from "../../components/Avatar/Avatar";
import "./Lobby.css";

const Lobby = () => {
  const { user } = useContext(AuthContext);
  const { quizId, roomId } = useParams();  
  const navigate = useNavigate();
  const location = useLocation();
  const socketRef = useRef(null);
  
  const [room, setRoom] = useState({
    players: [],
    quizId: null,
    gameState: "waiting",
  });
  const [isHost, setIsHost] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [playerAvatars, setPlayerAvatars] = useState({});
  const [countdownActive, setCountdownActive] = useState(false);
  const [countdownValue, setCountdownValue] = useState(3);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) {
      setError("Пользователь не авторизован");
      setIsLoading(false);
      return;
    }

    const newSocket = io("http://localhost:5001", {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    
    socketRef.current = newSocket;

    const isCreatingRoom = location.pathname.includes("/create");
    const finalRoomId = isCreatingRoom ? generateRoomId() : roomId;

    if (isCreatingRoom) {
      setIsHost(true);
      navigate(`/quiz/${quizId}/lobby/${finalRoomId}`, { replace: true });
    }

    const link = `${window.location.origin}/quiz/${quizId}/lobby/${finalRoomId}`;
    setInviteLink(link);

    newSocket.emit("joinRoom", {
      roomId: finalRoomId,
      user: {
        id: user._id,
        name: user.name,
        avatar: user.avatar,
      },
    });

    newSocket.on("connect", () => {
      console.log("Connected to socket server");
      setError(null);
    });

    newSocket.on("connect_error", (err) => {
      setError("Ошибка подключения к серверу");
      console.error("Connection error:", err);
    });

    newSocket.on("roomUpdate", (updatedRoom) => {
      setRoom(updatedRoom);
      setIsLoading(false);
      
      if (updatedRoom.players.length > 0 && 
          updatedRoom.players.every(p => p.isReady)) {
        setCountdownActive(true);
        setCountdownValue(3);
      } else {
        setCountdownActive(false);
      }
    });

    newSocket.on("gameStarted", () => {
      navigate(`/quiz/${quizId}/play/${finalRoomId}`);
    });

    return () => {
      newSocket.disconnect();
      newSocket.off("roomUpdate");
      newSocket.off("gameStarted");
    };
  }, [user, quizId, roomId, navigate, location]);

  useEffect(() => {
    if (!countdownActive) return;

    const timer = setInterval(() => {
      setCountdownValue(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          startGame(); 
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countdownActive]);

  useEffect(() => {
    const fetchAvatars = async () => {
      const avatars = {};
      for (const player of room.players) {
        try {
          const response = await fetch(`/api/users/${player.id}`);
          const data = await response.json();
          avatars[player.id] = {
            avatar: data.avatar,
            name: data.name
          };
        } catch (err) {
          avatars[player.id] = {
            avatar: null,
            name: player.name
          };
        }
      }
      setPlayerAvatars(avatars);
    };

    if (room.players.length > 0) {
      fetchAvatars();
    }
  }, [room.players]);

  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 8);
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleReady = () => {
    if (!socketRef.current) return;
    
    socketRef.current.emit("playerReady", {
      roomId: roomId,
      userId: user._id,
    });
  };

  const startGame = () => {
    if (isHost && socketRef.current) {
      socketRef.current.emit("startGame", {
        roomId: roomId,
        quizId: quizId,
      });
    }
  };

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (isLoading) {
    return <div className="loading">Подключение к комнате...</div>;
  }

  return (
    <div className="lobby">
      <h2>Лобби викторины</h2>
      
      <div className="invite-section">
        <p>Пригласите друзей:</p>
        <div className="invite-link-container">
          <div className="invite-link">
            <input 
              type="text" 
              value={inviteLink} 
              readOnly 
              onClick={(e) => e.target.select()}
            />
            <button onClick={copyInviteLink}>
              {copied ? "Скопировано!" : "Копировать"}
            </button>
          </div>
          <p className="invite-hint">Отправьте эту ссылку друзьям для совместной игры</p>
        </div>
      </div>
      
      <div className="players-grid">
        {room.players.map((player) => (
          <div key={player.id} className={`player-slot ${player.isReady ? "ready" : ""}`}>
            {playerAvatars[player.id]?.avatar ? (
              <img 
                src={playerAvatars[player.id].avatar} 
                alt={playerAvatars[player.id]?.name || player.name} 
              />
            ) : (
              <Avatar user={{ name: playerAvatars[player.id]?.name || player.name }} size={60} />
            )}
            <span>{playerAvatars[player.id]?.name || player.name}</span>
            {player.isReady && <span className="ready-badge">✓</span>}
          </div>
        ))}
        
        {Array(8 - room.players.length).fill().map((_, i) => (
          <div key={`empty-${i}`} className="player-slot empty">
            <span>Ожидание игрока...</span>
          </div>
        ))}
      </div>
      
      <div className="lobby-actions">
        <button 
          onClick={toggleReady} 
          className={`ready-button ${room.players.find(p => p.id === user._id)?.isReady ? "ready" : ""}`}
        >
          {room.players.find(p => p.id === user._id)?.isReady ? "Готов!" : "Я готов"}
        </button>
      </div>

      {countdownActive && (
        <div className="auto-start-countdown">
          <div className="countdown-circle">
            <svg className="countdown-svg" viewBox="0 0 100 100">
              <circle className="countdown-circle-bg" cx="50" cy="50" r="45" />
              <circle
                className="countdown-circle-fg"
                cx="50"
                cy="50"
                r="45"
                strokeDasharray="283"
                strokeDashoffset={283 * (1 - countdownValue / 3)}
              />
            </svg>
            <div className="countdown-number">{countdownValue}</div>
          </div>
          <p>Все игроки готовы! Игра начнётся через...</p>
        </div>
      )}
    </div>
  );
};

export default Lobby;