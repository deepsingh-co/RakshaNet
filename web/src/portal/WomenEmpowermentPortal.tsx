import { useState } from 'react';
import { usePortalStore } from './store/portalStore';
import { PortalNavbar } from './components/PortalNavbar';
import { PortalFooter } from './components/PortalFooter';
import { QuickSosModal } from './components/QuickSosModal';
import { ProfileModal } from './components/ProfileModal';
import { ResumeBuilderModal } from './components/ResumeBuilderModal';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { EducationPage } from './pages/EducationPage';
import { JobPortalPage } from './pages/JobPortalPage';
import { LegalSupportPage } from './pages/LegalSupportPage';
import { MentalHealthPage } from './pages/MentalHealthPage';
import { CommunityPage } from './pages/CommunityPage';
import { HealthMedicalPage } from './pages/HealthMedicalPage';
import { FinancialLiteracyPage } from './pages/FinancialLiteracyPage';
import { SafetyEmergencyPage } from './pages/SafetyEmergencyPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { AdminPanelPage } from './pages/AdminPanelPage';

export function WomenEmpowermentPortal() {
  const token = usePortalStore((s) => s.token);

  const [activeModule, setActiveModule] = useState<string>('dashboard');
  const [isSosOpen, setIsSosOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isResumeOpen, setIsResumeOpen] = useState(false);

  // If not logged in, show Auth Page
  if (!token) {
    return <AuthPage onSuccess={() => setActiveModule('dashboard')} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/60 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
      {/* Top Navbar */}
      <PortalNavbar
        activeModule={activeModule}
        setActiveModule={setActiveModule}
        onOpenSos={() => setIsSosOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
      />

      {/* Main View Area */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {activeModule === 'dashboard' && (
          <DashboardPage
            onNavigate={(mod) => setActiveModule(mod)}
            onOpenSos={() => setIsSosOpen(true)}
            onOpenResumeBuilder={() => setIsResumeOpen(true)}
          />
        )}

        {activeModule === 'education' && <EducationPage />}

        {activeModule === 'jobs' && <JobPortalPage />}

        {activeModule === 'legal' && <LegalSupportPage />}

        {activeModule === 'mental-health' && <MentalHealthPage />}

        {activeModule === 'community' && <CommunityPage />}

        {activeModule === 'health' && <HealthMedicalPage />}

        {activeModule === 'finance' && <FinancialLiteracyPage />}

        {activeModule === 'safety' && (
          <SafetyEmergencyPage onOpenSos={() => setIsSosOpen(true)} />
        )}

        {activeModule === 'analytics' && <AnalyticsPage />}

        {activeModule === 'admin' && <AdminPanelPage />}
      </main>

      {/* Global Modals */}
      <QuickSosModal isOpen={isSosOpen} onClose={() => setIsSosOpen(false)} />
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
      <ResumeBuilderModal isOpen={isResumeOpen} onClose={() => setIsResumeOpen(false)} />

      {/* Modern Footer */}
      <PortalFooter
        onNavigate={(mod) => setActiveModule(mod)}
        onOpenSos={() => setIsSosOpen(true)}
      />
    </div>
  );
}
