import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import multer from "multer";
import path from "path";
import { createServer } from "http";
import { Server } from "socket.io";

dotenv.config();

const app = express();
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "http://localhost:5173");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), "uploads"));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|mp3|wav|ogg|mpeg/;
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(
        "Error: Only image (JPEG, JPG, PNG, GIF) and audio (MP3, WAV, OGG) files are allowed!"
      );
      console.error(file.mimetype, file.originalname);
    }
  },
});

// Подключение к MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

// Модели
const UserSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  password: String,
  name: String,
  avatar: { type: String, default: "" },
  badges: [
    {
      name: String,
      image: String,
      earnedAt: Date,
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

const QuizSchema = new mongoose.Schema({
  title: String,
  description: String,
  questions: [
    {
      type: { type: String, enum: ["music", "image"] },
      fileUrl: String,
      question: String,
      correctAnswer: String,
      incorrectAnswers: [String],
    },
  ],
  tags: [String],
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  rating: {
    average: { type: Number, default: 0 },
    votes: { type: Number, default: 0 },
  },
  createdAt: { type: Date, default: Date.now },
});

const RatingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz", required: true },
  value: { type: Number, required: true, min: 1, max: 5 },
  createdAt: { type: Date, default: Date.now },
});

const Rating = mongoose.model("Rating", RatingSchema);
const User = mongoose.model("User", UserSchema);
const Quiz = mongoose.model("Quiz", QuizSchema);

const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Access denied" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    if (!req.user) {
      return res.status(404).json({ error: "User not found" });
    }
    next();
  } catch (err) {
    res.status(400).json({ error: "Invalid token" }); 
  }
};

// Вспомогательная функция для обновления рейтинга викторины
const updateQuizRating = async (quizId) => {
  const ratings = await Rating.find({ quizId });
  const average = ratings.reduce((sum, r) => sum + r.value, 0) / ratings.length;

  await Quiz.findByIdAndUpdate(quizId, {
    rating: {
      average: parseFloat(average.toFixed(2)),
      votes: ratings.length,
    },
  });
};

// API Endpoints

