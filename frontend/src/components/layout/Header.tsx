import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div />
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">
          {user?.full_name}{" "}
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{user?.role}</span>
        </span>
        <button onClick={handleLogout} className="text-sm text-red-600 hover:text-red-800">
          Logout
        </button>
      </div>
    </header>
  );
}
