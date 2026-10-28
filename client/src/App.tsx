import Login from "./pages/Login";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import Pricing from "@/pages/Pricing";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import CompanyDetail from "./pages/CompanyDetail";
import CreateCompany from "./pages/CreateCompany";
import StripeSettings from "./pages/StripeSettings";
import CompanySettings from "./pages/CompanySettings";
import CampaignManager from "./pages/CampaignManager";
import PaymentDetail from "./pages/PaymentDetail";
import Analytics from "./pages/Analytics";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/companies/new" component={CreateCompany} />
      <Route path="/companies/:companyId" component={CompanyDetail} />
      <Route path="/companies/:companyId/campaigns" component={CampaignManager} />
      <Route path="/companies/:companyId/settings" component={CompanySettings} />
      <Route path="/login" component={Login} />
      <Route path="/companies/:companyId/stripe" component={StripeSettings} />
      <Route path="/companies/:companyId/analytics" component={Analytics} />
      <Route path="/companies/:companyId/payments/:paymentId" component={PaymentDetail} />
      <Route path="/404" component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
