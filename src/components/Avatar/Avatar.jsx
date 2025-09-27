import "./Avatar.css";

const Avatar = ({ user, size = 40 }) => {  
  if (!user || !user.name) {
    return (
      <div 
        className="avatar-initials"
        style={{
          width: size,
          height: size,
          backgroundColor: '#ccc',
          fontSize: size * 0.4,
        }}
      >
        ?
      </div>
    );
  }

  const nameParts = user.name.split(" ").filter(part => part.trim().length > 0);
  const initials = nameParts.length > 0
    ? nameParts
      .map((part) => part[0].toUpperCase())
      .join('')
      .slice(0, 2)
    : '?';

  const backgroundColor = stringToColor(user.name);

  return (
    <div
      className="avatar-initials"
      style={{
        width: size,
        height: size,
        backgroundColor,
        fontSize: size * 0.4,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        color: 'white',
        fontWeight: 'bold'
      }}
    >
      {initials}
    </div>
  );
};

const stringToColor = (str) => {
  if (!str) return '#ccc';
  
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 60%)`;
};

export default Avatar;