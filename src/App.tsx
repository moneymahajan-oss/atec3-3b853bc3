import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { HelmetProvider } from "react-helmet-async";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import AdminLogin from "./pages/AdminLogin.tsx";
import AdminDashboard from "./pages/AdminDashboard.tsx";
import AdminTable from "./pages/AdminTable.tsx";
import AdminSiteContent from "./pages/AdminSiteContent.tsx";
import { CrmAuthProvider } from "./crm/hooks/useCrmAuth.tsx";
import { CRMErrorBoundary } from "./components/CRMErrorBoundary.tsx";
import { CrmLayout } from "./crm/components/CrmLayout.tsx";
import CrmLogin from "./crm/pages/CrmLogin.tsx";
import CrmDashboard from "./crm/pages/CrmDashboard.tsx";
import CrmCourses from "./crm/pages/CrmCourses.tsx";
import CrmCourseForm from "./crm/pages/CrmCourseForm.tsx";
import CrmWhatsAppTemplates from "./crm/pages/CrmWhatsAppTemplates.tsx";
import CrmSettings from "./crm/pages/CrmSettings.tsx";
import CrmStub from "./crm/pages/CrmStub.tsx";
import CrmEnquiries from "./crm/pages/CrmEnquiries.tsx";
import CrmEnquiryForm from "./crm/pages/CrmEnquiryForm.tsx";
import CrmStudents from "./crm/pages/CrmStudents.tsx";
import CrmStudentForm from "./crm/pages/CrmStudentForm.tsx";
import CrmBatches from "./crm/pages/CrmBatches.tsx";
import CrmBatchReport from "./crm/pages/CrmBatchReport.tsx";
import CrmFees from "./crm/pages/CrmFees.tsx";
import CrmStudentFees from "./crm/pages/CrmStudentFees.tsx";
import CrmAttendance from "./crm/pages/CrmAttendance.tsx";
import CrmExpenses from "./crm/pages/CrmExpenses.tsx";
import CrmReports from "./crm/pages/CrmReports.tsx";
import CrmImportExport from "./crm/pages/CrmImportExport.tsx";
import CrmCertificates from "./crm/pages/CrmCertificates.tsx";
import CrmSeo from "./crm/pages/CrmSeo.tsx";
import CrmCampaigns from "./crm/pages/CrmCampaigns.tsx";
import CrmReminders from "./crm/pages/CrmReminders.tsx";
import CrmVoided from "./crm/pages/CrmVoided.tsx";
import CrmEnquirySettings from "./crm/pages/CrmEnquirySettings.tsx";
import CrmFaculties from "./crm/pages/CrmFaculties.tsx";
import CrmDuplicates from "./crm/pages/CrmDuplicates.tsx";
import CrmAddEnrolment from "./crm/pages/CrmAddEnrolment.tsx";
import Enquire from "./pages/Enquire.tsx";
import CoursePublic from "./pages/CoursePublic.tsx";
import FacultyList from "./pages/FacultyList.tsx";
import FacultyDetail from "./pages/FacultyDetail.tsx";
import Verification from "./pages/Verification.tsx";
import AdminCertificates from "./pages/AdminCertificates.tsx";
import AdminNav from "./pages/AdminNav.tsx";
import AdminMockTests from "./pages/AdminMockTests.tsx";
import AdminBackup from "./pages/AdminBackup.tsx";
import { useFaviconFromSettings } from "@/hooks/useFaviconFromSettings";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 300000,
      gcTime: 600000,
      refetchOnWindowFocus: false,
      retry: 3,
    },
  },
});

function FaviconMount() {
  useFaviconFromSettings();
  return null;
}

const App = () => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        Loading...
      </div>
    );
  }

  return (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ErrorBoundary>
          <AuthProvider>
            <CrmAuthProvider>
              <FaviconMount />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/enquire" element={<Enquire />} />
                <Route path="/verification" element={<Verification />} />
                <Route path="/c/:slug" element={<CoursePublic />} />
                <Route path="/faculty" element={<FacultyList />} />
                <Route path="/faculty/:slug" element={<FacultyDetail />} />
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/site-content" element={<AdminSiteContent />} />
                <Route path="/admin/certificates" element={<AdminCertificates />} />
                <Route path="/admin/navigation" element={<AdminNav />} />
                <Route path="/admin/mock-tests-editor" element={<AdminMockTests />} />
                <Route path="/admin/backup" element={<AdminBackup />} />
                <Route path="/admin/:table" element={<AdminTable />} />

                <Route path="/crm/login" element={<CrmLogin />} />
                <Route path="/crm" element={<CRMErrorBoundary><CrmLayout /></CRMErrorBoundary>}>
                  <Route index element={<CrmDashboard />} />
                  <Route path="reminders" element={<CrmReminders />} />
                  <Route path="courses" element={<CrmCourses />} />
                  <Route path="courses/new" element={<CrmCourseForm />} />
                  <Route path="courses/:id" element={<CrmCourseForm />} />
                  <Route path="whatsapp" element={<CrmWhatsAppTemplates />} />
                  <Route path="settings" element={<CrmSettings />} />
                  <Route path="enquiry-settings" element={<CrmEnquirySettings />} />
                  <Route path="enquiries" element={<CrmEnquiries />} />
                  <Route path="enquiries/:id" element={<CrmEnquiryForm />} />
                  <Route path="students" element={<CrmStudents />} />
                  <Route path="students/:studentId/add-course" element={<CrmAddEnrolment />} />
                  <Route path="students/:id" element={<CrmStudentForm />} />
                  <Route path="fees" element={<CrmFees />} />
                  <Route path="fees/:studentId" element={<CrmStudentFees />} />
                  <Route path="batches" element={<CrmBatches />} />
                  <Route path="batches/:id/report" element={<CrmBatchReport />} />
                  <Route path="faculties" element={<CrmFaculties />} />
                  <Route path="attendance" element={<CrmAttendance />} />
                  <Route path="certificates" element={<CrmCertificates />} />
                  <Route path="expenses" element={<CrmExpenses />} />
                  <Route path="reports" element={<CrmReports />} />
                  <Route path="voided" element={<CrmVoided />} />
                  <Route path="import-export" element={<CrmImportExport />} />
                  <Route path="seo" element={<CrmSeo />} />
                  <Route path="campaigns" element={<CrmCampaigns />} />
                  <Route path="duplicates" element={<CrmDuplicates />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </CrmAuthProvider>
          </AuthProvider>
          </ErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
  );
};

export default App;
