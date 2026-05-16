import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded-lg text-sm font-medium ${
    isActive ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800"
  }`;

export default function PortalLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex bg-slate-950">
      <aside className="w-56 border-r border-slate-800 bg-slate-900/50 p-4 flex flex-col">
        <div className="mb-8">
          <p className="text-xs text-indigo-400 font-semibold uppercase tracking-wide">Client Portal</p>
          <h1 className="text-lg font-bold text-white truncate">{user?.tenant?.name ?? "Portal"}</h1>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          <NavLink to="/portal" end className={navClass}>Dashboard</NavLink>
          <NavLink to="/portal/attendance" className={navClass}>Attendance</NavLink>
          <NavLink to="/portal/devices" className={navClass}>Devices</NavLink>
          <NavLink to="/portal/employees" className={navClass}>Employees</NavLink>
          <NavLink to="/portal/settings" className={navClass}>Settings</NavLink>
        </nav>
        <div className="pt-4 border-t border-slate-800 text-xs text-slate-500">
          <p className="text-slate-300 truncate">{user?.name}</p>
          <button
            type="button"
            onClick={() => { logout(); navigate("/login"); }}
            className="mt-2 text-red-400 hover:text-red-300"
          >
            Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-auto max-w-6xl">
        <Outlet />
      </main>
    </div>
  );
}
