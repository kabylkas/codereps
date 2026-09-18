import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AppShell from "./components/layout/AppShell";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import CourseListPage from "./pages/courses/CourseListPage";
import CourseCreatePage from "./pages/courses/CourseCreatePage";
import CourseDetailPage from "./pages/courses/CourseDetailPage";
import ProblemListPage from "./pages/problems/ProblemListPage";
import ProblemEditorPage from "./pages/problems/ProblemEditorPage";
import ProblemViewPage from "./pages/problems/ProblemViewPage";
import ProblemSolvePage from "./pages/problems/ProblemSolvePage";
import LandingPage from "./pages/LandingPage";
import ProfilePage from "./pages/ProfilePage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/courses" element={<CourseListPage />} />
            <Route path="/courses/new" element={<ProtectedRoute allowedRoles={["professor", "admin"]}><CourseCreatePage /></ProtectedRoute>} />
            <Route path="/courses/:id" element={<CourseDetailPage />} />
            <Route path="/problems" element={<ProtectedRoute allowedRoles={["professor", "admin"]}><ProblemListPage /></ProtectedRoute>} />
            <Route path="/problems/new" element={<ProtectedRoute allowedRoles={["professor", "admin"]}><ProblemEditorPage /></ProtectedRoute>} />
            <Route path="/problems/:id" element={<ProblemViewPage />} />
            <Route path="/problems/:id/solve" element={<ProblemSolvePage />} />
            <Route path="/problems/:id/edit" element={<ProtectedRoute allowedRoles={["professor", "admin"]}><ProblemEditorPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
