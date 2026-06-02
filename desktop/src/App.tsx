import React from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ProblemList from "./pages/ProblemList";
import ProblemDetail from "./pages/ProblemDetail";
import CoursesDashboard from "./pages/CoursesDashboard";
import CourseViewer from "./pages/CourseViewer";
import AdminDashboard from "./pages/admin/AdminDashboard";
import CourseImporter from "./pages/admin/CourseImporter";
import SeedPage from "./pages/admin/SeedPage";
import AllowedUsers from "./pages/admin/AllowedUsers";
import { Layout } from "./components/Layout";
import { UpdateChecker } from "./components/UpdateChecker";

// Helper component for Route protection
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem("az_auth_token");
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <HashRouter>
      <UpdateChecker />
      <Routes>
        {/* Public Auth Routes */}
        <Route path="/login" element={<Login />} />

        {/* Private Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/courses"
          element={
            <ProtectedRoute>
              <Layout>
                <CoursesDashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/courses/:courseId"
          element={
            <ProtectedRoute>
              <Layout fullWidth={true}>
                <CourseViewer />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/courses/:courseId/resource/:resourceId"
          element={
            <ProtectedRoute>
              <Layout fullWidth={true}>
                <CourseViewer />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/problems"
          element={
            <ProtectedRoute>
              <Layout>
                <ProblemList />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/bookmarks"
          element={
            <ProtectedRoute>
              <Layout>
                <ProblemList />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/problems/:id"
          element={
            <ProtectedRoute>
              <Layout fullWidth={true}>
                <ProblemDetail />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Admin Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <Layout>
                <AdminDashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/courses"
          element={
            <ProtectedRoute>
              <Layout>
                <CourseImporter />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/seed"
          element={
            <ProtectedRoute>
              <Layout>
                <SeedPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute>
              <Layout>
                <AllowedUsers />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </HashRouter>
  );
};
export default App;
