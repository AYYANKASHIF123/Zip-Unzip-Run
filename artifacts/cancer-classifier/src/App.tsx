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
import SuccessReadiness from "@/pages/success-readiness";
import Workspaces from "@/pages/workspaces";
import ApiAccess from "@/pages/api-access";
import Billing from "@/pages/billing";
import InstitutionalDashboard from "@/pages/institutional-dashboard";
import DatasetIntegration from "@/pages/dataset-integration";
import MultiOmics from "@/pages/multi-omics";
import ValidationPipeline from "@/pages/validation-pipeline";
import EnterpriseDeployment from "@/pages/enterprise-deployment";
import GnnPreview from "@/pages/gnn-preview";
import PpiNetwork from "@/pages/ppi-network";
import FederatedLearning from "@/pages/federated-learning";
import MobilePreview from "@/pages/mobile-preview";
import EhrIntegration from "@/pages/ehr-integration";
import ResearchPaper from "@/pages/research-paper";
import MarketValidation from "@/pages/market-validation";
import PilotProgram from "@/pages/pilot-program";
import CompetitiveAnalysis from "@/pages/competitive-analysis";
import GoToMarket from "@/pages/go-to-market";
import BusinessCase from "@/pages/business-case";
import RiskMitigation from "@/pages/risk-mitigation";
import Feedback from "@/pages/feedback";
import CaseStudies from "@/pages/case-studies";
import InvestorSummary from "@/pages/investor-summary";

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
        <Route path="/success-readiness" component={SuccessReadiness} />
        <Route path="/workspaces" component={Workspaces} />
        <Route path="/api-access" component={ApiAccess} />
        <Route path="/billing" component={Billing} />
        <Route path="/institutional-dashboard" component={InstitutionalDashboard} />
        <Route path="/dataset-integration" component={DatasetIntegration} />
        <Route path="/multi-omics" component={MultiOmics} />
        <Route path="/validation-pipeline" component={ValidationPipeline} />
        <Route path="/enterprise-deployment" component={EnterpriseDeployment} />
        <Route path="/gnn-preview" component={GnnPreview} />
        <Route path="/ppi-network" component={PpiNetwork} />
        <Route path="/federated-learning" component={FederatedLearning} />
        <Route path="/mobile-preview" component={MobilePreview} />
        <Route path="/ehr-integration" component={EhrIntegration} />
        <Route path="/research-paper" component={ResearchPaper} />
        <Route path="/market-validation" component={MarketValidation} />
        <Route path="/pilot-program" component={PilotProgram} />
        <Route path="/competitive-analysis" component={CompetitiveAnalysis} />
        <Route path="/go-to-market" component={GoToMarket} />
        <Route path="/business-case" component={BusinessCase} />
        <Route path="/risk-mitigation" component={RiskMitigation} />
        <Route path="/feedback" component={Feedback} />
        <Route path="/case-studies" component={CaseStudies} />
        <Route path="/investor-summary" component={InvestorSummary} />
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
