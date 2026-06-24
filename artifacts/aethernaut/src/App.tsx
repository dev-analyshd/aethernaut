import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AppLayout } from "@/components/layout/AppLayout";
import { useEffect } from "react";

// Pages
import NetworkOverview from "@/pages/NetworkOverview";
import AgentRegistry from "@/pages/AgentRegistry";
import AgentDetail from "@/pages/AgentDetail";
import Coalitions from "@/pages/Coalitions";
import CoalitionDetail from "@/pages/CoalitionDetail";
import Tasks from "@/pages/Tasks";
import BehavioralLab from "@/pages/BehavioralLab";

const queryClient = new QueryClient();

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={NetworkOverview} />
        <Route path="/agents" component={AgentRegistry} />
        <Route path="/agents/:id" component={AgentDetail} />
        <Route path="/coalitions" component={Coalitions} />
        <Route path="/coalitions/:id" component={CoalitionDetail} />
        <Route path="/tasks" component={Tasks} />
        <Route path="/behavioral" component={BehavioralLab} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  // Force dark mode
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
