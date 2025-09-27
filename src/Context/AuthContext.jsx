import { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleAuthResponse = async (response) => {
    const data = await response.json();
    
    if (!response.ok) {
      let errorMessage = data.error || "Произошла ошибка";
    
      if (response.status === 401) {
        if (data.error.includes("password")) {
          errorMessage = "Неверный пароль";
        } else {
          errorMessage = "Пользователь не найден";
        }
      } else if (response.status === 409) {
        if (data.error.includes("email")) {
          errorMessage = "Этот email уже используется";
        } else if (data.error.includes("name")) {
          errorMessage = "Пользователь с таким именем уже существует";
        }
      }
      
      throw new Error(errorMessage);
    }
    
    localStorage.setItem("token", data.token);
    setUser(data.user);
    return data;
  };

  const login = async (identifier, password) => {
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      
      return await handleAuthResponse(response);
    } catch (error) {
      console.error("Login error:", error);
      throw error; 
    }
  };

  const register = async (email, name, password) => {
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, password }),
      });
      
      return await handleAuthResponse(response);
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  };

  const resetPassword = async (email) => {
    const response = await fetch("/api/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Ошибка восстановления пароля");
    }
    
    return await response.json();
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setIsLoading(false);
      return;
    }
    
    const fetchUser = async () => {
      try {
        const response = await fetch("/api/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Not a JSON response");
        }

        const data = await response.json();
        if (!data.user) {
          throw new Error("User data missing");
        }

        setUser(data.user);
      } catch (error) {
        console.error("Auth check failed:", error.message);
        localStorage.removeItem("token");
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, []);

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        login, 
        register, 
        resetPassword,
        logout, 
        isLoading 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;