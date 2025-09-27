import { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { AuthProvider } from "./Context/AuthContext";
import "./App.css";

import Home from "./pages/Home/Home";
import Constructor from "./pages/Constructor/Constructor";
import GameList from "./pages/GameList/GameList";
import GamePage from "./pages/GamePage/GamePage";
import Lobby from "./pages/Lobby/Lobby";
import Leaderboard from "./pages/Leaderboard/Leaderboard";
import Profile from "./pages/Profile/Profile";

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div>
          <main>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/constructor" element={<Constructor />} />
              <Route path="/gamelist" element={<GameList />} />
              <Route path="/profile/:userId" element={<Profile />} />
              <Route path="/quiz/:quizId/lobby/:roomId" element={<Lobby />} />
              <Route path="/quiz/:quizId/lobby/create" element={<Lobby />} />
              <Route path="/quiz/:quizId/play/:roomId" element={<GamePage />} />
              <Route
                path="/quiz/:quizId/leaderboard"
                element={<Leaderboard />}
              />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}
