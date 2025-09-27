import { useState, useContext } from "react";
import { AuthContext } from "../../Context/AuthContext";
import "./AuthModal.css";

const AuthModal = ({ onClose }) => {
  const { login, register, resetPassword } = useContext(AuthContext);
  const [mode, setMode] = useState("login"); 
  const [formData, setFormData] = useState({
    identifier: "",
    email: "",
    name: "",
    password: "",
    confirmPassword: "",
    resetEmail: ""
  });
  const [errors, setErrors] = useState({});
  const [serverMessage, setServerMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const newErrors = {};
    const { identifier, email, name, password, confirmPassword, resetEmail } = formData;

    if (mode === "login") {
      if (!identifier.trim()) newErrors.identifier = "Введите email или имя";
    } 
    else if (mode === "register") {
      if (!name.trim()) newErrors.name = "Введите имя";
      else if (name.length < 3) newErrors.name = "Минимум 3 символа";
      
      if (!email.trim()) newErrors.email = "Введите email";
      else if (!/^\S+@\S+\.\S+$/.test(email)) newErrors.email = "Некорректный email";
      
      if (!password) newErrors.password = "Введите пароль";
      else if (password.length < 6) newErrors.password = "Минимум 6 символов";
      
      if (password !== confirmPassword) newErrors.confirmPassword = "Пароли не совпадают";
    }
    else if (mode === "forgot") {
      if (!resetEmail.trim()) newErrors.resetEmail = "Введите email";
      else if (!/^\S+@\S+\.\S+$/.test(resetEmail)) newErrors.resetEmail = "Некорректный email";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
  
    setIsSubmitting(true);
    setServerMessage("");
    setErrors({});
  
    try {
      if (mode === "login") {
        await login(formData.identifier, formData.password);
        onClose();
      } 
      else if (mode === "register") {
        await register(formData.email, formData.name, formData.password);
        setServerMessage("Регистрация успешна! Теперь войдите");
        setMode("login");
      }
      else if (mode === "forgot") {
        await resetPassword(formData.resetEmail);
        setServerMessage("Инструкции отправлены на ваш email");
        setTimeout(() => setMode("login"), 3000);
      }
    } catch (error) {
      const errorMessage = error.message.toLowerCase();
  
      if (mode === "login") {
        if (errorMessage.includes("неверный пароль") || errorMessage.includes("password")) {
          setErrors({ password: "Неверный пароль" });
        } 
        else if (errorMessage.includes("пользователь не найден") || errorMessage.includes("user not found")) {
          setErrors({ identifier: "Пользователь не найден" });
        } else {
          setServerMessage(error.message);
        }
      }
      else if (mode === "register") {
        if (errorMessage.includes("email") || errorMessage.includes("почта")) {
          setErrors({ email: "Этот email уже используется" });
        }
        else if (errorMessage.includes("name") || errorMessage.includes("имя")) {
          setErrors({ name: "Пользователь с таким именем уже существует" });
        } else {
          setServerMessage(error.message);
        }
      }
      else {
        setServerMessage(error.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderForm = () => {
    switch (mode) {
      case "login":
        return (
          <>
            <div className="form-group">
              <label>Email или имя пользователя</label>
              <input
                type="text"
                name="identifier"
                value={formData.identifier}
                onChange={handleChange}
                className={errors.identifier ? "error" : ""}
              />
              {errors.identifier && <span className="error-text">{errors.identifier}</span>}
            </div>

            <div className="form-group">
              <label>Пароль</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={errors.password ? "error" : ""}
              />
              {errors.password && <span className="error-text">{errors.password}</span>}
            </div>

            <button 
              type="button" 
              className="text-button"
              onClick={() => setMode("forgot")}
            >
              Забыли пароль?
            </button>

            <button type="submit" className="primary-button" disabled={isSubmitting}>
              {isSubmitting ? "Вход..." : "Войти"}
            </button>

            <div className="form-footer">
              Нет аккаунта?{" "}
              <button type="button" className="text-button" onClick={() => setMode("register")}>
                Зарегистрироваться
              </button>
            </div>
          </>
        );

      case "register":
        return (
          <>
            <div className="form-group">
              <label>Имя пользователя</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={errors.name ? "error" : ""}
              />
              {errors.name && <span className="error-text">{errors.name}</span>}
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={errors.email ? "error" : ""}
              />
              {errors.email && <span className="error-text">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label>Пароль</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={errors.password ? "error" : ""}
              />
              {errors.password && <span className="error-text">{errors.password}</span>}
            </div>

            <div className="form-group">
              <label>Подтвердите пароль</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={errors.confirmPassword ? "error" : ""}
              />
              {errors.confirmPassword && (
                <span className="error-text">{errors.confirmPassword}</span>
              )}
            </div>

            <button type="submit" className="primary-button" disabled={isSubmitting}>
              {isSubmitting ? "Регистрация..." : "Зарегистрироваться"}
            </button>

            <div className="form-footer">
              Уже есть аккаунт?{" "}
              <button type="button" className="text-button" onClick={() => setMode("login")}>
                Войти
              </button>
            </div>
          </>
        );

      case "forgot":
        return (
          <>
            <p>Введите email для восстановления пароля</p>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="resetEmail"
                value={formData.resetEmail}
                onChange={handleChange}
                className={errors.resetEmail ? "error" : ""}
              />
              {errors.resetEmail && <span className="error-text">{errors.resetEmail}</span>}
            </div>

            <button type="submit" className="primary-button" disabled={isSubmitting}>
              {isSubmitting ? "Отправка..." : "Отправить инструкции"}
            </button>

            <div className="form-footer">
              <button type="button" className="text-button" onClick={() => setMode("login")}>
                Вернуться к входу
              </button>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>×</button>
        
        <h2>
          {mode === "login" && "Вход"}
          {mode === "register" && "Регистрация"}
          {mode === "forgot" && "Восстановление пароля"}
        </h2>

        {serverMessage && (
          <div className={`server-message ${mode === "register" ? "success" : ""}`}>
            {serverMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {renderForm()}
        </form>
      </div>
    </div>
  );
};

export default AuthModal;