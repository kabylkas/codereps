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
    <header className="h-14 bg-surface/80 backdrop-blur-md border-b border-border-subtle flex items-center justify-between px-6 sticky top-0 z-30">
      <div />
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-surface-3 flex items-center justify-center">
            <span className="text-xs font-bold text-text-secondary">
              {user?.full_name?.charAt(0)?.toUpperCase()}
            </span>
          </div>
          <span className="text-sm text-text-secondary font-medium">
            {user?.full_name}
          </span>
          <span className="text-[10px] font-mono font-medium bg-lime-dim text-lime px-2 py-0.5 rounded-full uppercase tracking-wider">
            {user?.role}
          </span>
        </div>
        <div className="w-px h-5 bg-border" />
        <button
          onClick={handleLogout}
          className="text-sm text-text-tertiary hover:text-error transition-colors duration-200"
        >
          Log out
        </button>
      </div>
    </header>
  );
}
