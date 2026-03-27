import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
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


declare global {
  interface Window {
    BrevoConversations?: (...args: unknown[]) => void;
    BrevoConversationsID?: string;
  }
}

const BREVO_CONVERSATIONS_ID = "69b77bc6707530e2f602e33a";
const BREVO_SCRIPT_ID = "brevo-conversations-script";

function BrevoConversationsChat() {
  useEffect(() => {
    if (document.getElementById(BREVO_SCRIPT_ID)) {
      return;
    }

    window.BrevoConversationsID = BREVO_CONVERSATIONS_ID;
    window.BrevoConversations = window.BrevoConversations || (() => undefined);

    const script = document.createElement("script");
    script.id = BREVO_SCRIPT_ID;
    script.async = true;
    script.src = "https://conversations-widget.brevo.com/brevo-conversations.js";

    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  return null;
}

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
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <BrevoConversationsChat />
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