// Регистрация
app.post("/api/register", async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const user = new User({
      email: req.body.email,
      password: hashedPassword,
      name: req.body.name,
      avatar: "",
    });

    const emailExists = await User.findOne({ email: user.email });
    if (emailExists) {
      return res.status(409).json({ error: "Этот email уже используется" });
    }

    const nameExists = await User.findOne({ name: user.name });
    if (nameExists) {
      return res
        .status(409)
        .json({ error: "Пользователь с таким именем уже существует" });
    }
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    res.json({ user, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Авторизация
app.post("/api/login", async (req, res) => {
  try {
    const { identifier, password } = req.body;

    const user = await User.findOne({
      $or: [{ email: identifier }, { name: identifier }],
    });

    if (!user) return res.status(401).json({ error: "Пользователь не найден" });

    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass) return res.status(401).json({ error: "Неверный пароль" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    res.json({ user, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Сохранение викторины
app.post(
  "/api/quizzes",
  authenticate,
  upload.array("files"),
  async (req, res) => {
    try {
      const { quizData } = req.body;
      const parsedData = JSON.parse(quizData);

      parsedData.questions.forEach((q, i) => {
        if (req.files[i]) {
          q.fileUrl = `/uploads/${req.files[i].filename}`;
        }
      });

      const quiz = new Quiz({
        ...parsedData,
        authorId: req.user._id,
      });

      await quiz.save();
      res.json(quiz);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// Оценка викторины
app.post("/api/quizzes/:id/rate", authenticate, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ error: "Quiz not found" });

    const newAverage =
      (quiz.rating.average * quiz.rating.votes + req.body.rating) /
      (quiz.rating.votes + 1);

    quiz.rating = {
      average: newAverage,
      votes: quiz.rating.votes + 1,
    };

    await quiz.save();
    res.json(quiz);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Рейтинги
app.post("/api/ratings", authenticate, async (req, res) => {
  try {
    const existingRating = await Rating.findOne({
      userId: req.user._id,
      quizId: req.body.quizId,
    });

    if (existingRating) {
      return res.status(400).json({ error: "Вы уже оценили эту викторину" });
    }

    const rating = new Rating({
      userId: req.user._id,
      quizId: req.body.quizId,
      value: req.body.value,
    });

    await rating.save();

    await updateQuizRating(req.body.quizId);

    res.json(rating);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/ratings/:id", authenticate, async (req, res) => {
  try {
    const rating = await Rating.findById(req.params.id);
    if (!rating) return res.status(404).json({ error: "Rating not found" });

    if (rating.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not authorized" });
    }

    rating.value = req.body.value;
    await rating.save();

    await updateQuizRating(rating.quizId);

    res.json(rating);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Изменение аватарки
app.put(
  "/api/users/:id/avatar",
  authenticate,
  upload.single("avatar"),
  async (req, res) => {
    try {
      const user = await User.findByIdAndUpdate(
        req.params.id,
        { avatar: `/uploads/${req.file.filename}` },
        { new: true }
      ).select("-password");

      res.json(user);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// Изменение имени
app.put("/api/users/:id", authenticate, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name: req.body.name },
      { new: true }
    ).select("-password");

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// получение всех рэйтингов
app.get("/api/ratings", async (req, res) => {
  try {
    const { userId, quizId } = req.query;
    const query = {};

    if (userId) query.userId = userId;
    if (quizId) query.quizId = quizId;

    const ratings = await Rating.find(query);
    res.json(ratings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Получение викторин
app.get("/api/quizzes", async (req, res) => {
  const quizzes = await Quiz.find().populate("authorId", "name avatar");
  res.json(quizzes);
});

// Получение данных текущего пользователя
app.get("/api/me", authenticate, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ user: req.user });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Получение викторины
app.get("/api/quizzes/:id", async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id).populate(
      "authorId",
      "name avatar"
    );
    if (!quiz) return res.status(404).json({ error: "Quiz not found" });
    res.json(quiz);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Получение пользователя по ID
app.get("/api/users/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Получение викторин, оцененных пользователем
app.get("/api/quizzes/rated-by/:userId", async (req, res) => {
  try {
    const ratings = await Rating.find({ userId: req.params.userId }).populate(
      "quizId"
    );
    const quizzes = ratings.map((rating) => ({
      ...rating.quizId.toObject(),
      userRating: rating.value,
    }));
    res.json(quizzes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5001;

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
  allowEIO3: true,
});

const rooms = new Map();
const gameRooms = new Map();

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Обработка входа в комнату
  socket.on("joinRoom", ({ roomId, user }) => {
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        players: [],
        quizId: null,
        gameState: "waiting",
      });
    }

    const room = rooms.get(roomId);

    room.players = room.players.filter((p) => p.id !== user.id);

    room.players.push({
      id: user.id,
      socketId: socket.id,
      name: user.name,
      avatar: user.avatar,
      score: 0,
      isReady: false,
    });

    socket.join(roomId);
    rooms.set(roomId, room);

    io.to(roomId).emit("roomUpdate", room);
    console.log(`User ${user.name} joined room ${roomId}`);
  });

  // Обработка входа в игровую комнату
  socket.on("joinGameRoom", ({ roomId, user }) => {
    try {
      console.log(`Попытка подключения к комнате ${roomId}`);

      if (!gameRooms.has(roomId)) {
        console.log(`Создаем новую игровую комнату ${roomId}`);
        gameRooms.set(roomId, {
          players: [],
          quizId: null,
          gameState: "countdown",
          currentQuestionIndex: 0,
        });
      }

      const room = gameRooms.get(roomId);

      room.players = room.players.filter((p) => p.id !== user.id);

      const newPlayer = {
        id: user.id,
        socketId: socket.id,
        name: user.name,
        avatar: user.avatar,
        score: 0,
        answered: false,
        correct: false,
        answeredTime: null,
        selectedAnswer: null,
        scoreAwarded: false, 
      };

      room.players.push(newPlayer);
      socket.join(roomId);

      console.log(`Игрок ${user.name} присоединился к комнате ${roomId}`);
      console.log(
        `Текущие игроки:`,
        room.players.map((p) => p.name)
      );

      io.to(roomId).emit("roomUpdate", room);
    } catch (err) {
      console.error("Ошибка подключения к комнате:", err);
      socket.emit("gameError", "Не удалось подключиться к комнате");
    }
  });

  // Готовность игрока
  socket.on("playerReady", ({ roomId, userId }) => {
    const room = rooms.get(roomId);
    if (room) {
      const player = room.players.find((p) => p.id === userId);
      if (player) {
        player.isReady = !player.isReady;

        const allReady = room.players.every((p) => p.isReady);
        if (allReady && room.players.length > 0) {
          io.to(roomId).emit("allPlayersReady");
        } else {
          io.to(roomId).emit("cancelCountdown");
        }

        io.to(roomId).emit("roomUpdate", room);
      }
    }
  });

  // Начало игры
  socket.on("startGame", ({ roomId, quizId }) => {
    const room = rooms.get(roomId);
    if (room) {
      if (room.players.some((p) => p.isReady)) {
        room.quizId = quizId;
        room.gameState = "countdown";
        io.to(roomId).emit("gameStarted", {
          quizId,
          gameState: "countdown",
        });
      }
    }
  });

  // Обработчик для ответа игрока
  socket.on("playerAnswer", ({ roomId, userId, answer, isCorrect }) => {
    const room = gameRooms.get(roomId);
    if (!room) return;

    const player = room.players.find((p) => p.id === userId);
    if (player) {
      player.answered = true;
      player.correct = isCorrect;
      player.selectedAnswer = answer;
      player.answeredTime = Date.now();

      io.to(roomId).emit("playerAnswered", {
        userId,
        answer,
        isCorrect,
      });
    }
  });

  // Обработчик счета
  socket.on("calculateScores", ({ roomId }) => {
    const room = gameRooms.get(roomId);
    if (!room) return;

    const correctPlayers = room.players
      .filter((p) => p.correct && !p.scoreAwarded)
      .sort((a, b) => a.answeredTime - b.answeredTime);

    correctPlayers.forEach((player, index) => {
      if (index === 0) player.score += 3; 
      else if (index === 1) player.score += 2; 
      else player.score += 1; 

      player.scoreAwarded = true; 
    });

    io.to(roomId).emit("scoresUpdated", {
      players: room.players,
    });
  });

  // Обработчик перехода к следующему вопросу
  socket.on("nextQuestion", ({ roomId, questionIndex }) => {
    const room = gameRooms.get(roomId);
    if (room) {
      room.currentQuestionIndex = questionIndex;
      room.players.forEach((p) => {
        p.answered = false;
        p.correct = false;
        p.selectedAnswer = null;
        p.scoreAwarded = false; 
      });

      io.to(roomId).emit("nextQuestion", {
        questionIndex,
        players: room.players,
      });
    }
  });

  // Отключение игрока
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
    rooms.forEach((room, roomId) => {
      room.players = room.players.filter((p) => p.socketId !== socket.id);
      if (room.players.length === 0) {
        rooms.delete(roomId);
      } else {
        io.to(roomId).emit("roomUpdate", room);
      }
    });
  });

  socket.on("updateScores", ({ roomId, players }) => {
    const room = rooms.get(roomId);
    if (room) {
      room.players = players;
      io.to(roomId).emit("roomUpdate", room);
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
