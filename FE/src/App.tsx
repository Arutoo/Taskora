import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";

import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import CreateProject from "./pages/CreateProject";
import ProjectDashboard from "./pages/ProjectDashboard";
import AssignedTasks from "./pages/AssignedTasks";
import TaskPage from "./pages/TaskPage";
import JoinWorkspace from "./pages/JoinWorkspace";
import { AuthProvider } from "./lib/auth-context";
import { useAuth } from "./lib/use-auth";
import { ThemeProvider } from "./hooks/theme-provider";

const queryClient = new QueryClient();

function ProtectedLayout() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />

              <Route element={<ProtectedLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/project/new" element={<CreateProject />} />
                <Route path="/project/:id" element={<ProjectDashboard />} />
                <Route path="/project/:projectId/tasks" element={<AssignedTasks />} />
                <Route path="/project/:projectId/tasks/:taskId" element={<TaskPage />} />
                <Route path="/join" element={<JoinWorkspace />} />
                <Route path="/join/:workspaceId" element={<JoinWorkspace />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
