import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import AdminLogin from "./pages/AdminLogin.tsx";
import AdminDashboard from "./pages/AdminDashboard.tsx";
import AdminTable from "./pages/AdminTable.tsx";
import AdminSiteContent from "./pages/AdminSiteContent.tsx";
import { CrmAuthProvider } from "./crm/hooks/useCrmAuth.tsx";
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

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <CrmAuthProvider>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/site-content" element={<AdminSiteContent />} />
                <Route path="/admin/:table" element={<AdminTable />} />

                <Route path="/crm/login" element={<CrmLogin />} />
                <Route path="/crm" element={<CrmLayout />}>
                  <Route index element={<CrmDashboard />} />
                  <Route path="reminders" element={<CrmReminders />} />
                  <Route path="courses" element={<CrmCourses />} />
                  <Route path="courses/new" element={<CrmCourseForm />} />
                  <Route path="courses/:id" element={<CrmCourseForm />} />
                  <Route path="whatsapp" element={<CrmWhatsAppTemplates />} />
                  <Route path="settings" element={<CrmSettings />} />
                  <Route path="enquiries" element={<CrmEnquiries />} />
                  <Route path="enquiries/:id" element={<CrmEnquiryForm />} />
                  <Route path="students" element={<CrmStudents />} />
                  <Route path="students/:id" element={<CrmStudentForm />} />
                  <Route path="fees" element={<CrmFees />} />
                  <Route path="fees/:studentId" element={<CrmStudentFees />} />
                  <Route path="batches" element={<CrmBatches />} />
                  <Route path="attendance" element={<CrmAttendance />} />
                  <Route path="certificates" element={<CrmCertificates />} />
                  <Route path="expenses" element={<CrmExpenses />} />
                  <Route path="reports" element={<CrmReports />} />
                  <Route path="import-export" element={<CrmImportExport />} />
                  <Route path="seo" element={<CrmSeo />} />
                  <Route path="campaigns" element={<CrmCampaigns />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </CrmAuthProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
