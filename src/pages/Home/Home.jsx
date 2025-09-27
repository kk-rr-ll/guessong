import { useState, useContext } from "react";
import { Link } from "react-router-dom";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import AuthModal from "../../components/AuthModal/AuthModal";
import { AuthContext } from "../../Context/AuthContext";
import "./Home.css";

export default function Home() {
  const { user } = useContext(AuthContext);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleButtonClick = (e) => {
    if (!user) {
      e.preventDefault();
      setShowAuthModal(true);
    }
  };

  const closeAuthModal = () => {
    setShowAuthModal(false);
  };

  return (
    <div className="app">
      <Header />
      <main className="main-content">
        <div className="action-buttons">
          <Link
            to="/constructor"
            className="constructor-button"
            onClick={handleButtonClick}
          >
            Конструктор викторин
          </Link>
          <Link
            to="/gamelist"
            className="gamelist-button"
            onClick={handleButtonClick}
          >
            Список викторин
          </Link>
        </div>
      </main>
      <Footer />

      {showAuthModal && (
        <AuthModal 
          onClose={closeAuthModal} 
        />
      )}
    </div>
  );
}