import { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { api, ApiError } from "@/lib/api";

interface ProtectedAdminRouteProps {
  children: ReactNode;
  requireMasterAdmin?: boolean;
}

/**
 * Component that protects routes by checking admin authorization.
 * Redirects to appropriate page based on auth status and permissions.
 */
export function ProtectedAdminRoute({
  children,
  requireMasterAdmin = false,
}: ProtectedAdminRouteProps) {
  const [, setLocation] = useLocation();

  const {
    data: me,
    isLoading,
    error: meError,
  } = useQuery({
    queryKey: ["me"],
    queryFn: api.getMe,
    retry: false,
  });

  // Handle various error scenarios
  if (!isLoading && meError) {
    if (meError instanceof ApiError) {
      if (meError.code === "ACCOUNT_DISABLED") {
        setLocation("/disabled");
        return null;
      }
      // 401 Unauthorized or other issues
      if (meError.status === 401) {
        setLocation("/auth");
        return null;
      }
      // 403 Forbidden - no admin access
      if (meError.status === 403) {
        setLocation("/access-not-available");
        return null;
      }
    }
  }

  // Check authorization
  if (!isLoading && me?.user) {
    // Not an admin
    if (me.user.role !== "admin") {
      setLocation("/access-not-available");
      return null;
    }

    // Master admin required but user is not master admin
    if (requireMasterAdmin && !me.user.isMasterAdmin) {
      setLocation("/access-not-available");
      return null;
    }
  }

  // Still loading or not authenticated
  if (isLoading || !me?.user) {
    return null;
  }

  return <>{children}</>;
}
