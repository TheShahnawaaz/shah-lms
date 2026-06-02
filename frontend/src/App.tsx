import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ProblemList from "./pages/ProblemList";
import ProblemDetail from "./pages/ProblemDetail";
import DownloadPage from "./pages/DownloadPage";
import CoursesDashboard from "./pages/CoursesDashboard";
import CourseViewer from "./pages/CourseViewer";
import SeedPage from "./pages/admin/SeedPage";
import AllowedUsers from "./pages/admin/AllowedUsers";
import AdminDashboard from "./pages/admin/AdminDashboard";
import CourseImporter from "./pages/admin/CourseImporter";
import { Layout } from "./components/Layout";

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
    <BrowserRouter>
      <Routes>
        {/* Public Auth Routes */}
        <Route path="/login" element={<Login />} />

        {/* Private Routes */}
        <Route
          path="/download"
          element={
            <ProtectedRoute>
              <Layout>
                <DownloadPage />
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

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
export default App;
