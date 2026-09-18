import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const navItems = [
  {
    path: "/dashboard",
    label: "Dashboard",
    roles: ["admin", "professor", "student"],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    path: "/courses",
    label: "Courses",
    roles: ["admin", "professor", "student"],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
      </svg>
    ),
  },
  {
    path: "/problems",
    label: "Problem Studio",
    roles: ["admin", "professor"],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    path: "/users",
    label: "Users",
    roles: ["admin"],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const { user } = useAuth();
  const location = useLocation();

  const visibleItems = navItems.filter((item) => user && item.roles.includes(user.role));

  return (
    <aside className="w-60 bg-surface flex flex-col min-h-screen border-r border-border-subtle animate-slide-in-left">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-border-subtle">
        <Link to="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-lime flex items-center justify-center transition-shadow duration-300 group-hover:shadow-[0_0_16px_var(--color-lime-glow)]">
            <span className="font-mono font-bold text-base text-[#FDFAF5]">{"{}"}</span>
          </div>
          <div>
            <span className="font-display font-bold text-base text-text-primary tracking-tight">
              codereps
            </span>
            <span className="text-lime font-display font-bold">.ai</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {visibleItems.map((item) => {
          const active = location.pathname === item.path ||
            (item.path !== "/dashboard" && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                active
                  ? "bg-lime-dim text-lime"
                  : "text-text-secondary hover:bg-surface-2 hover:text-text-primary"
              }`}
            >
              <span className={active ? "text-lime" : "text-text-tertiary"}>{item.icon}</span>
              {item.label}
              {active && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-lime" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User badge */}
      {user && (
        <div className="px-3 pb-4">
          <Link
            to="/profile"
            className={`flex items-center gap-3 px-3 py-3 rounded-lg border transition-all duration-200 ${
              location.pathname === "/profile"
                ? "bg-lime-dim border-lime/20"
                : "bg-surface-2 border-border-subtle hover:border-border"
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-lime flex items-center justify-center shrink-0">
              <span className="font-display font-bold text-xs text-[#FDFAF5]">
                {user.full_name?.charAt(0)?.toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">{user.full_name}</p>
              <p className="text-xs text-text-tertiary mt-0.5 font-mono">{user.role}</p>
            </div>
          </Link>
        </div>
      )}
    </aside>
  );
}
