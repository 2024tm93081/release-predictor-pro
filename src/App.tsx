import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Releases from "./pages/Releases";
import Sprints from "./pages/Sprints";
import Quality from "./pages/Quality";
import Predict from "./pages/Predict";
import ModelEvaluation from "./pages/ModelEvaluation";
import FeatureInsights from "./pages/FeatureInsights";
import About from "./pages/About";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/releases" element={<Releases />} />
            <Route path="/sprints" element={<Sprints />} />
            <Route path="/quality" element={<Quality />} />
            <Route path="/predict" element={<Predict />} />
            <Route path="/model-evaluation" element={<ModelEvaluation />} />
            <Route path="/feature-insights" element={<FeatureInsights />} />
            <Route path="/about" element={<About />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
