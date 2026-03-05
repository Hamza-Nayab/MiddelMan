import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import {
  ShieldAlert,
  Users,
  Eye,
  AlertTriangle,
  BarChart3,
  Shield,
} from "lucide-react";
import { useEffect } from "react";

type NavTab = "users" | "reviews" | "disputes" | "analytics" | "admins";

interface AdminLayoutProps {
  children: React.ReactNode;
  currentTab: NavTab;
}

const navItems: Array<{
  id: NavTab;
  label: string;
  icon: React.ReactNode;
  path: string;
}> = [
  {
    id: "admins",
    label: "Admins",
    icon: <Shield className="w-4 h-4" />,
    path: "/admin/admins",
  },
  {
    id: "users",
    label: "Users",
    icon: <Users className="w-4 h-4" />,
    path: "/admin/users",
  },
  {
    id: "reviews",
    label: "Reviews",
    icon: <Eye className="w-4 h-4" />,
    path: "/admin/reviews",
  },
  {
    id: "disputes",
    label: "Disputes",
    icon: <AlertTriangle className="w-4 h-4" />,
    path: "/admin/disputes",
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: <BarChart3 className="w-4 h-4" />,
    path: "/admin/analytics",
  },
];

export function AdminLayout({ children, currentTab }: AdminLayoutProps) {
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

  // Redirect if not logged in or not admin
  useEffect(() => {
    if (!isLoading) {
      if (meError instanceof ApiError) {
        if (meError.code === "ACCOUNT_DISABLED") {
          setLocation("/disabled");
        } else if (meError.status === 403) {
          // Forbidden - no admin access
          setLocation("/access-not-available");
        } else if (meError.status === 401) {
          // Unauthorized - not logged in
          setLocation("/auth");
        }
      } else if (!me?.user) {
        setLocation("/auth");
      } else if (me.user.role !== "admin") {
        setLocation("/access-not-available");
      }
    }
  }, [isLoading, me, meError, setLocation]);

  if (isLoading || !me?.user) {
    return null;
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-10">
        <div className="flex flex-col gap-6">
          {/* Header */}
          <header className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-primary" />
            <h1 className="text-3xl font-bold font-heading">Admin Panel</h1>
          </header>

          {/* Main content with sidebar */}
          <div className="flex gap-6">
            {/* Sidebar Navigation */}
            <nav className="w-48 space-y-2">
              {navItems.map((item) => {
                // Only show Admins option for master admins
                if (item.id === "admins" && !me.user?.isMasterAdmin) {
                  return null;
                }
                return (
                  <Button
                    key={item.id}
                    variant={currentTab === item.id ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setLocation(item.path)}
                  >
                    {item.icon}
                    <span className="ml-2">{item.label}</span>
                  </Button>
                );
              })}
            </nav>

            {/* Content */}
            <div className="flex-1 min-w-0">{children}</div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
