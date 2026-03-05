import { useEffect } from "react";
import { useLocation } from "wouter";

// This file has been refactored into modular pages.
// See: admin-users.tsx, admin-reviews.tsx, admin-disputes.tsx, admin-analytics.tsx
export default function AdminPage() {
  const [, navigate] = useLocation();

  useEffect(() => {
    // Redirect to the new admin users page
    navigate("/admin/users");
  }, [navigate]);

  return null;
}
