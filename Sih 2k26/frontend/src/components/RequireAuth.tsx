import type { ReactNode } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth, homeForRole } from "../auth";
import type { UserRole } from "../types";
import { Skeleton } from "./Skeleton";

export function RequireAuth({ role, children }: { role?: UserRole; children?: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="p-8">
        <Skeleton className="h-10 w-64" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={homeForRole(user.role)} replace />;
  return children ? <>{children}</> : <Outlet />;
}
