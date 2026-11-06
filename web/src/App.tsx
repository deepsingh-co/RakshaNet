import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import SOSDashboard from "./pages/SOSDashboard";
import LiveTracking from "./pages/LiveTracking";
import Heatmap from "./pages/Heatmap";
import CommunityReports from "./pages/CommunityReports";
import AICopilot from "./pages/AICopilot";
import GuardianPortal from "./pages/GuardianPortal";
import AdminCommandCenter from "./pages/AdminCommandCenter";
import FeaturesHub from "./pages/features/FeaturesHub";
import DeepfakeWeb from "./pages/features/DeepfakeWeb";
import CompanionWeb from "./pages/features/CompanionWeb";
import StalkerWeb from "./pages/features/StalkerWeb";
import MeshWeb from "./pages/features/MeshWeb";
import PodsWeb from "./pages/features/PodsWeb";
import BystanderWeb from "./pages/features/BystanderWeb";
import BlockchainWeb from "./pages/features/BlockchainWeb";
import BiometricWeb from "./pages/features/BiometricWeb";
import WearablesWeb from "./pages/features/WearablesWeb";
import VitalsPage from "./pages/vitals/VitalsPage";
import WalkWeb from "./pages/features/WalkWeb";
import TraumaWeb from "./pages/features/TraumaWeb";
import LegalWeb from "./pages/features/LegalWeb";
import VoiceCodeWeb from "./pages/features/VoiceCodeWeb";
import SafeRideWeb from "./pages/features/SafeRideWeb";
import SafeJourney from "./pages/SafeJourney";
import { useSafetyStore } from "./store/safetyStore";

function GlobalTicker() {
  const tick = useSafetyStore((s) => s.tick);
  useEffect(() => {
    const id = setInterval(tick, 2500);
    return () => clearInterval(id);
  }, [tick]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <GlobalTicker />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/app" element={<Layout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="sos" element={<SOSDashboard />} />
          <Route path="tracking" element={<LiveTracking />} />
          <Route path="heatmap" element={<Heatmap />} />
          <Route path="community" element={<CommunityReports />} />
          <Route path="ai" element={<AICopilot />} />
          <Route path="guardian" element={<GuardianPortal />} />
          <Route path="admin" element={<AdminCommandCenter />} />
          <Route path="features" element={<FeaturesHub />} />
          <Route path="features/deepfake" element={<DeepfakeWeb />} />
          <Route path="features/companion" element={<CompanionWeb />} />
          <Route path="features/stalker" element={<StalkerWeb />} />
          <Route path="features/mesh" element={<MeshWeb />} />
          <Route path="features/pods" element={<PodsWeb />} />
          <Route path="features/bystander" element={<BystanderWeb />} />
          <Route path="features/blockchain" element={<BlockchainWeb />} />
          <Route path="features/biometric" element={<BiometricWeb />} />
          <Route path="features/wearables" element={<WearablesWeb />} />
          <Route path="features/wearables/vitals" element={<VitalsPage />} />
          <Route path="features/walk" element={<WalkWeb />} />
          <Route path="features/trauma" element={<TraumaWeb />} />
          <Route path="features/legal" element={<LegalWeb />} />
          <Route path="features/voicecode" element={<VoiceCodeWeb />} />
          <Route path="features/saferide" element={<SafeRideWeb />} />
          <Route path="journey" element={<SafeJourney />} />
          {/* Guardian routes (redirect to main guardian portal) */}
          <Route path="guardian/wards" element={<GuardianPortal />} />
          <Route path="guardian/tracking" element={<LiveTracking />} />
          <Route path="guardian/alerts" element={<GuardianPortal />} />
          <Route path="guardian/history" element={<GuardianPortal />} />
          <Route path="guardian/contacts" element={<GuardianPortal />} />
          <Route path="guardian/settings" element={<GuardianPortal />} />
          {/* Admin routes (redirect to main admin center) */}
          <Route path="admin/users" element={<AdminCommandCenter />} />
          <Route path="admin/incidents" element={<AdminCommandCenter />} />
          <Route path="admin/analytics" element={<Heatmap />} />
          <Route path="admin/reports" element={<CommunityReports />} />
          <Route path="admin/system" element={<AdminCommandCenter />} />
          <Route path="admin/settings" element={<AdminCommandCenter />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
