import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Suspense, lazy } from "react";

// Eagerly load the most common entry points
import Home from "@/pages/home";
import NotFound from "@/pages/not-found";

// Lazy-load all other pages for route-level code splitting
const AuthPage = lazy(() => import("@/pages/auth"));
const VerifiedPage = lazy(() => import("@/pages/verified"));
const ForgotPasswordPage = lazy(() => import("@/pages/forgot-password"));
const ResetPasswordPage = lazy(() => import("@/pages/reset-password"));
const RoleOnboardingPage = lazy(() => import("@/pages/onboarding-role"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const SearchPage = lazy(() => import("@/pages/search"));
const ProfilePage = lazy(() => import("@/pages/profile"));
const AdminAdminsPage = lazy(() => import("@/pages/admin-admins"));
const AdminUsersPage = lazy(() => import("@/pages/admin-users"));
const AdminReviewsPage = lazy(() => import("@/pages/admin-reviews"));
const AdminDisputesPage = lazy(() => import("@/pages/admin-disputes"));
const AdminAnalyticsPage = lazy(() => import("@/pages/admin-analytics"));
const AdminSellerDetailPage = lazy(() => import("@/pages/admin-seller-detail"));
const MyReviewsPage = lazy(() => import("@/pages/my-reviews"));
const DemoPage = lazy(() => import("@/pages/demo"));
const DisabledPage = lazy(() => import("@/pages/disabled"));
const AccessNotAvailablePage = lazy(() => import("@/pages/access-not-available"));
const AboutPage = lazy(() => import("@/pages/about"));
const TermsPage = lazy(() => import("@/pages/terms"));
const LandingV2 = lazy(() => import("@/pages/landing-v2"));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/verified" component={VerifiedPage} />
        <Route path="/forgot-password" component={ForgotPasswordPage} />
        <Route path="/reset-password" component={ResetPasswordPage} />
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
        <Route path="/v2" component={LandingV2} />
        {/* Dynamic route for profiles - MUST be last to avoid conflict */}
        <Route path="/:username" component={ProfilePage} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
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
