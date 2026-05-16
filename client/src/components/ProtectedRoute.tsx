import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { isSuperAdmin, isTenantUser } from "../lib/auth";

export function ProtectedRoute({
  children,
  role,
}: {
  children: React.ReactNode;
  role: "admin" | "portal" | "any";
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        Loading...
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (role === "admin" && !isSuperAdmin(user)) {
    return <Navigate to="/portal" replace />;
  }
  if (role === "portal" && !isTenantUser(user)) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}
