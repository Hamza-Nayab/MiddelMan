import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import AuthPage from "@/pages/auth";
import RoleOnboardingPage from "@/pages/onboarding-role";
import Dashboard from "@/pages/dashboard";
import SearchPage from "@/pages/search";
import ProfilePage from "@/pages/profile";
import AdminAdminsPage from "@/pages/admin-admins";
import AdminUsersPage from "@/pages/admin-users";
import AdminReviewsPage from "@/pages/admin-reviews";
import AdminDisputesPage from "@/pages/admin-disputes";
import AdminAnalyticsPage from "@/pages/admin-analytics";
import AdminSellerDetailPage from "@/pages/admin-seller-detail";
import MyReviewsPage from "@/pages/my-reviews";
import DemoPage from "@/pages/demo";
import DisabledPage from "@/pages/disabled";
import AccessNotAvailablePage from "@/pages/access-not-available";
import AboutPage from "@/pages/about";
import TermsPage from "@/pages/terms";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/onboarding/role" component={RoleOnboardingPage} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/my-reviews" component={MyReviewsPage} />
      <Route path="/admin" component={AdminAdminsPage} />
      <Route path="/admin/admins" component={AdminAdminsPage} />
      <Route path="/admin/users" component={AdminUsersPage} />
      <Route path="/admin/sellers/:id" component={AdminSellerDetailPage} />
      <Route path="/admin/reviews" component={AdminReviewsPage} />
      <Route path="/admin/disputes" component={AdminDisputesPage} />
      <Route path="/admin/analytics" component={AdminAnalyticsPage} />
      <Route path="/search" component={SearchPage} />
      <Route path="/demo" component={DemoPage} />
      <Route path="/disabled" component={DisabledPage} />
      <Route path="/access-not-available" component={AccessNotAvailablePage} />
      <Route path="/about" component={AboutPage} />
      <Route path="/terms" component={TermsPage} />
      {/* Dynamic route for profiles - MUST be last to avoid conflict */}
      <Route path="/:username" component={ProfilePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
