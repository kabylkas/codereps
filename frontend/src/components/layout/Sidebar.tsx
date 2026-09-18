import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const navItems = [
  { path: "/dashboard", label: "Dashboard", roles: ["admin", "professor", "student"] },
  { path: "/courses", label: "Courses", roles: ["admin", "professor", "student"] },
  { path: "/problems", label: "Problems", roles: ["admin", "professor"] },
  { path: "/users", label: "Users", roles: ["admin"] },
];

export default function Sidebar() {
  const { user } = useAuth();
  const location = useLocation();

  const visibleItems = navItems.filter((item) => user && item.roles.includes(user.role));

  return (
    <aside className="w-56 bg-gray-900 text-gray-100 flex flex-col min-h-screen">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-lg font-bold tracking-tight">codereps.ai</h1>
      </div>
      <nav className="flex-1 p-2">
        {visibleItems.map((item) => {
          const active = location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`block px-3 py-2 rounded text-sm mb-1 ${
                active ? "bg-gray-700 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
