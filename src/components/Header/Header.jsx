import "./Header.css";
import { useState } from "react";
import AuthButton from "../AuthButton/AuthButton";

export default function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleAuthClick = () => {
    setIsLoggedIn(!isLoggedIn);
  };

  return (
    <header className="header">
      <div className="logo">GUESSONG</div>
      <AuthButton />
    </header>
  );
}
