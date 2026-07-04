import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AppLayout } from "@/components/layout/AppLayout";
import { RoleProvider } from "@/lib/role-context";

import Dashboard from "@/pages/dashboard";
import Analyses from "@/pages/analyses";
import Results from "@/pages/results";
import ModelPerformance from "@/pages/model-performance";
import Biomarkers from "@/pages/biomarkers";
import Genomics from "@/pages/genomics";
import SurvivalAnalysis from "@/pages/survival";
import DrugSensitivity from "@/pages/drugs";
import GeneLibrary from "@/pages/genes";
import PathwayAnalysis from "@/pages/pathways";
import PipelineMonitor from "@/pages/pipeline";
import Reports from "@/pages/reports";
import Notifications from "@/pages/notifications";
import Datasets from "@/pages/datasets";
import SampleComparison from "@/pages/comparison";
import ProjectOverview from "@/pages/overview";
import ExplainableAI from "@/pages/xai";
import ModelComparison from "@/pages/model-comparison";
import Architecture from "@/pages/architecture";
import Roadmap from "@/pages/roadmap";
import ModelTraining from "@/pages/model-training";
import Settings from "@/pages/settings";
import AuditLogs from "@/pages/audit-logs";
import ModelCard from "@/pages/model-card";
import StartupVision from "@/pages/startup-vision";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/analyses" component={Analyses} />
        <Route path="/results/:id" component={Results} />
        <Route path="/model-performance" component={ModelPerformance} />
        <Route path="/biomarkers" component={Biomarkers} />
        <Route path="/genomics" component={Genomics} />
        <Route path="/survival" component={SurvivalAnalysis} />
        <Route path="/drugs" component={DrugSensitivity} />
        <Route path="/genes" component={GeneLibrary} />
        <Route path="/pathways" component={PathwayAnalysis} />
        <Route path="/pipeline" component={PipelineMonitor} />
        <Route path="/reports" component={Reports} />
        <Route path="/notifications" component={Notifications} />
        <Route path="/datasets" component={Datasets} />
        <Route path="/comparison" component={SampleComparison} />
        <Route path="/overview" component={ProjectOverview} />
        <Route path="/xai" component={ExplainableAI} />
        <Route path="/model-comparison" component={ModelComparison} />
        <Route path="/architecture" component={Architecture} />
        <Route path="/roadmap" component={Roadmap} />
        <Route path="/settings" component={Settings} />
        <Route path="/audit-logs" component={AuditLogs} />
        <Route path="/model-training" component={ModelTraining} />
        <Route path="/model-card" component={ModelCard} />
        <Route path="/startup-vision" component={StartupVision} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RoleProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </RoleProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
