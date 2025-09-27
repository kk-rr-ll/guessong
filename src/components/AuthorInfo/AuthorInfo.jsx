import { format, parseISO } from "date-fns";
import { useNavigate } from "react-router-dom";
import { ru } from "date-fns/locale";
import "./AuthorInfo.css";
import Avatar from "../Avatar/Avatar";

const AuthorInfo = ({ author, createdAt }) => {
  const navigate = useNavigate();
  const formatDate = (dateString) => {
    try {
      const date = isNaN(new Date(dateString).getTime())
        ? parseISO(dateString)
        : new Date(dateString);

      if (isNaN(date.getTime())) {
        throw new Error("Invalid date");
      }

      return format(date, "dd.MM.yyyy", { locale: ru });
    } catch (error) {
      console.error("Ошибка форматирования даты:", error);
      return "дата неизвестна";
    }
  };

  const handleClick = () => {
    if (author._id) {
      navigate(`/profile/${author._id}`);
    }
  };

  if (author.avatar) {
    return (
      <div className="author-info" onClick={handleClick}>
        <img src={author.avatar} alt={author.name} className="author-avatar" />
        <div className="author-details">
          <span className="author-name">{author.name}</span>
          <span className="creation-date">{formatDate(createdAt)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="author-info" onClick={handleClick}>
      <Avatar user={author} size={32} />
      <div className="author-details">
        <span className="author-name">{author.name}</span>
        <span className="creation-date">{formatDate(createdAt)}</span>
      </div>
    </div>
  );
};

export default AuthorInfo;
