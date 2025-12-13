import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute, PublicRoute } from "@/components/auth/ProtectedRoute";

// Public Pages
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import PendingApprovalPage from "./pages/PendingApprovalPage";

// Student Pages
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentGameWorld from "./pages/student/StudentGameWorld";
import StudentTests from "./pages/student/StudentTests";
import StudentLeaderboard from "./pages/student/StudentLeaderboard";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminSubjects from "./pages/admin/AdminSubjects";

// Placeholder Pages
import PlaceholderPage from "./pages/PlaceholderPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
            <Route path="/auth/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/auth/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
            <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/pending-approval" element={<PendingApprovalPage />} />

            {/* Student Routes */}
            <Route path="/student/dashboard" element={<ProtectedRoute allowedRoles={['student']}><StudentDashboard /></ProtectedRoute>} />
            <Route path="/student/game" element={<ProtectedRoute allowedRoles={['student']}><StudentGameWorld /></ProtectedRoute>} />
            <Route path="/student/tests" element={<ProtectedRoute allowedRoles={['student']}><StudentTests /></ProtectedRoute>} />
            <Route path="/student/test/:id" element={<ProtectedRoute allowedRoles={['student']}><PlaceholderPage title="Test Taking" role="student" /></ProtectedRoute>} />
            <Route path="/student/results/:id" element={<ProtectedRoute allowedRoles={['student']}><PlaceholderPage title="Test Results" role="student" /></ProtectedRoute>} />
            <Route path="/student/weak-tests" element={<ProtectedRoute allowedRoles={['student']}><PlaceholderPage title="Weak Area Tests" role="student" /></ProtectedRoute>} />
            <Route path="/student/leaderboard" element={<ProtectedRoute allowedRoles={['student']}><StudentLeaderboard /></ProtectedRoute>} />
            <Route path="/student/analytics" element={<ProtectedRoute allowedRoles={['student']}><PlaceholderPage title="Analytics" role="student" /></ProtectedRoute>} />
            <Route path="/student/profile" element={<ProtectedRoute allowedRoles={['student']}><PlaceholderPage title="Profile" role="student" /></ProtectedRoute>} />

            {/* Mentor Routes */}
            <Route path="/mentor/dashboard" element={<ProtectedRoute allowedRoles={['mentor']}><PlaceholderPage title="Mentor Dashboard" role="mentor" /></ProtectedRoute>} />
            <Route path="/mentor/subjects" element={<ProtectedRoute allowedRoles={['mentor']}><PlaceholderPage title="Subjects" role="mentor" /></ProtectedRoute>} />
            <Route path="/mentor/topics" element={<ProtectedRoute allowedRoles={['mentor']}><PlaceholderPage title="Topics" role="mentor" /></ProtectedRoute>} />
            <Route path="/mentor/questions" element={<ProtectedRoute allowedRoles={['mentor']}><PlaceholderPage title="Question Bank" role="mentor" /></ProtectedRoute>} />
            <Route path="/mentor/tests" element={<ProtectedRoute allowedRoles={['mentor']}><PlaceholderPage title="Tests" role="mentor" /></ProtectedRoute>} />
            <Route path="/mentor/tests/create" element={<ProtectedRoute allowedRoles={['mentor']}><PlaceholderPage title="Create Test" role="mentor" /></ProtectedRoute>} />
            <Route path="/mentor/assignments" element={<ProtectedRoute allowedRoles={['mentor']}><PlaceholderPage title="Assignments" role="mentor" /></ProtectedRoute>} />
            <Route path="/mentor/analytics" element={<ProtectedRoute allowedRoles={['mentor']}><PlaceholderPage title="Analytics" role="mentor" /></ProtectedRoute>} />
            <Route path="/mentor/anti-cheat-logs" element={<ProtectedRoute allowedRoles={['mentor']}><PlaceholderPage title="Anti-Cheat Logs" role="mentor" /></ProtectedRoute>} />
            <Route path="/mentor/profile" element={<ProtectedRoute allowedRoles={['mentor']}><PlaceholderPage title="Profile" role="mentor" /></ProtectedRoute>} />

            {/* Admin Routes */}
            <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin']}><AdminUsers /></ProtectedRoute>} />
            <Route path="/admin/roles" element={<ProtectedRoute allowedRoles={['admin']}><AdminUsers /></ProtectedRoute>} />
            <Route path="/admin/subjects" element={<ProtectedRoute allowedRoles={['admin']}><AdminSubjects /></ProtectedRoute>} />
            <Route path="/admin/topics" element={<ProtectedRoute allowedRoles={['admin']}><PlaceholderPage title="Topics" role="admin" /></ProtectedRoute>} />
            <Route path="/admin/questions" element={<ProtectedRoute allowedRoles={['admin']}><PlaceholderPage title="Questions" role="admin" /></ProtectedRoute>} />
            <Route path="/admin/tests" element={<ProtectedRoute allowedRoles={['admin']}><PlaceholderPage title="All Tests" role="admin" /></ProtectedRoute>} />
            <Route path="/admin/analytics" element={<ProtectedRoute allowedRoles={['admin']}><PlaceholderPage title="Analytics" role="admin" /></ProtectedRoute>} />
            <Route path="/admin/anti-cheat-logs" element={<ProtectedRoute allowedRoles={['admin']}><PlaceholderPage title="Anti-Cheat Logs" role="admin" /></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={['admin']}><PlaceholderPage title="Settings" role="admin" /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
