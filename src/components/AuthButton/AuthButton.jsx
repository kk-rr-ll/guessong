import { useState, useContext, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../Context/AuthContext";
import AuthModal from "../AuthModal/AuthModal";
import Avatar from "../Avatar/Avatar";
import "./AuthButton.css";

const AuthButton = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout } = useContext(AuthContext);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleProfileClick = () => {
    setIsMenuOpen(false);
    navigate(`/profile/${user._id}`); 
  };

  return (
    <>
      {user ? (
        <div className="user-avatar-container" ref={menuRef}>
          <button
            onClick={toggleMenu}
            className="avatar-button"
            aria-label="Меню пользователя"
          >
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="user-avatar"
              />
            ) : (
              <Avatar user={user} size={36} />
            )}
          </button>

          {isMenuOpen && (
            <div className="dropdown-menu">
              <button onClick={handleProfileClick} className="menu-item">
                Профиль
              </button>
              <button onClick={logout} className="menu-item logout">
                Выйти
              </button>
            </div>
          )}
        </div>
      ) : (
        <button onClick={() => setIsModalOpen(true)} className="login-btn">
          Войти
        </button>
      )}

      {isModalOpen && <AuthModal onClose={() => setIsModalOpen(false)} />}
    </>
  );
};

export default AuthButton;
